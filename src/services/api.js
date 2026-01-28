// services/api.js
import axios from 'axios';

// Use environment variable or fall back to localhost
const API_BASE_URL = 'https://server.sbcws.com/api';
// const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout for production resilience
  timeout: 30000,
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors gracefully
    if (!error.response) {
      console.error('[API] Network error:', error.message);
    }
    return Promise.reject(error);
  }
);


// Analytics endpoints
export const getAnalyticsSummary = async (startDate, endDate, period) => {
  const params = {};
  if (period) params.period = period;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get('/analytics/summary', { params });
  return response.data;
};

export const getDashboardStats = async (startDate, endDate, period) => {
  const params = {};
  if (period) params.period = period;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get('/analytics/dashboard', { params });
  return response.data;
};

export const getEmailJobStats = async () => {
  const response = await api.get('/analytics/email-jobs');
  return response.data;
};

export const getLeadStats = async () => {
  const response = await api.get('/analytics/leads');
  return response.data;
};

// Hierarchical analytics
export const getHierarchicalAnalytics = async (period) => {
  const params = {};
  if (period) params.period = period;
  const response = await api.get('/analytics/hierarchy', { params });
  return response.data;
};

// Recent activity for notifications
export const getRecentActivity = async (limit = 10) => {
  const response = await api.get('/analytics/recent-activity', { params: { limit } });
  return response.data;
};

// Notifications (Persistent)
export const getNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
  const response = await api.get('/notifications', { params: { page, limit, unread: unreadOnly } });
  return response.data;
};

export const markNotificationRead = async (id = null) => {
  const response = await api.put('/notifications/read', { id });
  return response.data;
};

// Lead endpoints
export const uploadLeads = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload-leads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getLeads = async (page = 1, limit = 50, status, tags, sortBy) => {
  const params = { page, limit };
  if (status) params.status = status;
  if (tags) params.tags = tags;
  if (sortBy) params.sortBy = sortBy;
  const response = await api.get('/leads', { params });
  return response.data;
};

export const getLead = async (id) => {
  const response = await api.get(`/leads/${id}`);
  return response.data;
};

export const deleteLead = async (id) => {
  const response = await api.delete(`/leads/${id}`);
  return response.data;
};

export const scheduleEmails = async (leadIds, filter) => {
  const response = await api.post('/schedule-emails', { leadIds, filter });
  return response.data;
};

export const freezeLead = async (id, hours, resumeAfter) => {
  const response = await api.post(`/leads/${id}/freeze`, { hours, resumeAfter });
  return response.data;
};

export const unfreezeLead = async (id) => {
  const response = await api.post(`/leads/${id}/unfreeze`);
  return response.data;
};

export const convertLead = async (id) => {
  const response = await api.post(`/leads/${id}/convert`);
  return response.data;
};

export const skipFollowup = async (id, stepName) => {
  const response = await api.post(`/leads/${id}/skip`, { stepName });
  return response.data;
};

export const revertSkipFollowup = async (id, stepName) => {
  const response = await api.post(`/leads/${id}/revert-skip`, { stepName });
  return response.data;
};

export const deleteFollowupFromLead = async (id, stepName) => {
  const response = await api.delete(`/leads/${id}/followup/${encodeURIComponent(stepName)}`);
  return response.data;
};

export const retryLead = async (id) => {
  const response = await api.post(`/leads/${id}/retry`);
  return response.data;
};

export const updateLead = async (id, data) => {
  const response = await api.put(`/leads/${id}`, data);
  return response.data;
};

export const getAvailableSlots = async (id) => {
  const response = await api.get(`/leads/${id}/slots`);
  return response.data;
};

export const scheduleManually = async (id, time, emailType = null, title = null, templateId = null, emailBody = null) => {
  const response = await api.post(`/leads/${id}/manual-schedule`, { time, emailType, title, templateId, emailBody });
  return response.data;
};

// Email Job endpoints
export const getEmailJobs = (page = 1, limit = 20, status = '', view = '', startDate = '', endDate = '') => {
  const params = { page, limit };
  if (status) params.status = status;
  if (view) params.view = view;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get('/email-jobs', { params }).then(res => res.data);
};

export const getEmailJob = async (id) => {
  const response = await api.get(`/email-jobs/${id}`);
  return response.data;
};

export const retryEmailJob = async (jobId) => {
  const response = await api.post(`/email-jobs/${jobId}/retry`);
  return response.data;
};

// Resume a paused job (priority pause - no retry increment)
export const resumeEmailJob = async (jobId) => {
  const response = await api.post(`/email-jobs/${jobId}/resume`);
  return response.data;
};

export const deleteEmailJob = async (leadId, jobId) => {
    const response = await api.delete(`/leads/${leadId}/email-jobs/${jobId}`);
    return response.data;
};

export const rescheduleEmailJob = async (id, scheduledFor) => {
  const response = await api.put(`/email-jobs/${id}/reschedule`, { scheduledFor });
  return response.data;
};

export const pauseFollowups = async (id) => {
  const response = await api.post(`/leads/${id}/pause`);
  return response.data;
};

export const resumeFollowups = async (id) => {
  const response = await api.post(`/leads/${id}/resume`);
  return response.data;
};

export const cancelEmailJob = async (id, reason = null) => {
  const response = await api.delete(`/email-jobs/${id}`, { data: { reason } });
  return response.data;
};

// Tag endpoints
export const getAllTags = async () => {
  const response = await api.get('/tags');
  return response.data;
};

export const addTagsToLead = async (leadId, tags) => {
  const response = await api.post(`/leads/${leadId}/tags`, { tags });
  return response.data;
};

export const removeTagFromLead = async (leadId, tag) => {
  const response = await api.delete(`/leads/${leadId}/tags/${encodeURIComponent(tag)}`);
  return response.data;
};

export const bulkAddTags = async (leadIds, tags) => {
  const response = await api.post('/leads/bulk-tag', { leadIds, tags });
  return response.data;
};

export const bulkRemoveTags = async (leadIds, tags) => {
  const response = await api.post('/leads/bulk-untag', { leadIds, tags });
  return response.data;
};

// Settings endpoints
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.put('/settings', settings);
  return response.data;
};

export const getFollowups = async () => {
  const response = await api.get('/settings/followups');
  return response.data;
};

export const addFollowup = async (followup) => {
  const response = await api.post('/settings/followups', followup);
  return response.data;
};

export const updateFollowup = async (id, followup) => {
  const response = await api.put(`/settings/followups/${id}`, followup);
  return response.data;
};

export const deleteFollowup = async (id) => {
  const response = await api.delete(`/settings/followups/${id}`);
  return response.data;
};

export const reorderFollowups = async (followupIds) => {
  const response = await api.post('/settings/followups/reorder', { followupIds });
  return response.data;
};

export const clearBrevoLogs = async () => {
  const response = await api.post('/settings/clear-logs');
  return response.data;
};

// Paused dates and weekend days
export const getPausedDates = async () => {
  const response = await api.get('/settings/paused-dates');
  return response.data;
};

export const pauseDate = async (date) => {
  const response = await api.post('/settings/pause-date', { date });
  return response.data;
};

export const unpauseDate = async (date) => {
  const response = await api.post('/settings/unpause-date', { date });
  return response.data;
};

export const updateWeekendDays = async (weekendDays) => {
  const response = await api.post('/settings/weekend-days', { weekendDays });
  return response.data;
};

export const reschedulePausedEmails = async (date) => {
  const response = await api.post('/settings/reschedule-paused', { date });
  return response.data;
};

// Rate Limit endpoints
export const getRateLimits = async () => {
  const response = await api.get('/rate-limits');
  return response.data;
};

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

// Sync analytics from Brevo
export const syncAnalytics = async () => {
  const response = await api.post('/analytics/sync');
  return response.data;
};

// Get detailed analytics breakdown
export const getAnalyticsBreakdown = async (period) => {
  const params = {};
  if (period) params.period = period;
  const response = await api.get('/analytics/breakdown', { params });
  return response.data;
};

// Health check
export const getHealthStatus = async () => {
  const response = await axios.get('http://localhost:3000/health');
  return response.data;
};

// --- Templates ---
export const getTemplates = async () => {
    const response = await api.get('/templates');
    return response.data;
};

export const createTemplate = async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data;
};

export const updateTemplate = async (id, updates) => {
    const response = await api.put(`/templates/${id}`, updates);
    return response.data;
};

export const deleteTemplate = async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
};

// Test Brevo API connection
export const testBrevoConnection = async (apiKey = null) => {
    const response = await api.post('/settings/test-brevo', { apiKey });
    return response.data;
};

// --- Rulebook ---
export const getRulebook = async () => {
    const response = await api.get('/settings/rulebook');
    return response.data;
};

export const updateRulebook = async (updates) => {
    const response = await api.put('/settings/rulebook', updates);
    return response.data;
};

export const resetRulebook = async () => {
    const response = await api.post('/settings/rulebook/reset');
    return response.data;
};

export const getDefaultRulebook = async () => {
    const response = await api.get('/settings/rulebook/defaults');
    return response.data;
};

export default api;

