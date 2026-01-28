// contexts/RulebookContext.jsx
// Global rulebook provider with TanStack Query caching
import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../lib/queryClient';
import { getRulebook } from '../services/api';

const RulebookContext = createContext(null);

// Mail type mapping for internal type resolution
const MAIL_TYPE_PATTERNS = {
  initial: ['initial', 'initial email', 'initial_email'],
  followup: ['first followup', 'second followup', 'third followup', 'followup'],
  conditional: ['conditional:'],
  manual: ['manual']
};

// Default permissions fallback
const DEFAULT_PERMISSIONS = {
  mailTypes: {
    initial: {
      displayName: 'Initial Mail',
      canSkip: false,
      canCancel: true,
      canPause: false,
      canRetry: true,
      canReschedule: true
    },
    followup: {
      displayName: 'Followup Mail',
      canSkip: true,
      canCancel: false,
      canPause: true,
      canRetry: true,
      canReschedule: true
    },
    conditional: {
      displayName: 'Conditional Mail',
      canSkip: false,
      canCancel: true,
      canPause: false,
      canRetry: true,
      canReschedule: true
    },
    manual: {
      displayName: 'Manual Mail',
      canSkip: false,
      canCancel: true,
      canPause: false,
      canRetry: true,
      canReschedule: true
    }
  }
};

export function RulebookProvider({ children }) {
  const queryClient = useQueryClient();
  
  // Fetch rulebook with TanStack Query - cached for 10 minutes
  const { data: rulebook, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.settings.rulebook(),
    queryFn: getRulebook,
    ...cacheConfig.config,
    placeholderData: DEFAULT_PERMISSIONS,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Refresh rulebook manually
  const refreshRulebook = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.rulebook() });
  }, [queryClient]);

  // Resolve mail type from type string
  const resolveMailType = useCallback((typeString) => {
    if (!typeString) return 'followup';
    const t = typeString.toLowerCase();
    
    for (const [key, patterns] of Object.entries(MAIL_TYPE_PATTERNS)) {
      if (patterns.some(p => t.includes(p))) {
        return key;
      }
    }
    
    return 'followup'; // Default
  }, []);

  // Get permissions for a mail type
  const getMailTypePermissions = useCallback((typeString) => {
    const typeKey = resolveMailType(typeString);
    const rb = rulebook || DEFAULT_PERMISSIONS;
    
    if (!rb?.mailTypes?.[typeKey]) {
      return {
        canSkip: typeKey === 'followup',
        canCancel: typeKey !== 'followup',
        canPause: typeKey === 'followup',
        canResume: typeKey === 'followup',
        canRetry: true,
        canReschedule: true
      };
    }
    
    const mailType = rb.mailTypes[typeKey];
    return {
      canSkip: mailType.canSkip || false,
      canCancel: mailType.canCancel || false,
      canPause: mailType.canPause || false,
      canResume: mailType.canPause || false,
      canRetry: mailType.canRetry || false,
      canReschedule: mailType.canReschedule || false,
      displayName: mailType.displayName,
      priority: mailType.priority
    };
  }, [rulebook, resolveMailType]);

  // Check if specific action is allowed
  const canPerformAction = useCallback((action, typeString, status) => {
    const permissions = getMailTypePermissions(typeString);
    const activeStatuses = ['pending', 'scheduled', 'queued', 'rescheduled'];
    
    switch (action) {
      case 'skip':
        return permissions.canSkip && activeStatuses.includes(status);
      case 'cancel':
        return permissions.canCancel && [...activeStatuses, 'paused'].includes(status);
      case 'pause':
        return permissions.canPause && activeStatuses.includes(status);
      case 'resume':
        return permissions.canResume;
      case 'retry':
        const retriableStatuses = ['failed', 'bounced', 'hard_bounce', 'soft_bounce', 'cancelled', 'blocked', 'spam', 'error'];
        return permissions.canRetry && retriableStatuses.includes(status);
      case 'reschedule':
        const reschedulableStatuses = ['pending', 'scheduled', 'queued', 'rescheduled', 'deferred', 'failed', 'soft_bounce'];
        return permissions.canReschedule && reschedulableStatuses.includes(status);
      default:
        return false;
    }
  }, [getMailTypePermissions]);

  // Get all allowed actions for a job
  const getAllowedActions = useCallback((typeString, status) => {
    return {
      skip: canPerformAction('skip', typeString, status),
      cancel: canPerformAction('cancel', typeString, status),
      pause: canPerformAction('pause', typeString, status),
      resume: canPerformAction('resume', typeString, status),
      retry: canPerformAction('retry', typeString, status),
      reschedule: canPerformAction('reschedule', typeString, status)
    };
  }, [canPerformAction]);

  // Get status display info
  const getStatusInfo = useCallback((status) => {
    const rb = rulebook || DEFAULT_PERMISSIONS;
    if (!rb?.statuses?.[status]) {
      return { display: status, color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)' };
    }
    const statusDef = rb.statuses[status];
    return {
      display: statusDef.display,
      color: statusDef.color,
      bgColor: statusDef.bgColor,
      isTerminal: statusDef.isTerminal,
      canRetry: statusDef.canRetry
    };
  }, [rulebook]);

  const value = {
    rulebook: rulebook || DEFAULT_PERMISSIONS,
    loading,
    error: error?.message,
    refreshRulebook,
    resolveMailType,
    getMailTypePermissions,
    canPerformAction,
    getAllowedActions,
    getStatusInfo
  };

  return (
    <RulebookContext.Provider value={value}>
      {children}
    </RulebookContext.Provider>
  );
}

// Hook to use rulebook
export function useRulebook() {
  const context = useContext(RulebookContext);
  if (!context) {
    throw new Error('useRulebook must be used within a RulebookProvider');
  }
  return context;
}

export default RulebookContext;
