// src/components/NotificationPermission.jsx
// Component for requesting push notification permission

import { useState } from 'react';
import { Bell, BellOff, X, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import './NotificationPermission.css';

export function NotificationPermission() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('notification_prompt_dismissed') === 'true';
  });
  
  const {
    isEnabled,
    isLoading,
    permissionStatus,
    enable,
    disable,
    isSupported,
    isDenied
  } = usePushNotifications();

  // Don't show if not supported, denied, already enabled, or dismissed
  if (!isSupported || isDenied || isEnabled || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const result = await enable();
    if (result.success) {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="notification-banner">
      <div className="notification-banner-content">
        <Bell className="notification-icon" size={20} />
        <div className="notification-text">
          <strong>Enable Push Notifications</strong>
          <span>Get notified about email events, bounces, and achievements</span>
        </div>
      </div>
      <div className="notification-actions">
        <button 
          className="btn-enable"
          onClick={handleEnable}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="spin" size={16} /> : 'Enable'}
        </button>
        <button 
          className="btn-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Settings toggle for notifications
 */
export function NotificationToggle() {
  const { isEnabled, isLoading, enable, disable, isSupported, isDenied } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="notification-toggle disabled">
        <BellOff size={18} />
        <span>Not supported in this browser</span>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="notification-toggle disabled">
        <BellOff size={18} />
        <span>Blocked - Enable in browser settings</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  return (
    <button 
      className={`notification-toggle ${isEnabled ? 'enabled' : ''}`}
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="spin" size={18} />
      ) : isEnabled ? (
        <Bell size={18} />
      ) : (
        <BellOff size={18} />
      )}
      <span>{isEnabled ? 'Notifications On' : 'Notifications Off'}</span>
    </button>
  );
}

export default NotificationPermission;
