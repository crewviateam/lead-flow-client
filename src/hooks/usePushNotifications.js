// src/hooks/usePushNotifications.js
// React hook for push notification management

import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  setupForegroundHandler,
  isNotificationsEnabled,
  getPermissionStatus,
  unregisterToken
} from '../lib/firebase';

export function usePushNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [error, setError] = useState(null);

  useEffect(() => {
    setPermissionStatus(getPermissionStatus());
    setIsEnabled(isNotificationsEnabled());

    if (getPermissionStatus() === 'granted') {
      setupForegroundHandler();
    }
  }, []);

  const enable = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestNotificationPermission();
      if (result.granted) {
        setIsEnabled(true);
        setPermissionStatus('granted');
        setupForegroundHandler();
        return { success: true, token: result.token };
      }
      setPermissionStatus(getPermissionStatus());
      return { success: false };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('fcm_token');
      if (token) {
        await unregisterToken(token);
        localStorage.removeItem('fcm_token');
      }
      setIsEnabled(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isEnabled,
    isLoading,
    permissionStatus,
    error,
    enable,
    disable,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isDenied: permissionStatus === 'denied'
  };
}

export default usePushNotifications;
