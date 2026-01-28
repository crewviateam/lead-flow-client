// contexts/SocketContext.jsx
// WebSocket context for real-time updates
// Integrates with TanStack Query for automatic cache invalidation

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Reconnection settings
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const queryClient = useQueryClient();

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      reconnectAttempts.current++;
    });

    // ===== REAL-TIME EVENT HANDLERS =====

    // Lead updates
    socketInstance.on('lead:updated', (data) => {
      console.log('[Socket] Lead updated:', data.leadId);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(data.leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    });

    socketInstance.on('lead:created', (data) => {
      console.log('[Socket] Lead created:', data.leadId);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    });

    socketInstance.on('lead:deleted', (data) => {
      console.log('[Socket] Lead deleted:', data.leadId);
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    });

    // Email job updates
    socketInstance.on('emailJob:updated', (data) => {
      console.log('[Socket] Email job updated:', data.jobId, data.status);
      if (data.leadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(data.leadId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    });

    socketInstance.on('emailJob:created', (data) => {
      console.log('[Socket] Email job created:', data.jobId);
      if (data.leadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(data.leadId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    });

    socketInstance.on('emailJob:sent', (data) => {
      console.log('[Socket] Email sent:', data.jobId);
      if (data.leadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(data.leadId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.emailJobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    });

    // Analytics updates
    socketInstance.on('analytics:updated', () => {
      console.log('[Socket] Analytics updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    });

    // Notifications
    socketInstance.on('notification:new', (data) => {
      console.log('[Socket] New notification:', data.type);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    // Schedule updates
    socketInstance.on('schedule:updated', () => {
      console.log('[Socket] Schedule updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
    });

    // Settings updates
    socketInstance.on('settings:updated', () => {
      console.log('[Socket] Settings updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('lead:updated');
      socketInstance.off('lead:created');
      socketInstance.off('lead:deleted');
      socketInstance.off('emailJob:updated');
      socketInstance.off('emailJob:created');
      socketInstance.off('emailJob:sent');
      socketInstance.off('analytics:updated');
      socketInstance.off('notification:new');
      socketInstance.off('schedule:updated');
      socketInstance.off('settings:updated');
      socketInstance.disconnect();
    };
  }, [queryClient]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socket && !isConnected) {
      socket.connect();
    }
  }, [socket, isConnected]);

  const value = {
    socket,
    isConnected,
    connectionError,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to use socket
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
