// pages/EmailQueue.jsx
// Email Queue with TanStack Query for optimized data fetching and caching
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Clock,
  Send,
  XCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import gsap from "gsap";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "../lib/queryClient";
import { useRetryEmailJob, useCancelEmailJob } from "../hooks/useApi";
import {
  getEmailJobs,
  getEmailJobStats,
  getRateLimits,
} from "../services/api";
import ConfirmModal from "../components/ConfirmModal";

export default function EmailQueue({ showToast }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [queueTypeFilter, setQueueTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  const tableRef = useRef(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "danger",
  });

  // TanStack Query hooks - automatic caching and refetching
  const { data: stats } = useQuery({
    queryKey: ['emailJobStats'],
    queryFn: getEmailJobStats,
    ...cacheConfig.realtime,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: jobsData, isLoading, refetch } = useQuery({
    queryKey: ['emailJobs', 'list', { page, statusFilter, activeTab }],
    queryFn: () => getEmailJobs(page, 15, statusFilter || undefined, activeTab),
    ...cacheConfig.realtime,
    refetchInterval: 30000,
    placeholderData: (previousData) => previousData,
  });

  const { data: rateLimitData } = useQuery({
    queryKey: ['rateLimits'],
    queryFn: () => getRateLimits(),
    ...cacheConfig.standard,
  });

  // Mutations
  const retryMutation = useRetryEmailJob();
  const cancelMutation = useCancelEmailJob();

  // Derived state with memoization
  const jobs = useMemo(() => jobsData?.jobs || [], [jobsData?.jobs]);
  const pagination = useMemo(() => jobsData?.pagination || { page: 1, pages: 1, total: 0 }, [jobsData?.pagination]);
  const rateLimits = useMemo(() => rateLimitData?.rateLimits || [], [rateLimitData?.rateLimits]);

  // Animate table rows when data changes
  useEffect(() => {
    if (!isLoading && tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll("tbody tr"),
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: "power2.out" }
      );
    }
  }, [jobs, isLoading]);

  const formatJobType = useCallback((type) => {
    if (!type) return "Unknown";
    if (type.toLowerCase().includes("initial")) return "Initial Mail";
    if (type.startsWith("conditional:") || type.toLowerCase().includes("conditional"))
      return "Conditional Mail";
    if (type.toLowerCase() === "manual" || type.toLowerCase().includes("manual"))
      return "Manual Mail";
    if (type.toLowerCase().includes("followup") || type.toLowerCase().includes("follow"))
      return "Followup Mail";
    return "Followup Mail";
  }, []);

  const handleRetry = useCallback(async (jobId) => {
    try {
      await retryMutation.mutateAsync(jobId);
      showToast?.("Job queued for retry", "success");
    } catch (error) {
      showToast?.("Failed to retry job: " + error.message, "error");
    }
  }, [retryMutation, showToast]);

  const handleCancel = useCallback((jobId) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Email Job",
      message: "Are you sure you want to cancel this scheduled email?",
      onConfirm: async () => {
        try {
          await cancelMutation.mutateAsync({ id: jobId });
          showToast?.("Job cancelled", "success");
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          showToast?.("Failed to cancel job: " + error.message, "error");
        }
      },
      variant: "danger",
    });
  }, [cancelMutation, showToast]);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle size={16} className="status-icon success" />;
      case "failed":
      case "bounced":
      case "hard_bounce":
        return <XCircle size={16} className="status-icon error" />;
      case "pending":
      case "scheduled":
        return <Clock size={16} className="status-icon warning" />;
      case "cancelled":
        return <XCircle size={16} className="status-icon muted" />;
      default:
        return <AlertTriangle size={16} className="status-icon" />;
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      sent: "#22c55e",
      delivered: "#22c55e",
      opened: "#3b82f6",
      clicked: "#a855f7",
      pending: "#eab308",
      scheduled: "#eab308",
      rescheduled: "#f97316",
      failed: "#ef4444",
      bounced: "#ef4444",
      hard_bounce: "#dc2626",
      soft_bounce: "#f97316",
      cancelled: "#64748b",
      skipped: "#6b7280",
    };
    return colors[status] || "#64748b";
  }, []);

  // Filter jobs by queue type
  const filteredJobs = useMemo(() => {
    if (queueTypeFilter === "all") return jobs;
    return jobs.filter((job) => {
      const type = formatJobType(job.type);
      if (queueTypeFilter === "initial") return type === "Initial Mail";
      if (queueTypeFilter === "followup") return type === "Followup Mail";
      if (queueTypeFilter === "manual") return type === "Manual Mail";
      if (queueTypeFilter === "conditional") return type === "Conditional Mail";
      return true;
    });
  }, [jobs, queueTypeFilter, formatJobType]);

  return (
    <div>
      <div className="header">
        <h2>Email Queue</h2>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(234, 179, 8, 0.15)" }}>
            <Clock size={24} color="#eab308" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.pending || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.15)" }}>
            <Send size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.sent || 0}</span>
            <span className="stat-label">Sent</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.15)" }}>
            <CheckCircle size={24} color="#22c55e" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.delivered || 0}</span>
            <span className="stat-label">Delivered</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)" }}>
            <XCircle size={24} color="#ef4444" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.failed || 0}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)" }}>
            <Zap size={24} color="#a855f7" />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {rateLimits.length > 0
                ? `${rateLimits.reduce((a, r) => a + (r.remaining || 0), 0)}`
                : "∞"}
            </span>
            <span className="stat-label">API Quota</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "0.5rem" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {["active", "pending", "completed", "failed"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                background: activeTab === tab ? "var(--accent-primary)" : "transparent",
                color: activeTab === tab ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={queueTypeFilter}
            onChange={(e) => setQueueTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="initial">Initial Mails</option>
            <option value="followup">Followup Mails</option>
            <option value="manual">Manual Mails</option>
            <option value="conditional">Conditional Mails</option>
          </select>

          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginLeft: "auto" }}>
            {pagination.total} total jobs
          </span>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="card" ref={tableRef}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Retries</th>
                    <th>Scheduled</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        No jobs found
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 500 }}>{job.lead?.name || "Unknown"}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              {job.lead?.email}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              background: "var(--bg-hover)",
                            }}
                          >
                            {formatJobType(job.type)}
                          </span>
                        </td>
                        <td style={{ maxWidth: "200px" }}>
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.subject || "No subject"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {getStatusIcon(job.status)}
                            <span
                              style={{
                                color: getStatusColor(job.status),
                                fontWeight: 500,
                                fontSize: "0.85rem",
                              }}
                            >
                              {job.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          {(job.retryCount || 0) > 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                background: job.retryCount >= 3 
                                  ? "rgba(239, 68, 68, 0.15)" 
                                  : "rgba(249, 115, 22, 0.15)",
                                color: job.retryCount >= 3 ? "#ef4444" : "#f97316",
                              }}
                            >
                              <RotateCcw size={12} />
                              {job.retryCount}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                          {job.scheduledFor
                            ? new Date(job.scheduledFor).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {["failed", "bounced", "hard_bounce", "soft_bounce", "cancelled"].includes(
                              job.status
                            ) && (
                              <button
                                onClick={() => handleRetry(job.id)}
                                disabled={retryMutation.isPending}
                                style={{
                                  background: "rgba(34, 197, 94, 0.1)",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  cursor: "pointer",
                                  color: "#22c55e",
                                  opacity: retryMutation.isPending ? 0.5 : 1,
                                }}
                                title="Retry"
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}
                            {["pending", "scheduled", "rescheduled"].includes(job.status) && (
                              <button
                                onClick={() => handleCancel(job.id)}
                                disabled={cancelMutation.isPending}
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  opacity: cancelMutation.isPending ? 0.5 : 1,
                                }}
                                title="Cancel"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{ padding: "8px 12px" }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{ padding: "8px 12px" }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}
