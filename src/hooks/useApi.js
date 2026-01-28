// hooks/useApi.js
// Custom React Query hooks for all API operations
// Provides caching, deduplication, and optimistic updates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../lib/queryClient';
import * as api from '../services/api';

// ============================================
// DASHBOARD & ANALYTICS HOOKS
// ============================================

export function useDashboardStats(period = '7d', startDate, endDate) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(period),
    queryFn: () => api.getDashboardStats(startDate, endDate, period),
    ...cacheConfig.standard,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useAnalyticsSummary(period = '7d', startDate, endDate) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics(period),
    queryFn: () => api.getAnalyticsSummary(startDate, endDate, period),
    ...cacheConfig.standard,
  });
}

export function useHierarchicalAnalytics(period) {
  return useQuery({
    queryKey: queryKeys.dashboard.hierarchy(period),
    queryFn: () => api.getHierarchicalAnalytics(period),
    ...cacheConfig.standard,
  });
}

// ============================================
// LEADS HOOKS
// ============================================

export function useLeads(page = 1, limit = 50, status, tags, sortBy) {
  return useQuery({
    queryKey: queryKeys.leads.list({ page, limit, status, tags, sortBy }),
    queryFn: () => api.getLeads(page, limit, status, tags, sortBy),
    ...cacheConfig.standard,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

export function useLead(id) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => api.getLead(id),
    ...cacheConfig.realtime,
    enabled: !!id, // Only fetch if id exists
  });
}

export function useLeadSlots(id) {
  return useQuery({
    queryKey: queryKeys.leads.slots(id),
    queryFn: () => api.getAvailableSlots(id),
    ...cacheConfig.realtime,
    enabled: !!id,
  });
}

// Lead Mutations
export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => api.updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useFreezeLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, hours, resumeAfter }) => api.freezeLead(id, hours, resumeAfter),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function useUnfreezeLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.unfreezeLead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.convertLead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useSkipFollowup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, stepName }) => api.skipFollowup(id, stepName),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function useRevertSkipFollowup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, stepName }) => api.revertSkipFollowup(id, stepName),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function usePauseFollowups() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.pauseFollowups(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function useResumeFollowups() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.resumeFollowups(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });
}

export function useScheduleManually() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, time, emailType, title, templateId, emailBody }) => 
      api.scheduleManually(id, time, emailType, title, templateId, emailBody),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    },
  });
}

export function useRetryLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.retryLead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    },
  });
}

// ============================================
// EMAIL JOBS HOOKS
// ============================================

export function useEmailJobs(page = 1, limit = 20, status, view, startDate, endDate) {
  return useQuery({
    queryKey: queryKeys.emailJobs.list({ page, limit, status, view, startDate, endDate }),
    queryFn: () => api.getEmailJobs(page, limit, status, view, startDate, endDate),
    ...cacheConfig.realtime,
    placeholderData: (previousData) => previousData,
  });
}

export function useRetryEmailJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId) => api.retryEmailJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    },
  });
}

export function useCancelEmailJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }) => api.cancelEmailJob(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    },
  });
}

export function useRescheduleEmailJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, scheduledFor }) => api.rescheduleEmailJob(id, scheduledFor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    },
  });
}

export function useDeleteEmailJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, jobId }) => api.deleteEmailJob(leadId, jobId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
    },
  });
}

// ============================================
// SCHEDULE HOOKS
// ============================================

export function useSchedule(date, timezone) {
  return useQuery({
    queryKey: queryKeys.schedule.date(date, timezone),
    queryFn: async () => {
      const response = await api.default.get('/schedule', { 
        params: { date, timezone } 
      });
      return response.data;
    },
    ...cacheConfig.realtime,
    enabled: !!date,
  });
}

// ============================================
// SETTINGS HOOKS
// ============================================

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.general(),
    queryFn: api.getSettings,
    ...cacheConfig.config,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings) => api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useFollowups() {
  return useQuery({
    queryKey: queryKeys.settings.followups(),
    queryFn: api.getFollowups,
    ...cacheConfig.config,
  });
}

export function useRulebook() {
  return useQuery({
    queryKey: queryKeys.settings.rulebook(),
    queryFn: api.getRulebook,
    ...cacheConfig.config,
  });
}

export function usePausedDates() {
  return useQuery({
    queryKey: queryKeys.settings.pausedDates(),
    queryFn: api.getPausedDates,
    ...cacheConfig.config,
  });
}

// ============================================
// TEMPLATES HOOKS
// ============================================

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.settings.templates(),
    queryFn: api.getTemplates,
    ...cacheConfig.static,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }) => api.updateTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.templates() });
    },
  });
}

// ============================================
// NOTIFICATIONS HOOKS
// ============================================

export function useNotifications(page = 1, limit = 20, unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list(page),
    queryFn: () => api.getNotifications(page, limit, unreadOnly),
    ...cacheConfig.realtime,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => api.markNotificationRead(id),
    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.notifications.all });
      
      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications?.map(n => 
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, (old.unreadCount || 1) - 1),
          };
        }
      );
      
      return { previousData };
    },
    onError: (err, id, context) => {
      // Rollback on error
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
  });
}

// ============================================
// TAGS HOOKS
// ============================================

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: api.getAllTags,
    ...cacheConfig.static,
  });
}

export function useAddTagsToLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, tags }) => api.addTagsToLead(leadId, tags),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useRemoveTagFromLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, tag }) => api.removeTagFromLead(leadId, tag),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
    },
  });
}

// ============================================
// UPLOAD HOOKS
// ============================================

export function useUploadLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file) => api.uploadLeads(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

// ============================================
// HEALTH CHECK HOOKS
// ============================================

export function useHealthStatus() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.getHealthStatus,
    ...cacheConfig.realtime,
    refetchInterval: 60 * 1000,
  });
}
