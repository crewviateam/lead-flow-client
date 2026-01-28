// pages/Schedule.jsx
// Schedule calendar with drag-and-drop rescheduling
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import gsap from "gsap";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "../lib/queryClient";
import api, { rescheduleEmailJob } from "../services/api";


export default function Schedule() {
  const [schedule, setSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [availableTimezones, setAvailableTimezones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedJob, setDraggedJob] = useState(null);
  const gridRef = useRef(null);
  const skipAnimationRef = useRef(false);  // Flag to skip animation on silent refresh

  useEffect(() => {
    loadTimezones();
  }, []);

  useEffect(() => {
    if (selectedTimezone) {
      loadSchedule();
    }
  }, [selectedDate, selectedTimezone]);

  useEffect(() => {
    // Skip animation on silent refresh to prevent scroll jump
    if (skipAnimationRef.current) {
      skipAnimationRef.current = false;
      return;
    }
    
    if (!loading && gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          stagger: 0.02,
          ease: "back.out(1.7)",
        },
      );
    }
  }, [schedule, loading]);

  const loadTimezones = async () => {
    try {
      const { data } = await api.get("/schedule/timezones");
      setAvailableTimezones(data.timezones || []);
      // Default to first available or user's local
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (data.timezones && data.timezones.includes(localTz)) {
        setSelectedTimezone(localTz);
      } else if (data.timezones && data.timezones.length > 0) {
        setSelectedTimezone(data.timezones[0]);
      } else {
        // Fallback if no jobs yet
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
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh - updates data without loading spinner or scroll reset
  const refreshScheduleSilently = async () => {
    try {
      // Set flag to skip animation on next render
      skipAnimationRef.current = true;
      
      const { data } = await api.get("/schedule", {
        params: { date: selectedDate, timezone: selectedTimezone },
      });
      // Directly update schedule without changing loading state
      setSchedule(data);
    } catch (error) {
      console.error("Failed to refresh schedule:", error);
      skipAnimationRef.current = false;
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, job) => {
    if (!isEditMode) return;
    setDraggedJob(job);
    // Use json to transfer data if needed, but state is enough for local
    e.dataTransfer.setData("jobId", job.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    if (!isEditMode || !draggedJob) return;
    e.preventDefault(); // Essential to allow drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, slotTimeStr) => {
    e.preventDefault();
    if (!draggedJob) return;

    const jobId = draggedJob.id || draggedJob.id; // Ensure ID

    // Construct new Date
    // slotTimeStr is "HH:mm" usually or "HH:mm AM" from label.
    // Wait, let's look at slot.label. It's usually "09:00" or similar based on backend.
    // If it's just time, we combine with selectedDate.
    // Ideally use slot.start (ISO) if available, but backend might not send it.
    // Let's assume label is parseable time.

    try {
      // Parse time from label (e.g., "09:30")
      // If label has AM/PM, handle it.
      const timeParts = slotTimeStr.match(/(\d+):(\d+)/);
      if (!timeParts) {
        toast.error("Invalid slot time format");
        return;
      }

      // Construct target ISO string
      // We use the selectedDate + the slot time.
      // NOTE: selectedDate is YYYY-MM-DD string.
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);

      // Simple PM logic if needed, but if backend uses 24h keys or we trust the slot index logic...
      // Assuming label is 24h or we need to check index.
      // Actually, let's use the Date object construction carefully.
      const targetDate = new Date(selectedDate);
      targetDate.setHours(hours, minutes, 0, 0);

      // If the label had PM and parts were < 12, add 12?
      if (slotTimeStr.toLowerCase().includes("pm") && hours < 12) {
        targetDate.setHours(hours + 12);
      }
      if (slotTimeStr.toLowerCase().includes("am") && hours === 12) {
        targetDate.setHours(0);
      }

      // Adjust for timezone?
      // selectedDate is local YYYY-MM-DD usually.
      // But backend expects UTC often.
      // Or if we send ISO, backend parses it.
      // If we selected a Timezone in UI, 'selectedDate' implies that timezone's day?
      // This complexity suggests we should rely on what backend expects.
      // If backend Schedule returns slots in requested timezone, then 'label' is in that timezone.
      // If we construct a Date object here (client local), and send it...
      // It might be shifted.
      // Fix: Use textual date + time string construction, and let backend/API handle?
      // Or send ISO.

      // Simplified: Assume client browser time for now or trust the construction if everything is aligned.
      // Ideally we'd use a timezone aware library.

      toast
        .promise(rescheduleEmailJob(jobId, targetDate.toISOString()), {
          loading: "Rescheduling...",
          success: "Job Rescheduled!",
          error: (err) => `Failed: ${err.response?.data?.error || err.message}`,
        })
        .then(() => {
          // Use silent refresh to prevent scroll jump
          refreshScheduleSilently();
          setDraggedJob(null);
        });
    } catch (err) {
      toast.error("Failed to drop");
      console.error(err);
    }
  };

  const shiftDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const getSlotColor = (status) => {
    switch (status) {
      case "full":
        return "var(--danger-gradient)";
      case "partial":
        return "var(--warning-gradient)";
      case "empty":
        return "rgba(34, 197, 94, 0.1)";
      default:
        return "var(--bg-secondary)";
    }
  };

  const getSlotBorder = (status) => {
    switch (status) {
      case "full":
        return "#ef4444";
      case "partial":
        return "#eab308";
      case "empty":
        return "#22c55e";
      default:
        return "var(--border-color)";
    }
  };

  return (
    <div>
      <div className="header">
        <h2>Global Schedule (IST)</h2>
        <div className="flex-center gap-md">
          <button
            className={`btn ${isEditMode ? "btn-secondary" : "btn-primary"} flex-center gap-sm`}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <Check size={18} /> : <RefreshCw size={18} />}
            {isEditMode ? "Done Editing" : "Enable Drag & Drop"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSummary(true)}
            disabled={!schedule?.slots?.length}
          >
            📊 Day Summary
          </button>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Timezone: Asia/Kolkata (IST)
          </div>
        </div>
      </div>

      {/* Drag Instruction Banner */}
      {isEditMode && (
        <div className="banner-info">
          <div className="banner-info-icon">i</div>
          <span style={{ fontSize: "0.9rem", color: "#3b82f6" }}>
            Drag any email to a new time slot to reschedule it immediately.
            Slots will highlight when you hover over them.
          </span>
        </div>
      )}

      {/* PAUSED DATE BANNER - Visual indicator when date is paused */}
      {schedule?.isPaused && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.15))",
            border: "2px solid #f97316",
            borderRadius: "12px",
            padding: "16px 24px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            ⏸️
          </div>
          <div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#f97316",
                marginBottom: "4px",
              }}
            >
              Date Paused - No Emails Will Be Sent
            </div>
            <div
              style={{ fontSize: "0.9rem", color: "rgba(249, 115, 22, 0.8)" }}
            >
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              is paused. All scheduled emails have been moved to the next
              working day. Go to Settings → Paused Dates to unpause.
            </div>
          </div>
        </div>
      )}

      {/* Day Summary Modal - Detailed View */}
      {showSummary && schedule?.slots && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowSummary(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "700px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Calendar size={24} color="#8b5cf6" />
                Day Summary -{" "}
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowSummary(false)}
                className="btn-icon"
              >
                <X size={24} />
              </button>
            </div>

            {/* Stats Cards */}
            {(() => {
              const allJobs = schedule.slots.flatMap((s) => s.jobs || []);
              const totalEmails = allJobs.length;
              const pendingCount = allJobs.filter((j) =>
                ["pending", "queued", "scheduled"].includes(j.status),
              ).length;
              const sentCount = allJobs.filter((j) =>
                ["sent", "delivered", "opened", "clicked"].includes(j.status),
              ).length;
              const failedCount = allJobs.filter((j) =>
                ["failed", "bounced", "cancelled"].includes(j.status),
              ).length;

              // Type breakdown
              const initialCount = allJobs.filter((j) =>
                j.type?.toLowerCase().includes("initial"),
              ).length;
              const followupCount = allJobs.filter((j) =>
                j.type?.toLowerCase().includes("followup"),
              ).length;
              const manualCount = allJobs.filter(
                (j) =>
                  j.type?.toLowerCase().includes("manual") ||
                  j.metadata?.manual,
              ).length;

              // Slot utilization
              const totalSlots = schedule.slots.length;
              const usedSlots = schedule.slots.filter(
                (s) => s.jobs?.length > 0,
              ).length;
              const fullSlots = schedule.slots.filter(
                (s) => s.used >= s.max,
              ).length;

              return (
                <>
                  {/* Overview Stats Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "1rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--bg-hover)",
                        padding: "1rem",
                        borderRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                          color: "#8b5cf6",
                        }}
                      >
                        {totalEmails}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Total Emails
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-hover)",
                        padding: "1rem",
                        borderRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                          color: "#f59e0b",
                        }}
                      >
                        {pendingCount}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Pending/Scheduled
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-hover)",
                        padding: "1rem",
                        borderRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                          color: "#22c55e",
                        }}
                      >
                        {sentCount}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Sent/Delivered
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-hover)",
                        padding: "1rem",
                        borderRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                          color: "#ef4444",
                        }}
                      >
                        {failedCount}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Failed/Cancelled
                      </div>
                    </div>
                  </div>

                  {/* Email Type Breakdown */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4
                      style={{
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Email Type Breakdown
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(59, 130, 246, 0.1)",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "40px",
                            borderRadius: "4px",
                            background: "#3b82f6",
                          }}
                        ></div>
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                            {initialCount}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Initial Emails
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(168, 85, 247, 0.1)",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "40px",
                            borderRadius: "4px",
                            background: "#a855f7",
                          }}
                        ></div>
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                            {followupCount}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Followups
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(245, 158, 11, 0.1)",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "40px",
                            borderRadius: "4px",
                            background: "#f59e0b",
                          }}
                        ></div>
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                            {manualCount}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Manual Emails
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slot Utilization */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4
                      style={{
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Slot Utilization
                    </h4>
                    <div
                      style={{
                        background: "var(--bg-hover)",
                        padding: "1rem",
                        borderRadius: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <span>Slots Used</span>
                        <span style={{ fontWeight: 600 }}>
                          {usedSlots} / {totalSlots}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          borderRadius: "10px",
                          height: "12px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(usedSlots / totalSlots) * 100}%`,
                            height: "100%",
                            background:
                              "linear-gradient(90deg, #22c55e, #3b82f6)",
                            borderRadius: "10px",
                            transition: "width 0.5s ease",
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "10px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span>{fullSlots} slots at capacity</span>
                        <span>{totalSlots - usedSlots} slots available</span>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Distribution */}
                  <div>
                    <h4
                      style={{
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Hourly Distribution
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "4px",
                        height: "100px",
                        padding: "10px",
                        background: "var(--bg-hover)",
                        borderRadius: "12px",
                      }}
                    >
                      {schedule.slots.slice(0, 24).map((slot, i) => {
                        const maxInDay = Math.max(
                          ...schedule.slots.map((s) => s.jobs?.length || 0),
                          1,
                        );
                        const height =
                          ((slot.jobs?.length || 0) / maxInDay) * 100;
                        return (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${Math.max(height, 5)}%`,
                              background:
                                slot.jobs?.length > 0
                                  ? slot.used >= slot.max
                                    ? "#ef4444"
                                    : "#3b82f6"
                                  : "rgba(255,255,255,0.1)",
                              borderRadius: "4px 4px 0 0",
                              transition: "height 0.3s ease",
                            }}
                            title={`${slot.label}: ${slot.jobs?.length || 0} emails`}
                          />
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "4px",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span>6 AM</span>
                      <span>12 PM</span>
                      <span>6 PM</span>
                      <span>12 AM</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="card">
        {/* Date Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <button className="btn btn-secondary" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={20} />
          </button>

          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {schedule?.isPaused && (
                <span className="status-badge busy">PAUSED</span>
              )}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Global Limit: {schedule?.settings?.maxPerWindow} emails /{" "}
              {schedule?.settings?.windowMinutes} min
            </p>
          </div>

          <button className="btn btn-secondary" onClick={() => shiftDate(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "1rem",
            }}
          >
            {schedule?.slots?.map((slot, index) => {
              const isFull = slot.used >= slot.max;
              return (
                <div
                  key={index}
                  onDragOver={(e) => !isFull && handleDragOver(e)}
                  onDrop={(e) => !isFull && handleDrop(e, slot.label)}
                  className="slot-card"
                  style={{
                    background:
                      isEditMode && draggedJob && !isFull
                        ? "rgba(59, 130, 246, 0.05)"
                        : isFull && isEditMode
                          ? "rgba(0,0,0,0.05)"
                          : getSlotColor(slot.status),
                    border:
                      isEditMode && draggedJob && !isFull
                        ? "2px dashed #3b82f6"
                        : `1px solid ${getSlotBorder(slot.status)}`,
                    opacity: isEditMode && isFull ? 0.6 : 1,
                    cursor: isEditMode && isFull ? "not-allowed" : "default",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      paddingBottom: "4px",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>
                      {slot.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>IST</div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      overflowY: "auto",
                    }}
                  >
                    {slot.jobs.filter(
                      (j) =>
                        ![
                          "cancelled",
                          "paused",
                          "rescheduled",
                          "skipped",
                        ].includes(j.status),
                    ).length > 0 ? (
                      slot.jobs
                        .filter(
                          (j) =>
                            ![
                              "cancelled",
                              "paused",
                              "rescheduled",
                              "skipped",
                            ].includes(j.status),
                        )
                        .map((job) => {
                          // Check if job is draggable (only scheduled/pending/queued)
                          const isDraggable = [
                            "scheduled",
                            "pending",
                            "queued",
                            "failed",
                          ].includes(job.status);

                          // Status Color Logic
                          const getStatusColor = (s) => {
                            switch (s) {
                              case "failed":
                              case "bounced":
                                return "#ef4444"; // Red
                              case "sent":
                              case "delivered":
                                return "#3b82f6"; // Blue
                              case "opened":
                              case "clicked":
                                return "#22c55e"; // Green
                              case "scheduled":
                                return "#a855f7"; // Purple
                              default:
                                return "#eab308"; // Yellow/Orange (Pending/Queued)
                            }
                          };

                          return (
                            <div
                              key={job.id}
                              draggable={isEditMode && isDraggable}
                              onDragStart={(e) =>
                                isDraggable && handleDragStart(e, job)
                              }
                              style={{
                                fontSize: "0.75rem",
                                background: "rgba(0,0,0,0.2)",
                                padding: "6px",
                                borderRadius: "6px",
                                borderLeft: `3px solid ${getStatusColor(job.status)}`,
                                cursor:
                                  isEditMode && isDraggable
                                    ? "grab"
                                    : "default",
                                opacity:
                                  draggedJob?.id === job.id
                                    ? 0.5
                                    : isEditMode && !isDraggable
                                      ? 0.5
                                      : 1,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "2px",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "65%",
                                  }}
                                >
                                  {job.name}
                                </div>
                                <div
                                  style={{ fontSize: "0.65rem", opacity: 0.8 }}
                                >
                                  {job.time}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{ fontSize: "0.7rem", opacity: 0.9 }}
                                >
                                  {job.displayType || job.type}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.65rem",
                                    padding: "1px 4px",
                                    borderRadius: "4px",
                                    background: `${getStatusColor(job.status)}20`,
                                    color: getStatusColor(job.status),
                                    fontWeight: 600,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {job.status}
                                </div>
                              </div>

                              {isEditMode && isDraggable && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "2px",
                                    right: "2px",
                                    opacity: 0.3,
                                  }}
                                >
                                  <GripVertical size={10} />
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                        }}
                      >
                        Empty
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "0.7rem",
                      textAlign: "right",
                      marginTop: "auto",
                      fontWeight: 600,
                    }}
                  >
                    {slot.used} / {slot.max} Used
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
