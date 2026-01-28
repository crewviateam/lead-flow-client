// lib/queryClient.js
// TanStack Query configuration for optimal caching and performance
// Production-ready settings with intelligent stale times

import { QueryClient } from '@tanstack/react-query';

// Query client with production-optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Don't refetch on window focus in production (can be noisy)
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect for real-time accuracy
      refetchOnReconnect: true,
      
      // Network-mode: always attempt fetch, fall back to cache
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      
      // Network-mode: require network for mutations
      networkMode: 'online',
    },
  },
});

// Query key factory - ensures consistent keys across the app
export const queryKeys = {
  // Leads
  leads: {
    all: () => ['leads'],
    list: (filters) => ['leads', 'list', filters],
    detail: (id) => ['leads', 'detail', id],
    slots: (id) => ['leads', 'slots', id],
  },
  
  // Email Jobs
  emailJobs: {
    all: () => ['emailJobs'],
    list: (filters) => ['emailJobs', 'list', filters],
    detail: (id) => ['emailJobs', 'detail', id],
  },
  
  // Schedule
  schedule: {
    all: () => ['schedule'],
    date: (date, timezone) => ['schedule', date, timezone],
  },
  
  // Dashboard & Analytics
  dashboard: {
    all: () => ['dashboard'],
    stats: (period) => ['dashboard', 'stats', period],
    analytics: (period) => ['dashboard', 'analytics', period],
    hierarchy: (period) => ['dashboard', 'hierarchy', period],
  },
  
  // Templates
  templates: {
    all: () => ['templates'],
    detail: (id) => ['templates', id],
  },
  
  // Settings
  settings: {
    all: () => ['settings'],
    general: () => ['settings', 'general'],
    followups: () => ['settings', 'followups'],
    rulebook: () => ['settings', 'rulebook'],
    templates: () => ['settings', 'templates'],
    pausedDates: () => ['settings', 'pausedDates'],
  },
  
  // Notifications
  notifications: {
    all: () => ['notifications'],
    list: (page) => ['notifications', 'list', page],
    unread: () => ['notifications', 'unread'],
  },
  
  // Tags
  tags: {
    all: () => ['tags'],
  },
  
  // Health
  health: () => ['health'],
};

// Cache time configurations for different data types
export const cacheConfig = {
  // Frequently changing data - short stale time
  realtime: {
    staleTime: 10 * 1000,      // 10 seconds
    gcTime: 2 * 60 * 1000,     // 2 minutes
  },
  
  // Standard data - moderate stale time
  standard: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000,     // 5 minutes
  },
  
  // Rarely changing data - long stale time
  static: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  },
  
  // Configuration data - very long stale time
  config: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000,    // 1 hour
  },
};

export default queryClient;
