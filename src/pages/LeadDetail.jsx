// pages/LeadDetail.jsx
// Migrated to TanStack Query for optimal data fetching and caching
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Clock,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  MoreVertical,
  Trash2,
  MousePointer,
  Eye,
  Snowflake,
  Trophy,
  Pause,
  RotateCcw,
  Edit3,
  Save,
  X,
  CalendarClock,
  Play,
  FastForward,
  User,
  RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, cacheConfig } from "../lib/queryClient";
import { 
  useDeleteLead, 
  useFreezeLead, 
  useUnfreezeLead, 
  useUpdateLead,
  useCancelEmailJob,
  useRetryEmailJob,
} from "../hooks/useApi";
import {
  getLead,
  deleteLead,
  freezeLead,
  unfreezeLead,
  convertLead,
  updateLead,
  getAvailableSlots,
  scheduleManually,
  getTemplates,
  cancelEmailJob,
  pauseFollowups,
  resumeFollowups,
  skipFollowup,
  revertSkipFollowup,
  deleteFollowupFromLead,
  retryEmailJob,
  resumeEmailJob,
  deleteEmailJob,
  getFollowups,
  rescheduleEmailJob,
} from "../services/api";
import gsap from "gsap";
import CalendarSlotPicker from "../components/CalendarSlotPicker";
import TimelineDetailModal from "../components/TimelineDetailModal";
import ConfirmModal from "../components/ConfirmModal";

// Helper to normalize lead data from API
const normalizeLeadData = (result) => {
  if (!result) return null;
  
  // Normalize Prisma emailSchedule structure
  if (result.lead?.emailSchedule) {
    const schedule = result.lead.emailSchedule;
    if (!schedule.initialEmail && (schedule.initialScheduledFor || schedule.initialStatus)) {
      schedule.initialEmail = {
        scheduledFor: schedule.initialScheduledFor,
        status: schedule.initialStatus || "pending",
        sentAt: schedule.initialSentAt,
        changedByUser: schedule.initialChangedByUser,
      };
    }
    if (schedule.followups && !Array.isArray(schedule.followups)) {
      try {
        schedule.followups = typeof schedule.followups === "string" 
          ? JSON.parse(schedule.followups) 
          : [];
      } catch (e) {
        schedule.followups = [];
      }
    }
    if (!schedule.followups) schedule.followups = [];
  }
  
  return result;
};

export default function LeadDetail({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // TanStack Query for lead data
  const {
    data: rawData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => getLead(id),
    ...cacheConfig.standard,
    select: normalizeLeadData,
    enabled: !!id,
  });

  // TanStack Query for followup settings
  const { data: followupSettingsData } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const response = await getFollowups();
      const followups = Array.isArray(response)
        ? response
        : response.followups || [];
      return followups.sort((a, b) => a.order - b.order);
    },
    ...cacheConfig.static,
  });

  const followupSettings = useMemo(
    () => followupSettingsData || [],
    [followupSettingsData],
  );
  const data = rawData;

  // Mutations
  const deleteMutation = useDeleteLead();
  const freezeMutation = useFreezeLead();
  const unfreezeMutation = useUnfreezeLead();
  const updateMutation = useUpdateLead();
  const cancelJobMutation = useCancelEmailJob();
  const retryJobMutation = useRetryEmailJob();

  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeHours, setFreezeHours] = useState(24);
  const [processingAction, setProcessingAction] = useState(false);
  const timelineRef = useRef(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    country: "",
    city: "",
  });

  // Slot Picker State
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Manual Schedule Details State
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualTemplateId, setManualTemplateId] = useState("");
  const [manualBody, setManualBody] = useState("");

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Reschedule Mode State
  const [reschedulingMode, setReschedulingMode] = useState(false);
  const [reschedulingType, setReschedulingType] = useState(null);
  const [reschedulingJobId, setReschedulingJobId] = useState(null);

  // Refined UI State
  const [selectedTimelineItem, setSelectedTimelineItem] = useState(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "danger",
  });

  // Cancel Job Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    jobId: null,
    reason: "",
  });

  // Animation effect
  useEffect(() => {
    if (!loading && timelineRef.current) {
      gsap.fromTo(
        timelineRef.current.children,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: "power2.out" },
      );
    }
  }, [loading]);

  // Refetch helper that invalidates cache
  const loadLeadData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    refetch();
  }, [queryClient, id, refetch]);

  const handleDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Lead",
      message:
        "Are you sure you want to delete this lead? This cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteLead(id);
          showToast?.("Lead deleted successfully", "success");
          navigate("/leads");
        } catch (error) {
          showToast?.("Failed to delete lead", "error");
        }
      },
      variant: "danger",
    });
  };

  const handleFreeze = async (hours) => {
    try {
      setProcessingAction(true);
      await freezeLead(id, hours);
      showToast?.(
        hours === -1
          ? "Lead frozen indefinitely"
          : `Lead frozen for ${hours} hours`,
        "success",
      );
      setShowFreezeModal(false);
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to freeze lead: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUnfreeze = async () => {
    try {
      setProcessingAction(true);
      await unfreezeLead(id);
      showToast?.("Lead unfrozen and sequence resumed", "success");
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to unfreeze lead: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConvert = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Convert Lead",
      message:
        "Mark this lead as converted? All future emails will be stopped.",
      onConfirm: async () => {
        try {
          setProcessingAction(true);
          await convertLead(id);
          showToast?.("Lead marked as converted", "success");
          await loadLeadData();
        } catch (error) {
          showToast?.("Failed to convert lead", "error");
        } finally {
          setProcessingAction(false);
        }
      },
      variant: "warning",
    });
  };

  // --- Edit Mode Handlers ---
  const startEditing = () => {
    setEditForm({
      name: data.lead.name,
      email: data.lead.email,
      country: data.lead.country,
      city: data.lead.city,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({ name: "", email: "", country: "", city: "" });
  };

  const handleSaveEdit = async () => {
    try {
      setProcessingAction(true);
      await updateLead(id, editForm);
      showToast?.("Lead updated successfully", "success");
      setIsEditing(false);
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to update lead: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const loadTemplatesData = async () => {
    try {
      setLoadingTemplates(true);
      const tmpls = await getTemplates();
      setTemplates(tmpls);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // --- Slot Picker Handlers ---
  const openSlotPicker = async ({
    mode = "manual",
    jobType = null,
    jobId = null,
  } = {}) => {
    setShowSlotPicker(true);
    setSelectedSlot(null);
    setManualTitle("");
    setManualTemplateId("");
    setManualBody("");

    // Load templates for manual mode if not already loaded
    if (!mode || mode === "manual") {
      loadTemplatesData();
    }

    // Set Mode
    setReschedulingMode(mode === "reschedule");
    setReschedulingType(jobType);
    setReschedulingJobId(jobId);

    setLoadingSlots(true);
    try {
      const slots = await getAvailableSlots(id);
      setAvailableSlots(slots);
    } catch (error) {
      showToast?.("Failed to load slots: " + error.message, "error");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const confirmManualSchedule = async () => {
    if (!selectedSlot) return;

    // For Rescheduling: We don't need Title/Template validations
    if (!reschedulingMode && !manualTitle && !manualTemplateId) {
      showToast?.("Please provide a Title or select a Template", "error");
      return;
    }

    try {
      setProcessingAction(true);
      setProcessingAction(true);

      if (reschedulingMode && reschedulingJobId) {
        // Use rescheduleEmailJob for existing jobs
        await rescheduleEmailJob(reschedulingJobId, selectedSlot.time);
      } else {
        // Use scheduleManually for NEW manual emails
        await scheduleManually(
          id,
          selectedSlot.time,
          reschedulingMode ? reschedulingType : null,
          reschedulingMode ? null : manualTitle,
          reschedulingMode ? null : manualTemplateId,
          reschedulingMode ? null : manualBody,
        );
      }

      showToast?.(
        reschedulingMode
          ? "Rescheduled successfully!"
          : "Email manually scheduled!",
        "success",
      );
      setShowSlotPicker(false);
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to schedule: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelJob = async (jobId) => {
    // Open cancel modal instead of using prompt
    setCancelModal({
      isOpen: true,
      jobId: jobId,
      reason: "",
    });
  };

  const confirmCancelJob = async () => {
    try {
      setProcessingAction(true);
      await cancelEmailJob(cancelModal.jobId, cancelModal.reason);
      showToast?.("Email cancelled", "success");
      setCancelModal({ isOpen: false, jobId: null, reason: "" });
      loadLeadData();
    } catch (err) {
      showToast?.("Failed to cancel: " + err.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePause = async () => {
    try {
      setProcessingAction(true);
      await pauseFollowups(id);
      showToast?.("Followups paused", "success");
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to pause: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleResume = async () => {
    try {
      setProcessingAction(true);
      const response = await resumeFollowups(id);
      // Check if blocked by high-priority email
      if (response.blocked) {
        showToast?.(
          response.message || "Cannot resume: blocked by scheduled email",
          "warning",
        );
      } else {
        showToast?.("Followups resumed", "success");
      }
      loadLeadData();
    } catch (error) {
      showToast?.("Failed to resume: " + error.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSkip = async (stepName) => {
    setConfirmModal({
      isOpen: true,
      title: "Skip Followup",
      message: `Skip ${stepName}? This will cancel any pending job for it.`,
      onConfirm: async () => {
        try {
          setProcessingAction(true);
          await skipFollowup(id, stepName);
          showToast?.(`${stepName} skipped`, "success");
          await loadLeadData();
        } catch (err) {
          showToast?.(`Failed to skip ${stepName}`, "error");
        } finally {
          setProcessingAction(false);
        }
      },
      variant: "warning",
    });
  };

  const handleRevertSkip = async (stepName) => {
    try {
      setProcessingAction(true);
      await revertSkipFollowup(id, stepName);
      showToast?.("Skip reverted", "success");
      loadLeadData();
    } catch (err) {
      showToast?.("Failed to revert skip: " + err.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    setConfirmModal({
      isOpen: true,
      title: "Retry Email",
      message: "Retry this cancelled email? It will be re-queued.",
      onConfirm: async () => {
        try {
          setProcessingAction(true);
          await retryEmailJob(jobId);
          showToast?.("Email job retried", "success");
          await loadLeadData();
        } catch (err) {
          showToast?.(err.message || "Failed to retry job", "error");
        } finally {
          setProcessingAction(false);
        }
      },
      variant: "info",
    });
  };

  // Resume a paused job (priority pause - no retry count increment)
  const handleResumeJob = async (jobId) => {
    try {
      setProcessingAction(true);
      await resumeEmailJob(jobId);
      showToast?.("Job resumed successfully", "success");
      await loadLeadData();
    } catch (err) {
      // Check for specific error about higher priority mail
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to resume job";
      showToast?.(errorMsg, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteFollowup = async (stepName) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Followup",
      message: `Permanently delete ${stepName} from this lead's sequence? This cannot be undone.`,
      onConfirm: async () => {
        try {
          setProcessingAction(true);
          await deleteFollowupFromLead(id, stepName);
          showToast?.(`${stepName} deleted from lead`, "success");
          await loadLeadData();
        } catch (err) {
          showToast?.(`Failed to delete ${stepName}`, "error");
        } finally {
          setProcessingAction(false);
        }
      },
      variant: "danger",
    });
  };

  const handleDeleteJob = async (jobId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Job",
      message: "Permanently delete this email job? This cannot be undone.",
      onConfirm: async () => {
        try {
          setProcessingAction(true);
          await deleteEmailJob(id, jobId);
          showToast?.("Email job deleted", "success");
          await loadLeadData();
        } catch (err) {
          showToast?.("Failed to delete job", "error");
        } finally {
          setProcessingAction(false);
        }
      },
      variant: "danger",
    });
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const { lead, emailJobs } = data;

  // Check if lead is dead - all actions should be disabled
  const isLeadDead = lead.status === "dead" || lead.terminalState === "dead";

  const formatJobType = (type) => {
    if (!type) return "Unknown";
    if (type.toLowerCase().includes("initial")) return "Initial";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Combine event history and email jobs for a comprehensive timeline if needed
  // For now, let's use the detailed eventHistory from the lead model if available,
  // falling back to emailJobs if history is empty (legacy support)
  const history = lead.eventHistory || [];

  // Sort history by timestamp desc
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "#22c55e";
      case "searched":
        return "#3b82f6";
      case "opened":
        return "#3b82f6";
      case "clicked":
        return "#a855f7";
      case "bounced":
        return "#eab308";
      case "soft_bounce":
        return "#eab308";
      case "hard_bounce":
        return "#ef4444";
      case "failed":
        return "#ef4444";
      case "blocked":
        return "#ef4444";
      case "spam":
        return "#ef4444";
      case "sent":
        return "#8b5cf6";
      case "queued":
        return "#f59e0b";
      case "scheduled":
        return "#64748b";
      case "manual_scheduled":
        return "#8b5cf6";
      case "frozen":
        return "#3b82f6";
      case "converted":
        return "#eab308";
      case "paused":
        return "#f59e0b";
      case "resumed":
        return "#22c55e";
      case "rescheduled":
        return "#06b6d4"; // Cyan for rescheduled
      case "skipped":
        return "#6b7280";
      case "revert_skipped":
        return "#3b82f6";
      case "cancelled":
        return "#ef4444";
      case "deleted_followup":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  const getEventIcon = (event) => {
    switch (event) {
      case "delivered":
        return <CheckCircle size={16} />;
      case "opened":
        return <Eye size={16} />;
      case "clicked":
        return <MousePointer size={16} />;
      case "bounced":
      case "soft_bounce":
        return <AlertCircle size={16} />;
      case "failed":
      case "hard_bounce":
      case "blocked":
      case "spam":
        return <XCircle size={16} />;
      case "sent":
        return <Send size={16} />;
      case "scheduled":
        return <Clock size={16} />;
      case "frozen":
        return <Snowflake size={16} />;
      case "converted":
        return <Trophy size={16} />;
      case "paused":
        return <Pause size={16} />;
      case "resumed":
        return <Play size={16} />;
      case "rescheduled":
        return <RefreshCw size={16} />; // Refresh icon for rescheduled
      case "skipped":
        return <FastForward size={16} />;
      case "revert_skipped":
        return <RotateCcw size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      case "deleted_followup":
        return <Trash2 size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // --- UNIFIED TIMELINE LOGIC ---
  const timelineItems = (() => {
    if (!lead) return [];
    let items = [];

    // 1. Initial Email
    if (lead.emailSchedule?.initialEmail) {
      items.push({
        id: "initial",
        type: "initial",
        category: "automated",
        name: "Initial Email",
        status: lead.emailSchedule.initialEmail.status || "pending",
        scheduledFor: lead.emailSchedule.initialEmail.scheduledFor,
        sentAt: lead.emailSchedule.initialEmail.sentAt,
        isProjected: false,
        rawData: lead.emailSchedule.initialEmail,
      });
    }

    // 2. Manual Mails
    if (lead.manualMails && lead.manualMails.length > 0) {
      lead.manualMails.forEach((m) => {
        // Resolve Sent Date: Try to find matching job
        let sentDate = null;
        if (
          [
            "sent",
            "delivered",
            "opened",
            "clicked",
            "bounced",
            "manual_sent",
          ].includes(m.status)
        ) {
          // Try to find the job
          const job = emailJobs.find(
            (j) =>
              (m.emailJobId && j.id === m.emailJobId) ||
              j.metadata?.manualMailId === m.id,
          );
          sentDate = job?.sentAt || job?.processedAt;
          // If still null but status implies sent, use a fallback like createdAt (imperfect but better than null)
          if (!sentDate && m.status !== "pending") sentDate = m.createdAt;
        }

        items.push({
          id: m.id || `manual-${Math.random()}`,
          type: "manual",
          category: "manual",
          name: m.title || "Manual Email",
          status: m.status,
          scheduledFor: m.scheduledFor,
          sentAt: sentDate,
          isProjected: false,
          changedByUser: true, // Manual mails are always by user
          rawData: m,
        });
      });
    }

    // 3. Followups & Projections
    // We start with defined settings to know what SHOULD exist
    // Filter out Initial Email since it's handled separately above
    let definitions = (followupSettings || []).filter(
      (f) => !f.name?.toLowerCase().includes("initial"),
    );
    // Fallback to schedule if settings missing
    if (definitions.length === 0 && lead.emailSchedule?.followups) {
      definitions = lead.emailSchedule.followups.map((f) => ({
        name: f.name,
        delay: 0,
      }));
    }

    // DEBUG: Log what we're processing
    console.log(
      "[Timeline] Definitions:",
      definitions.map((d) => d.name).join(", "),
    );
    console.log(
      "[Timeline] EmailJobs:",
      emailJobs?.map((j) => j.type + ":" + j.status).join(", "),
    );

    definitions.forEach((def, idx) => {
      // Check if this followup exists in actual schedule run data
      const runData = lead.emailSchedule?.followups?.find(
        (f) => f.name === def.name,
      );

      // Find matching job from emailJobs - prefer scheduled/pending/completed over cancelled
      // Sort by status priority: pending/scheduled > sent/delivered > cancelled/paused
      const matchingJobs = emailJobs.filter((j) => j.type === def.name);
      const getJobPriority = (status) => {
        if (["pending", "queued", "scheduled", "rescheduled"].includes(status))
          return 90;
        if (["sent", "delivered", "opened", "clicked"].includes(status))
          return 80;
        if (["skipped"].includes(status)) return 50; // Skipped is a terminal state, show it
        if (["paused"].includes(status)) return 40;
        if (["cancelled", "failed", "blocked"].includes(status)) return 30;
        return 20;
      };
      const sortedJobs = matchingJobs.sort(
        (a, b) => getJobPriority(b.status) - getJobPriority(a.status),
      );
      const job = sortedJobs[0]; // Best priority job

      if (runData || job) {
        // It has a record (either scheduled, sent, completed, or paused)
        // Use job status as primary source (more accurate), fallback to runData
        const currentStatus = job?.status || runData?.status || "pending";
        const scheduledFor = job?.scheduledFor || runData?.scheduledFor;
        const sentAt = job?.sentAt || runData?.sentAt;

        items.push({
          id: job?.id || runData?.id || `followup-${idx}`,
          type: def.name,
          category: "automated",
          name: def.name,
          status: currentStatus,
          scheduledFor: scheduledFor,
          sentAt: sentAt,
          isProjected: false,
          changedByUser: runData?.changedByUser || job?.metadata?.changedByUser,
          rawData: job || runData,
        });
      } else {
        // It does NOT have a record yet -> It is a FUTURE PROJECTION
        // Calculate projected date based on LATEST interaction (Automated OR Manual)

        // Find latest 'delivered' or 'sent' item so far in our list
        const deliveredItems = items.filter(
          (i) =>
            [
              "sent",
              "delivered",
              "opened",
              "clicked",
              "manual_sent",
              "manual_delivered",
            ].includes(i.status) && i.sentAt,
        );
        // Sort by date desc
        deliveredItems.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

        const latestInteraction = deliveredItems[0];
        let baseDate = null;

        if (latestInteraction) {
          baseDate = new Date(latestInteraction.sentAt);
        } else if (lead.emailSchedule?.initialEmail?.scheduledFor) {
          baseDate = new Date(lead.emailSchedule.initialEmail.scheduledFor);
        } else {
          baseDate = new Date(); // Fallback to now
        }

        // Add delay for THIS step
        const delay = def.delay || def.delayDays || 2;
        const projectedDate = new Date(baseDate);
        projectedDate.setDate(projectedDate.getDate() + delay);

        items.push({
          id: `projected-${idx}`,
          type: def.name,
          category: "automated",
          name: def.name,
          status: "upcoming",
          scheduledFor: projectedDate,
          sentAt: null,
          isProjected: true,
          rawData: null,
        });
      }
    });

    // 4.5 Conditional Emails
    // Find all conditional email jobs and show only ONE per conditional type
    // Prioritize: pending/scheduled > sent/delivered > cancelled
    const conditionalJobs = emailJobs.filter(
      (j) => j.type && j.type.startsWith("conditional:"),
    );

    // Group by conditional type (e.g., "conditional:Thank You Mail")
    const conditionalByType = {};
    conditionalJobs.forEach((job) => {
      const existingJob = conditionalByType[job.type];
      if (!existingJob) {
        conditionalByType[job.type] = job;
      } else {
        // Priority: pending/scheduled > sent/delivered/opened/clicked > cancelled/failed
        const getPriority = (status) => {
          if (
            ["pending", "queued", "scheduled", "rescheduled"].includes(status)
          )
            return 90;
          if (["sent", "delivered", "opened", "clicked"].includes(status))
            return 80;
          if (["cancelled", "failed", "blocked"].includes(status)) return 10;
          return 50;
        };
        if (getPriority(job.status) > getPriority(existingJob.status)) {
          conditionalByType[job.type] = job;
        }
      }
    });

    // Add the best job for each conditional type to timeline
    Object.values(conditionalByType).forEach((job, idx) => {
      // Extract trigger event from metadata
      const triggerEvent = job.metadata?.triggerEvent || "event";

      items.push({
        id: job.id || `conditional-${idx}`,
        type: job.type,
        category: "conditional",
        name: `Conditional Mail (${triggerEvent})`,
        status: job.status,
        scheduledFor: job.scheduledFor,
        sentAt: job.sentAt,
        isProjected: false,
        changedByUser: false,
        triggerEvent: triggerEvent,
        rawData: job,
      });
    });

    // 5. Add Skipped Followups (they are stored separately in lead.skippedFollowups as strings)
    if (lead.skippedFollowups && Array.isArray(lead.skippedFollowups)) {
      lead.skippedFollowups.forEach((stepName, idx) => {
        // Check if already added (shouldn't be, but safety check)
        const alreadyExists = items.some((i) => i.type === stepName);
        if (!alreadyExists) {
          // Find the skipped job for this skipped followup
          const skippedJob = emailJobs.find(
            (j) => j.type === stepName && j.status === "skipped",
          );

          items.push({
            id: `skipped-${idx}`,
            type: stepName,
            category: "automated",
            name: stepName,
            status: "skipped",
            scheduledFor: skippedJob?.scheduledFor || null,
            sentAt: null,
            isProjected: false,
            changedByUser: true,
            rawData: { skipped: true, name: stepName },
          });
        }
      });
    }

    // 5. Sort Final List
    // Logic:
    // - If Sent: Use sentAt
    // - If Scheduled/Pending: Use scheduledFor
    // - If Projected: Use scheduledFor
    return items.sort((a, b) => {
      const dateA = a.sentAt
        ? new Date(a.sentAt)
        : a.scheduledFor
          ? new Date(a.scheduledFor)
          : new Date(8640000000000000);
      const dateB = b.sentAt
        ? new Date(b.sentAt)
        : b.scheduledFor
          ? new Date(b.scheduledFor)
          : new Date(8640000000000000);
      return dateA - dateB;
    });
  })();

  return (
    <div className="lead-detail-page">
      {/* Back Button */}
      <button
        onClick={() => navigate("/leads")}
        className="btn btn-secondary"
        style={{ marginBottom: "1rem", width: "auto" }}
      >
        <ArrowLeft size={18} /> Back to Leads
      </button>

      {/* Hero Header */}
      <div className="lead-hero-header">
        <div className="lead-hero-content">
          <div className="lead-hero-info">
            <div className="lead-name-badge">
              <h1 className="lead-name">{lead.name}</h1>
              <div className="lead-status-badge">
                {getEventIcon(lead.status?.split(":")[1] || lead.status)}
                <span>
                  {(lead.status || "").replace(/_/g, " ").replace(":", " - ")}
                </span>
              </div>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              {lead.email}
            </p>
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                flexWrap: "wrap",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <MapPin size={16} />
                <span>
                  {lead.city}, {lead.country}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Clock size={16} />
                <span>{lead.timezone}</span>
              </div>
            </div>
            <div className="lead-score-display">
              <Trophy size={20} style={{ color: "var(--warning)" }} />
              <div>
                <div className="lead-score-number">{lead.score || 0}</div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Lead Score
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {lead.status !== "converted" && !isLeadDead && (
              <>
                {lead.status === "frozen" ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleUnfreeze}
                    disabled={processingAction || isLeadDead}
                  >
                    <RotateCcw size={18} /> Unfreeze
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowFreezeModal(true)}
                    disabled={processingAction || isLeadDead}
                  >
                    <Snowflake size={18} /> Freeze
                  </button>
                )}

                <button
                  className="btn btn-success"
                  onClick={handleConvert}
                  disabled={processingAction || isLeadDead}
                >
                  <Trophy size={18} /> Convert
                </button>
              </>
            )}

            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={18} /> Delete
            </button>
          </div>
        </div>
      </div>

      {showFreezeModal && (
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
          onClick={() => setShowFreezeModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Snowflake size={24} color="#3b82f6" />
              Freeze Outreach
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Pause all outreach for this lead. The systems will automatically
              reschedule the current stage after the freeze duration.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "1.5rem",
              }}
            >
              {[2, 6, 24, 48, 72, 168].map((h) => (
                <button
                  key={h}
                  className="btn btn-secondary"
                  onClick={() => handleFreeze(h)}
                  style={{ fontSize: "0.8rem", padding: "10px" }}
                  disabled={processingAction}
                >
                  {h < 24
                    ? `${h} Hours`
                    : `${h / 24} Day${h / 24 > 1 ? "s" : ""}`}
                </button>
              ))}
              <button
                className="btn btn-secondary"
                onClick={() => handleFreeze(-1)}
                style={{
                  fontSize: "0.8rem",
                  padding: "10px",
                  gridColumn: "span 2",
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
                disabled={processingAction}
              >
                <Pause size={16} /> Freeze Indefinitely
              </button>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border-color)",
                paddingTop: "1.5rem",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                Custom Duration (Hours)
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="number"
                  value={freezeHours}
                  onChange={(e) => setFreezeHours(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--bg-glass)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleFreeze(parseInt(freezeHours))}
                  disabled={processingAction || !freezeHours}
                >
                  Go
                </button>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{
                width: "100%",
                marginTop: "1rem",
                background: "none",
                border: "none",
              }}
              onClick={() => setShowFreezeModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Slot Picker Modal */}
      {showSlotPicker && (
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
          onClick={() => setShowSlotPicker(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!selectedSlot ? (
              <>
                <h3
                  style={{
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <CalendarClock size={24} color="#8b5cf6" />
                  Premium Slot Picker
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  Select a time slot to{" "}
                  {reschedulingMode
                    ? "reschedule this email"
                    : "manually schedule the next email"}
                  .
                </p>

                {loadingSlots ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "2rem",
                    }}
                  >
                    <div className="loading-spinner"></div>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "2rem",
                    }}
                  >
                    No available slots found. Try again later.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={processingAction}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          transition: "all 0.2s ease",
                        }}
                        className="hover-bg"
                      >
                        <span style={{ fontWeight: 500 }}>
                          {slot.localTime}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {slot.available} slot{slot.available > 1 ? "s" : ""}{" "}
                          left
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    marginTop: "1.5rem",
                    background: "none",
                    border: "none",
                  }}
                  onClick={() => setShowSlotPicker(false)}
                >
                  Cancel
                </button>
              </>
            ) : reschedulingMode ? (
              // --- RESCHEDULE CONFIRMATION UI ---
              <>
                <h3
                  style={{
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <CalendarClock size={24} color="#3b82f6" />
                  Confirm Reschedule
                </h3>

                <div style={{ marginBottom: "1.5rem" }}>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      marginBottom: "1rem",
                    }}
                  >
                    You are rescheduling <strong>{reschedulingType}</strong> to:
                  </p>
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}
                  >
                    {new Date(selectedSlot.time).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmManualSchedule}
                    disabled={processingAction}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </>
            ) : (
              // --- MANUAL SCHEDULE FORM UI ---
              <>
                <h3
                  style={{
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Edit3 size={24} color="#8b5cf6" />
                  Configure Manual Email
                </h3>
                <div
                  style={{
                    background: "var(--bg-hover)",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  <strong>Selected Slot:</strong>{" "}
                  {new Date(selectedSlot.time).toLocaleString()}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "0.9rem",
                      }}
                    >
                      Email Title / Subject{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Special Follow-up"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-glass)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "0.9rem",
                      }}
                    >
                      Use Template (Optional)
                    </label>
                    <select
                      value={manualTemplateId}
                      onChange={(e) => setManualTemplateId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-glass)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="">-- No Template --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!manualTemplateId && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Custom Body
                      </label>
                      <textarea
                        rows={4}
                        value={manualBody}
                        onChange={(e) => setManualBody(e.target.value)}
                        placeholder="Write your custom email content here..."
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-glass)",
                          color: "var(--text-primary)",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmManualSchedule}
                    disabled={processingAction}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    Schedule Email
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "2rem",
        }}
      >
        {/* Left Column: Stats & Info */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Profile Card */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Lead Profile</h3>
              {!isEditing ? (
                <button
                  onClick={startEditing}
                  className="action-btn"
                  title="Edit Lead"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Edit3 size={16} />
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveEdit}
                    className="action-btn"
                    title="Save"
                    disabled={processingAction}
                    style={{ color: "#22c55e" }}
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="action-btn"
                    title="Cancel"
                    style={{ color: "#ef4444" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {isEditing ? (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Country (2-letter code)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          country: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      City
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <MapPin size={18} color="var(--text-secondary)" />
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Location
                      </div>
                      <div>
                        {lead.city}, {lead.country}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Clock size={18} color="var(--text-secondary)" />
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Timezone
                      </div>
                      <div>{lead.timezone}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Calendar size={18} color="var(--text-secondary)" />
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Added On
                      </div>
                      <div>{new Date(lead.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Manual Schedule Button */}
            {lead.status !== "converted" && !isEditing && !isLeadDead && (
              <button
                onClick={openSlotPicker}
                className="btn btn-secondary"
                style={{ marginTop: "1.5rem", width: "100%" }}
                disabled={isLeadDead}
              >
                <CalendarClock size={16} /> Manual Schedule
              </button>
            )}
          </div>

          {/* Stats Card */}
          <div className="card">
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>
              Engagement
            </h3>
            {/* Calculate counts from eventHistory for accuracy */}
            {(() => {
              const history = lead.eventHistory || [];
              const sentCount = history.filter(
                (e) => e.event === "sent",
              ).length;
              const openedCount = history.filter(
                (e) => e.event === "opened" || e.event === "unique_opened",
              ).length;
              const clickedCount = history.filter(
                (e) => e.event === "clicked",
              ).length;
              const bouncedCount = history.filter((e) =>
                ["soft_bounce", "hard_bounce"].includes(e.event),
              ).length;

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "1rem",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#8b5cf6",
                      }}
                    >
                      {sentCount}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Sent
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "1rem",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#22c55e",
                      }}
                    >
                      {openedCount}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Opened
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "1rem",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#a855f7",
                      }}
                    >
                      {clickedCount}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Clicked
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "1rem",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#ef4444",
                      }}
                    >
                      {bouncedCount}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Bounced
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Timeline & Schedule */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Sequence Progress - Individual Step Boxes */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                Sequence Progress
              </h3>
              {lead &&
                (() => {
                  // Check if the lead has a failed email status
                  const isEmailFailed = [
                    "blocked",
                    "hard_bounce",
                    "failed",
                    "spam",
                  ].some((s) => lead.status?.toLowerCase().includes(s));

                  // Find the failed email job to retry from API data
                  const failedJob = data?.emailJobs?.find((job) =>
                    ["blocked", "hard_bounce", "failed", "spam"].includes(
                      job.status,
                    ),
                  );

                  if (isEmailFailed && failedJob) {
                    // Show Retry button for failed emails
                    return (
                      <button
                        onClick={async () => {
                          try {
                            setProcessingAction(true);
                            await retryEmailJob(failedJob.id);
                            showToast?.(
                              `Retrying ${failedJob.type} email`,
                              "success",
                            );
                            loadLeadData();
                          } catch (err) {
                            showToast?.(
                              "Failed to retry: " + err.message,
                              "error",
                            );
                          } finally {
                            setProcessingAction(false);
                          }
                        }}
                        disabled={processingAction}
                        className="btn"
                        style={{
                          fontSize: "0.85rem",
                          padding: "6px 12px",
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          border: "1px solid currentColor",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <RotateCcw size={16} style={{ marginRight: "6px" }} />{" "}
                        Retry Failed Email
                      </button>
                    );
                  } else if (lead.followupsPaused) {
                    // Show Resume button
                    return (
                      <button
                        onClick={handleResume}
                        className="btn"
                        style={{
                          fontSize: "0.85rem",
                          padding: "6px 12px",
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#3b82f6",
                          border: "1px solid currentColor",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Play size={16} style={{ marginRight: "6px" }} /> Resume
                        Sequence
                      </button>
                    );
                  } else {
                    // Show Pause button
                    return (
                      <button
                        onClick={handlePause}
                        className="btn"
                        style={{
                          fontSize: "0.85rem",
                          padding: "6px 12px",
                          background: "rgba(245, 158, 11, 0.1)",
                          color: "#f59e0b",
                          border: "1px solid currentColor",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Pause size={16} style={{ marginRight: "6px" }} /> Pause
                        Sequence
                      </button>
                    );
                  }
                })()}
            </div>

            {/* Unified Communication Journey */}
            {/* Unified Communication Journey */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "16px",
              }}
            >
              {timelineItems.map((item, idx) => (
                <div
                  key={`${item.type}-${idx}`}
                  className="card timeline-grid-item"
                  style={{
                    borderLeft: `3px solid ${item.isProjected ? "#cbd5e1" : getStatusColor(item.status)}`,
                    background: item.isProjected
                      ? "rgba(255,255,255,0.02)"
                      : "var(--bg-glass)",
                    opacity: item.isProjected ? 0.7 : 1,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "visible",
                  }}
                  onClick={() => {
                    // Unified History Logic for Modal
                    let itemHistory = [];

                    if (item.category === "manual") {
                      // For Manual Mails, STRICTLY match by Job ID if available
                      const jobId = item.rawData.emailJobId || item.rawData.id; // rawData.id is ManualMailId, emailJobId is JobId.
                      // History stores emailJobId.
                      if (item.rawData.emailJobId) {
                        itemHistory = history.filter(
                          (h) =>
                            h.emailJobId === item.rawData.emailJobId ||
                            (typeof h.emailJobId === "object" &&
                              h.emailJobId.toString() ===
                                item.rawData.emailJobId.toString()),
                        );
                      } else {
                        // Fallback for draft manual mails or legacy data
                        itemHistory = history.filter(
                          (h) => h.emailType === "manual",
                        );
                      }
                    } else {
                      // For Automated, match by Type Name (case-insensitive)
                      itemHistory = history.filter((h) => {
                        if (!h.emailType) return false;
                        const hType = h.emailType.toLowerCase();
                        const iType = item.type.toLowerCase();
                        return (
                          hType === iType ||
                          hType.includes(iType) ||
                          (iType === "initial" && hType.includes("initial"))
                        );
                      });
                    }

                    // Sort by timestamp
                    itemHistory.sort(
                      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
                    );

                    setSelectedTimelineItem({ ...item, history: itemHistory });
                  }}
                >
                  {/* Email Type Badge Ribbon */}
                  {!item.isProjected && (
                    <div
                      className={`email-type-badge ${
                        item.category === "manual"
                          ? "manual"
                          : item.type.toLowerCase().includes("initial")
                            ? "initial"
                            : "followup"
                      }`}
                    ></div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: `${getStatusColor(item.status)}20`,
                        color: getStatusColor(item.status),
                      }}
                    >
                      {item.category === "manual" ? (
                        <Edit3 size={20} />
                      ) : (
                        <Mail size={20} />
                      )}
                    </div>
                    {!item.isProjected && (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: getStatusColor(item.status),
                        }}
                      ></div>
                    )}
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </h4>

                    {/* Status Pill */}
                    <div
                      className={`status-pill ${item.isProjected ? "upcoming" : item.status}`}
                    >
                      {getEventIcon(item.status)}
                      <span>
                        {item.isProjected
                          ? "Upcoming"
                          : (item.status || "").replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Date Time Display */}
                    <div className="datetime-display">
                      <Clock size={12} />
                      <span>
                        {(() => {
                          const date = item.sentAt || item.scheduledFor;
                          if (!date) return "Not scheduled";
                          const d = new Date(date);
                          const day = d.getDate();
                          const month = d.toLocaleString("en-US", {
                            month: "long",
                          });
                          const time = d.toLocaleString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                          return `${day}, ${month} ${time}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modals */}
            {selectedTimelineItem && (
              <TimelineDetailModal
                item={selectedTimelineItem}
                onClose={() => setSelectedTimelineItem(null)}
                getStatusColor={getStatusColor}
                getEventIcon={getEventIcon}
                onAction={async (action, item, payload) => {
                  if (action === "resume") handleResume();
                  else if (action === "skip") handleSkip(item.type);
                  else if (action === "delete") {
                    if (item.category === "manual") {
                      const jobId = item.rawData.emailJobId;
                      if (jobId) handleDeleteJob(jobId);
                      else showToast("Cannot delete: Missing Job ID", "error");
                    } else {
                      handleDeleteFollowup(item.type);
                    }
                  } else if (action === "cancel") {
                    // Get job ID from rawData - try multiple sources
                    const jobId =
                      item.rawData?.id || item.rawData?.emailJobId || item.id;
                    console.log(
                      "[Modal Action] Cancel: Looking for jobId:",
                      jobId,
                      "type:",
                      item.type,
                    );
                    console.log(
                      "[Modal Action] Available jobs:",
                      emailJobs?.map((j) => ({
                        id: j.id,
                        type: j.type,
                        status: j.status,
                      })),
                    );

                    const pendingStatuses = [
                      "pending",
                      "queued",
                      "scheduled",
                      "rescheduled",
                    ];
                    // Try by ID first, then by type
                    let jobToCancel = emailJobs.find(
                      (j) =>
                        (j.id === jobId ||
                          j.id?.toString() === jobId?.toString()) &&
                        pendingStatuses.includes(j.status),
                    );

                    // Fallback: find by type if ID didn't match
                    if (!jobToCancel && item.type) {
                      jobToCancel = emailJobs.find(
                        (j) =>
                          j.type === item.type &&
                          pendingStatuses.includes(j.status),
                      );
                    }

                    if (jobToCancel) {
                      console.log(
                        "[Modal Action] Found job to cancel:",
                        jobToCancel.id,
                      );
                      handleCancelJob(jobToCancel.id);
                    } else {
                      showToast("No pending job found to cancel", "error");
                    }
                  } else if (action === "retry") {
                    // Get job ID from rawData - try multiple sources
                    const jobId =
                      item.rawData?.id || item.rawData?.emailJobId || item.id;
                    console.log(
                      "[Modal Action] Retry: Looking for jobId:",
                      jobId,
                      "type:",
                      item.type,
                      "status:",
                      item.status,
                    );
                    console.log(
                      "[Modal Action] Available jobs:",
                      emailJobs?.map((j) => ({
                        id: j.id,
                        type: j.type,
                        status: j.status,
                      })),
                    );

                    const failureStatuses = [
                      "cancelled",
                      "blocked",
                      "failed",
                      "hard_bounce",
                      "soft_bounce",
                      "spam",
                      "bounced",
                      "deferred",
                    ];

                    // Try by ID first
                    let jobToRetry = emailJobs.find(
                      (j) =>
                        (j.id === jobId ||
                          j.id?.toString() === jobId?.toString()) &&
                        failureStatuses.includes(j.status),
                    );

                    // Fallback: find by type if ID didn't match
                    // Use case-insensitive includes matching to handle 'initial' vs 'Initial Email' variations
                    if (!jobToRetry && item.type) {
                      const searchType = item.type.toLowerCase();
                      jobToRetry = emailJobs.find((j) => {
                        const jobType = (j.type || "").toLowerCase();
                        return (
                          (jobType === searchType ||
                            jobType.includes(searchType) ||
                            searchType.includes(jobType)) &&
                          failureStatuses.includes(j.status)
                        );
                      });
                    }

                    if (jobToRetry) {
                      console.log(
                        "[Modal Action] Found job to retry:",
                        jobToRetry.id,
                      );
                      handleRetryJob(jobToRetry.id);
                    } else {
                      console.error(
                        "[Modal Action] No failed job found. Item:",
                        item,
                      );
                      showToast(
                        "No retriable job found. Job may not be in a failed/cancelled state.",
                        "error",
                      );
                    }
                  } else if (action === "revertSkip") {
                    try {
                      console.log(
                        "[Modal Action] Reverting skip for:",
                        item.type,
                      );
                      const { revertSkipFollowup } =
                        await import("../services/api");
                      await revertSkipFollowup(id, item.type);
                      showToast("Followup restored successfully", "success");
                      loadLeadData();
                    } catch (error) {
                      console.error("[Modal Action] Revert skip error:", error);
                      showToast(
                        error.message || "Failed to revert skip",
                        "error",
                      );
                    }
                  } else if (action === "resumeJob") {
                    // Resume a job that was paused due to priority
                    const jobId =
                      item.rawData?.id || item.rawData?.emailJobId || item.id;
                    console.log("[Modal Action] Resume job:", jobId);

                    // Find the paused job
                    const pausedJob = emailJobs.find(
                      (j) =>
                        (j.id === jobId ||
                          j.id?.toString() === jobId?.toString()) &&
                        j.status === "paused",
                    );

                    if (pausedJob) {
                      handleResumeJob(pausedJob.id);
                    } else {
                      showToast("No paused job found to resume", "error");
                    }
                  } else if (action === "reschedule") {
                    // Resolve Job ID: prefer emailJobId (manual mails) or rawData.id (jobs)
                    const jobId =
                      item.rawData?.emailJobId || item.rawData?.id || item.id;
                    if (jobId) {
                      openSlotPicker({
                        mode: "reschedule",
                        jobType: item.type,
                        jobId: jobId,
                      });
                    } else {
                      showToast("Cannot reschedule: Missing Job ID", "error");
                    }
                  }

                  setSelectedTimelineItem(null);
                }}
              />
            )}

            {showSlotPicker && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.6)",
                  zIndex: 1100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    width: "90%",
                    maxWidth: "900px",
                    height: "650px",
                    background: "var(--bg-card)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                  }}
                >
                  <CalendarSlotPicker
                    onCancel={() => setShowSlotPicker(false)}
                    onSelectSlot={(date) => {
                      const isoDate = date.toISOString();
                      if (reschedulingMode && reschedulingJobId) {
                        rescheduleEmailJob(reschedulingJobId, isoDate)
                          .then(() => {
                            showToast("Rescheduled successfully", "success");
                            loadLeadData();
                          })
                          .catch((err) =>
                            showToast(
                              "Reschedule failed: " + err.message,
                              "error",
                            ),
                          );
                        setShowSlotPicker(false);
                      } else {
                        // Manual Schedule - Show config modal
                        setSelectedSlot({ time: isoDate });
                        loadTemplatesData(); // Load templates for selection
                        setShowSlotPicker(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Manual Mail Configuration Modal */}
            {selectedSlot && !reschedulingMode && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.7)",
                  zIndex: 1200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    width: "90%",
                    maxWidth: "500px",
                    background: "var(--bg-card)",
                    borderRadius: "16px",
                    padding: "2rem",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3
                    style={{
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Edit3 size={24} color="#8b5cf6" />
                    Configure Manual Email
                  </h3>
                  <div
                    style={{
                      background: "var(--bg-hover)",
                      padding: "10px",
                      borderRadius: "8px",
                      marginBottom: "1.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <strong>Selected Slot:</strong>{" "}
                    {new Date(selectedSlot.time).toLocaleString()}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Email Title / Subject{" "}
                        <span style={{ color: "red" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Special Follow-up"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-glass)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Select Template
                      </label>
                      {loadingTemplates ? (
                        <div
                          style={{
                            padding: "10px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Loading templates...
                        </div>
                      ) : (
                        <select
                          value={manualTemplateId}
                          onChange={(e) => setManualTemplateId(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-glass)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <option value="">
                            -- No Template (Custom Body) --
                          </option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {!manualTemplateId && (
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "0.9rem",
                          }}
                        >
                          Custom Email Body
                        </label>
                        <textarea
                          rows={4}
                          value={manualBody}
                          onChange={(e) => setManualBody(e.target.value)}
                          placeholder="Write your custom email content here..."
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-glass)",
                            color: "var(--text-primary)",
                            resize: "vertical",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        setSelectedSlot(null);
                        setManualTitle("");
                        setManualTemplateId("");
                        setManualBody("");
                      }}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!manualTitle && !manualTemplateId) {
                          showToast(
                            "Please provide a Title or select a Template",
                            "error",
                          );
                          return;
                        }
                        try {
                          setProcessingAction(true);
                          await scheduleManually(
                            id,
                            selectedSlot.time,
                            "manual",
                            manualTitle,
                            manualTemplateId,
                            manualBody,
                          );
                          showToast(
                            "Manual mail scheduled successfully!",
                            "success",
                          );
                          setSelectedSlot(null);
                          setManualTitle("");
                          setManualTemplateId("");
                          setManualBody("");
                          loadLeadData();
                        } catch (err) {
                          showToast(
                            "Failed to schedule: " + err.message,
                            "error",
                          );
                        } finally {
                          setProcessingAction(false);
                        }
                      }}
                      disabled={
                        processingAction || (!manualTitle && !manualTemplateId)
                      }
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                    >
                      {processingAction ? "Scheduling..." : "Schedule Email"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="card">
              <h3 style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>
                Activity History
              </h3>

              <div
                className="timeline"
                ref={timelineRef}
                style={{ position: "relative", paddingLeft: "20px" }}
              >
                {/* Vertical line */}
                <div
                  style={{
                    position: "absolute",
                    left: "0",
                    top: "10px",
                    bottom: "10px",
                    width: "2px",
                    background: "var(--border-color)",
                  }}
                ></div>

                {sortedHistory.length > 0 ? (
                  sortedHistory.map((event, index) => (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        marginBottom: "1.5rem",
                        paddingLeft: "20px",
                      }}
                    >
                      {/* Dot */}
                      <div
                        style={{
                          position: "absolute",
                          left: "-29px",
                          top: "0",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "var(--bg-card)",
                          border: `2px solid ${getStatusColor(event.event)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: getStatusColor(event.event),
                          zIndex: 2,
                        }}
                      >
                        {getEventIcon(event.event)}
                      </div>

                      <div
                        style={{
                          background: "var(--bg-hover)",
                          padding: "1rem",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              textTransform: "capitalize",
                              color: getStatusColor(event.event),
                            }}
                          >
                            {event.emailType
                              ? `${formatJobType(event.emailType)}:`
                              : ""}
                            {event.event
                              .replace("_", " ")
                              .charAt(0)
                              .toUpperCase() +
                              event.event.replace("_", " ").slice(1)}
                          </span>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {event.emailType && (
                          <div
                            style={{ fontSize: "0.9rem", marginBottom: "4px" }}
                          >
                            Email: <strong>{event.emailType}</strong>
                          </div>
                        )}

                        {event.details?.reason && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#ef4444",
                              marginTop: "4px",
                            }}
                          >
                            Reason: {event.details.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "1rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    No activity recorded yet for this lead.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      {/* Cancel Job Modal */}
      {cancelModal.isOpen && (
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
          onClick={() =>
            setCancelModal({ isOpen: false, jobId: null, reason: "" })
          }
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "440px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                }}
              >
                <XCircle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                Cancel Email Job
              </h3>
            </div>

            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
                fontSize: "0.95rem",
              }}
            >
              Are you sure you want to cancel this scheduled email?
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "0.9rem",
                }}
              >
                Cancellation Reason (optional)
              </label>
              <input
                type="text"
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal({ ...cancelModal, reason: e.target.value })
                }
                placeholder="e.g. Lead requested to pause"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-glass)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() =>
                  setCancelModal({ isOpen: false, jobId: null, reason: "" })
                }
                className="btn btn-secondary"
              >
                Keep Email
              </button>
              <button
                onClick={confirmCancelJob}
                disabled={processingAction}
                className="btn btn-danger"
              >
                {processingAction ? "Cancelling..." : "Cancel Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
