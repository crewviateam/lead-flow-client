// pages/Schedule.jsx
// Enhanced Schedule calendar with drag-and-drop rescheduling
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Check,
  RefreshCw,
  X,
  Filter,
  Eye,
  EyeOff,
  Zap,
  Mail,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Sparkles,
} from "lucide-react";
import { toast } from "react-hot-toast";
import gsap from "gsap";
import api, { rescheduleEmailJob } from "../services/api";
import "./Schedule.css";

// Status configurations
const STATUS_CONFIG = {
  pending: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", icon: Timer, label: "Pending" },
  scheduled: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", icon: Calendar, label: "Scheduled" },
  queued: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", icon: Clock, label: "Queued" },
  sent: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", icon: CheckCircle2, label: "Sent" },
  delivered: { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", icon: CheckCircle2, label: "Delivered" },
  opened: { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", icon: Eye, label: "Opened" },
  clicked: { color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", icon: Target, label: "Clicked" },
  failed: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", icon: XCircle, label: "Failed" },
  bounced: { color: "#dc2626", bg: "rgba(220, 38, 38, 0.15)", icon: AlertTriangle, label: "Bounced" },
};

// Email type configurations
const TYPE_CONFIG = {
  initial: { color: "#3b82f6", icon: "🚀", label: "Initial" },
  followup: { color: "#a855f7", icon: "🔄", label: "Follow-up" },
  manual: { color: "#f59e0b", icon: "✋", label: "Manual" },
};

export default function Schedule() {
  const [schedule, setSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [availableTimezones, setAvailableTimezones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedJob, setDraggedJob] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid | timeline
  const [filterStatus, setFilterStatus] = useState("all");
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const gridRef = useRef(null);
  const skipAnimationRef = useRef(false);

  useEffect(() => {
    loadTimezones();
  }, []);

  useEffect(() => {
    if (selectedTimezone) {
      loadSchedule();
    }
  }, [selectedDate, selectedTimezone]);

  useEffect(() => {
    if (skipAnimationRef.current) {
      skipAnimationRef.current = false;
      return;
    }
    if (!loading && gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.02, ease: "power3.out" }
      );
    }
  }, [schedule, loading]);

  const loadTimezones = async () => {
    try {
      const { data } = await api.get("/schedule/timezones");
      setAvailableTimezones(data.timezones || []);
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (data.timezones?.includes(localTz)) {
        setSelectedTimezone(localTz);
      } else if (data.timezones?.length > 0) {
        setSelectedTimezone(data.timezones[0]);
      } else {
        setSelectedTimezone(localTz);
      }
    } catch (error) {
      console.error("Failed to load timezones:", error);
    }
  };

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/schedule", {
        params: { date: selectedDate, timezone: selectedTimezone },
      });
      setSchedule(data);
    } catch (error) {
      console.error("Failed to load schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const refreshScheduleSilently = async () => {
    try {
      skipAnimationRef.current = true;
      const { data } = await api.get("/schedule", {
        params: { date: selectedDate, timezone: selectedTimezone },
      });
      setSchedule(data);
    } catch (error) {
      console.error("Failed to refresh schedule:", error);
      skipAnimationRef.current = false;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!schedule?.slots) return null;
    const allJobs = schedule.slots.flatMap((s) => s.jobs || []);
    const totalSlots = schedule.slots.length;
    const usedSlots = schedule.slots.filter((s) => s.jobs?.length > 0).length;
    const fullSlots = schedule.slots.filter((s) => s.used >= s.max).length;
    
    return {
      totalEmails: allJobs.length,
      pending: allJobs.filter((j) => ["pending", "queued", "scheduled"].includes(j.status)).length,
      sent: allJobs.filter((j) => ["sent", "delivered", "opened", "clicked"].includes(j.status)).length,
      failed: allJobs.filter((j) => ["failed", "bounced"].includes(j.status)).length,
      initial: allJobs.filter((j) => j.type?.toLowerCase().includes("initial")).length,
      followup: allJobs.filter((j) => j.type?.toLowerCase().includes("followup")).length,
      manual: allJobs.filter((j) => j.type?.toLowerCase().includes("manual") || j.metadata?.manual).length,
      slotsUsed: usedSlots,
      totalSlots,
      fullSlots,
      utilizationPercent: Math.round((usedSlots / totalSlots) * 100),
    };
  }, [schedule]);

  // Drag handlers
  const handleDragStart = (e, job) => {
    if (!isEditMode) return;
    setDraggedJob(job);
    e.dataTransfer.setData("jobId", job.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    if (!isEditMode || !draggedJob) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, slotTimeStr) => {
    e.preventDefault();
    if (!draggedJob) return;

    try {
      const timeParts = slotTimeStr.match(/(\d+):(\d+)/);
      if (!timeParts) {
        toast.error("Invalid slot time format");
        return;
      }

      const targetDate = new Date(selectedDate);
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      
      if (slotTimeStr.toLowerCase().includes("pm") && hours < 12) hours += 12;
      if (slotTimeStr.toLowerCase().includes("am") && hours === 12) hours = 0;
      
      targetDate.setHours(hours, minutes, 0, 0);

      toast.promise(rescheduleEmailJob(draggedJob.id, targetDate.toISOString()), {
        loading: "Rescheduling...",
        success: "Email rescheduled successfully!",
        error: (err) => `Failed: ${err.response?.data?.error || err.message}`,
      }).then(() => {
        refreshScheduleSilently();
        setDraggedJob(null);
      });
    } catch (err) {
      toast.error("Failed to reschedule");
      console.error(err);
    }
  };

  const shiftDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Quick date picker options
  const quickDates = useMemo(() => {
    const today = new Date();
    return [
      { label: "Today", date: today },
      { label: "Tomorrow", date: new Date(today.getTime() + 86400000) },
      { label: "This Week", date: new Date(today.getTime() + 7 * 86400000) },
    ];
  }, []);

  const getSlotStatus = (slot) => {
    if (slot.used >= slot.max) return "full";
    if (slot.jobs?.length > 0) return "partial";
    return "empty";
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="schedule-page">
      {/* Enhanced Header */}
      <div className="schedule-header">
        <div className="schedule-header-left">
          <div className="schedule-title">
            <Calendar size={28} className="schedule-icon" />
            <div>
              <h2>Email Schedule</h2>
              <p className="schedule-subtitle">
                Manage and reschedule your email campaigns
              </p>
            </div>
          </div>
        </div>
        
        <div className="schedule-header-right">
          <button
            className={`schedule-mode-btn ${isEditMode ? "active" : ""}`}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <Check size={18} /> : <GripVertical size={18} />}
            <span>{isEditMode ? "Done" : "Edit Mode"}</span>
          </button>
          
          <button
            className="schedule-summary-btn"
            onClick={() => setShowSummary(true)}
            disabled={!schedule?.slots?.length}
          >
            <TrendingUp size={18} />
            <span>Summary</span>
          </button>
          
          <button className="schedule-refresh-btn" onClick={loadSchedule}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="schedule-edit-banner">
          <Sparkles size={20} />
          <span>
            <strong>Drag & Drop Mode Active</strong> — Drag emails to new time slots to reschedule instantly
          </span>
        </div>
      )}

      {/* Paused Date Warning */}
      {schedule?.isPaused && (
        <div className="schedule-paused-banner">
          <div className="paused-icon">⏸️</div>
          <div className="paused-content">
            <strong>Date Paused — No Emails Sending</strong>
            <p>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              is paused. Emails moved to next working day.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && !loading && (
        <div className="schedule-stats">
          <div className="stat-card stat-total">
            <Mail size={24} />
            <div className="stat-content">
              <span className="stat-value">{stats.totalEmails}</span>
              <span className="stat-label">Total Emails</span>
            </div>
          </div>
          
          <div className="stat-card stat-pending">
            <Timer size={24} />
            <div className="stat-content">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          
          <div className="stat-card stat-sent">
            <CheckCircle2 size={24} />
            <div className="stat-content">
              <span className="stat-value">{stats.sent}</span>
              <span className="stat-label">Sent</span>
            </div>
          </div>
          
          <div className="stat-card stat-failed">
            <XCircle size={24} />
            <div className="stat-content">
              <span className="stat-value">{stats.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
          
          <div className="stat-card stat-utilization">
            <Zap size={24} />
            <div className="stat-content">
              <span className="stat-value">{stats.utilizationPercent}%</span>
              <span className="stat-label">Slot Usage</span>
            </div>
            <div className="utilization-bar">
              <div 
                className="utilization-fill" 
                style={{ width: `${stats.utilizationPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar Card */}
      <div className="schedule-calendar-card">
        {/* Date Navigation */}
        <div className="date-navigation">
          <button className="nav-arrow" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={24} />
          </button>
          
          <div className="date-display" onClick={() => setShowQuickPicker(!showQuickPicker)}>
            <div className="date-main">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {isToday && <span className="today-badge">Today</span>}
              {schedule?.isPaused && <span className="paused-badge">Paused</span>}
            </div>
            <div className="date-info">
              <Clock size={14} />
              <span>
                Rate: {schedule?.settings?.maxPerWindow || 2} emails / {schedule?.settings?.windowMinutes || 15} min
              </span>
            </div>
          </div>
          
          <button className="nav-arrow" onClick={() => shiftDate(1)}>
            <ChevronRight size={24} />
          </button>
          
          {!isToday && (
            <button className="today-btn" onClick={goToToday}>
              Today
            </button>
          )}
        </div>

        {/* Quick Date Picker */}
        {showQuickPicker && (
          <div className="quick-date-picker">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setShowQuickPicker(false);
              }}
              className="date-input"
            />
            <div className="quick-dates">
              {quickDates.map((qd) => (
                <button
                  key={qd.label}
                  onClick={() => {
                    setSelectedDate(qd.date.toISOString().split("T")[0]);
                    setShowQuickPicker(false);
                  }}
                  className="quick-date-btn"
                >
                  {qd.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Only</option>
              <option value="sent">Sent Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
          
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot empty"></span>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot partial"></span>
              <span>Partial</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot full"></span>
              <span>Full</span>
            </div>
          </div>
        </div>

        {/* Time Slots Grid */}
        {loading ? (
          <div className="schedule-loading">
            <div className="loading-spinner"></div>
            <p>Loading schedule...</p>
          </div>
        ) : (
          <div ref={gridRef} className="slots-grid">
            {schedule?.slots?.map((slot, index) => {
              const slotStatus = getSlotStatus(slot);
              const isFull = slot.used >= slot.max;
              const visibleJobs = slot.jobs?.filter((j) => {
                if (["cancelled", "paused", "rescheduled", "skipped"].includes(j.status)) return false;
                if (filterStatus === "all") return true;
                if (filterStatus === "pending") return ["pending", "scheduled", "queued"].includes(j.status);
                if (filterStatus === "sent") return ["sent", "delivered", "opened", "clicked"].includes(j.status);
                if (filterStatus === "failed") return ["failed", "bounced"].includes(j.status);
                return true;
              }) || [];

              return (
                <div
                  key={index}
                  className={`slot-card ${slotStatus} ${isEditMode ? "edit-mode" : ""} ${draggedJob && !isFull ? "drop-target" : ""}`}
                  onDragOver={(e) => !isFull && handleDragOver(e)}
                  onDrop={(e) => !isFull && handleDrop(e, slot.label)}
                >
                  {/* Slot Header */}
                  <div className="slot-header">
                    <div className="slot-time">{slot.label}</div>
                    <div className="slot-capacity">
                      <span className={`capacity-badge ${slotStatus}`}>
                        {slot.used}/{slot.max}
                      </span>
                    </div>
                  </div>

                  {/* Jobs List */}
                  <div className="slot-jobs">
                    {visibleJobs.length > 0 ? (
                      visibleJobs.map((job) => {
                        const isDraggable = ["scheduled", "pending", "queued", "failed"].includes(job.status);
                        const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                        const typeKey = job.type?.toLowerCase().includes("initial") 
                          ? "initial" 
                          : job.type?.toLowerCase().includes("followup") 
                            ? "followup" 
                            : "manual";
                        const typeConfig = TYPE_CONFIG[typeKey];

                        return (
                          <div
                            key={job.id}
                            className={`job-card ${isEditMode && isDraggable ? "draggable" : ""} ${draggedJob?.id === job.id ? "dragging" : ""}`}
                            draggable={isEditMode && isDraggable}
                            onDragStart={(e) => isDraggable && handleDragStart(e, job)}
                            style={{ borderLeftColor: statusConfig.color }}
                          >
                            {isEditMode && isDraggable && (
                              <div className="drag-handle">
                                <GripVertical size={12} />
                              </div>
                            )}
                            
                            <div className="job-content">
                              <div className="job-header">
                                <span className="job-name" title={job.name}>
                                  {job.name}
                                </span>
                                <span className="job-time">{job.time}</span>
                              </div>
                              
                              <div className="job-meta">
                                <span className="job-type" style={{ color: typeConfig.color }}>
                                  {typeConfig.icon} {job.displayType || typeConfig.label}
                                </span>
                                <span 
                                  className="job-status"
                                  style={{ 
                                    background: statusConfig.bg,
                                    color: statusConfig.color 
                                  }}
                                >
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="slot-empty">
                        <span>No emails</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Summary Modal */}
      {showSummary && schedule?.slots && (
        <div className="summary-overlay" onClick={() => setShowSummary(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-header">
              <h3>
                <TrendingUp size={24} />
                Day Summary
              </h3>
              <button onClick={() => setShowSummary(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <div className="summary-date">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            {stats && (
              <>
                {/* Overview Stats */}
                <div className="summary-stats-grid">
                  <div className="summary-stat purple">
                    <span className="summary-stat-value">{stats.totalEmails}</span>
                    <span className="summary-stat-label">Total Emails</span>
                  </div>
                  <div className="summary-stat yellow">
                    <span className="summary-stat-value">{stats.pending}</span>
                    <span className="summary-stat-label">Pending</span>
                  </div>
                  <div className="summary-stat green">
                    <span className="summary-stat-value">{stats.sent}</span>
                    <span className="summary-stat-label">Sent</span>
                  </div>
                  <div className="summary-stat red">
                    <span className="summary-stat-value">{stats.failed}</span>
                    <span className="summary-stat-label">Failed</span>
                  </div>
                </div>

                {/* Type Breakdown */}
                <div className="summary-section">
                  <h4>Email Types</h4>
                  <div className="type-breakdown">
                    <div className="type-item">
                      <div className="type-bar" style={{ width: `${(stats.initial / stats.totalEmails) * 100 || 0}%`, background: "#3b82f6" }}></div>
                      <span className="type-label">🚀 Initial ({stats.initial})</span>
                    </div>
                    <div className="type-item">
                      <div className="type-bar" style={{ width: `${(stats.followup / stats.totalEmails) * 100 || 0}%`, background: "#a855f7" }}></div>
                      <span className="type-label">🔄 Follow-up ({stats.followup})</span>
                    </div>
                    <div className="type-item">
                      <div className="type-bar" style={{ width: `${(stats.manual / stats.totalEmails) * 100 || 0}%`, background: "#f59e0b" }}></div>
                      <span className="type-label">✋ Manual ({stats.manual})</span>
                    </div>
                  </div>
                </div>

                {/* Slot Utilization */}
                <div className="summary-section">
                  <h4>Slot Utilization</h4>
                  <div className="utilization-display">
                    <div className="utilization-progress">
                      <div 
                        className="utilization-progress-fill"
                        style={{ width: `${stats.utilizationPercent}%` }}
                      />
                    </div>
                    <div className="utilization-text">
                      <span>{stats.slotsUsed} of {stats.totalSlots} slots used</span>
                      <span>{stats.fullSlots} at capacity</span>
                    </div>
                  </div>
                </div>

                {/* Hourly Distribution */}
                <div className="summary-section">
                  <h4>Hourly Distribution</h4>
                  <div className="hourly-chart">
                    {schedule.slots.slice(0, 24).map((slot, i) => {
                      const maxInDay = Math.max(...schedule.slots.map((s) => s.jobs?.length || 0), 1);
                      const height = ((slot.jobs?.length || 0) / maxInDay) * 100;
                      return (
                        <div
                          key={i}
                          className="hourly-bar"
                          style={{
                            height: `${Math.max(height, 8)}%`,
                            background: slot.jobs?.length > 0
                              ? slot.used >= slot.max ? "#ef4444" : "#3b82f6"
                              : "rgba(255,255,255,0.1)",
                          }}
                          title={`${slot.label}: ${slot.jobs?.length || 0} emails`}
                        />
                      );
                    })}
                  </div>
                  <div className="hourly-labels">
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>12 AM</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
