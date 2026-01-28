// components/NotificationCenter.jsx
// Notification center with TanStack Query for real-time updates
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, Check, Mail, AlertTriangle, User, Clock, X, CheckCircle, XCircle, Info } from 'lucide-react';
import gsap from 'gsap';
import { useNotifications, useMarkNotificationRead } from '../hooks/useApi';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // TanStack Query - auto-refreshes every 30s, cached
  const { data, isLoading } = useNotifications(1, 20);
  const markReadMutation = useMarkNotificationRead();
  
  const notifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  // Animate dropdown
  useEffect(() => {
    if (dropdownRef.current && isOpen) {
      gsap.fromTo(dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = useCallback((id) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const handleMarkAllRead = useCallback((e) => {
    e.stopPropagation();
    markReadMutation.mutate(null); // null = mark all
  }, [markReadMutation]);

  const formatTimeAgo = useCallback((dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds > 172800) {
       return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }, []);

  const getIcon = useCallback((type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} color="#22c55e" />;
      case 'error': return <XCircle size={16} color="#ef4444" />;
      case 'warning': return <AlertTriangle size={16} color="#eab308" />;
      default: return <Info size={16} color="#3b82f6" />;
    }
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 600,
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '360px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-glass)'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  opacity: markReadMutation.isPending ? 0.5 : 1
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={40} style={{ opacity: 0.2, marginBottom: '0.8rem' }} />
                <p style={{ margin: 0 }}>No recent notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    background: notification.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)',
                    cursor: notification.read ? 'default' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => !notification.read && (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)')}
                  onMouseLeave={e => !notification.read && (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.04)')}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {getIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '0.85rem', 
                      color: notification.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: notification.read ? 400 : 500,
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatTimeAgo(notification.createdAt || notification.timestamp)}
                      </span>
                      {!notification.read && (
                        <span style={{ 
                          width: '8px', height: '8px', 
                          borderRadius: '50%', background: 'var(--accent-primary)' 
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
