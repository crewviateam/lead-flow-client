// src/lib/firebase.js
// Firebase configuration and messaging initialization

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../services/api';

// ============================================
// FIREBASE CONFIG - REPLACE WITH YOUR VALUES
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDnGUZNridNsWQ1U1umMG1or93MIPrw5v8",
  authDomain: "lead-flow-c4d89.firebaseapp.com",
  projectId: "lead-flow-c4d89",
  storageBucket: "lead-flow-c4d89.firebasestorage.app",
  messagingSenderId: "334200633730",
  appId: "1:334200633730:web:73c652b0e7a1ac9d31779b",
  measurementId: "G-GBZ8TRNHKY"
};

// VAPID KEY - Get from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = "BEDaKWxJZeQpEjc3VQKOICfbenY7FC-rHLPV-CzLZ_V9pNcYSBuU0R7XLDJS487TRrjfQzPUluPkvSVYvq5qHJo"
const API_URL = API_BASE_URL;

// Initialize
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  console.log('[Firebase] Initialized');
} catch (error) {
  console.warn('[Firebase] Init failed:', error.message);
}

/**
 * Get FCM token
 */
export async function getFCMToken() {
  try {
    if (!messaging) return null;
    if (Notification.permission === 'denied') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    return token || null;
  } catch (error) {
    console.error('[Firebase] Token error:', error);
    return null;
  }
}

/**
 * Register token with backend
 */
export async function registerTokenWithBackend(token) {
  try {
    const response = await fetch(`${API_URL}/notifications/device-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', token, platform: 'web' })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('[Firebase] Register failed:', error);
    return false;
  }
}

/**
 * Unregister token
 */
export async function unregisterToken(token) {
  try {
    await fetch(`${API_URL}/notifications/device-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('[Firebase] Unregister failed:', error);
  }
}

/**
 * Setup foreground message handler
 */
export function setupForegroundHandler() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'LeadFlow';
    const body = payload.notification?.body || 'New notification';
    const type = payload.data?.type || 'info';

    const icons = { achievement: '🏆', success: '✅', error: '❌', warning: '⚠️', info: '📧' };
    
    if (type === 'error') {
      toast.error(`${title}: ${body}`, { icon: icons[type] });
    } else if (type === 'success' || type === 'achievement') {
      toast.success(`${title}: ${body}`, { icon: icons[type] });
    } else {
      toast(`${title}: ${body}`, { icon: icons[type] || '📧' });
    }
  });
}

/**
 * Request permission and setup FCM
 */
export async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) return { granted: false, token: null };
    if (Notification.permission === 'denied') return { granted: false, token: null };

    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const token = await getFCMToken();
      if (token) {
        await registerTokenWithBackend(token);
        localStorage.setItem('fcm_token', token);
      }
      return { granted: true, token };
    }

    return { granted: false, token: null };
  } catch (error) {
    console.error('[Firebase] Permission error:', error);
    return { granted: false, token: null };
  }
}

export function isNotificationsEnabled() {
  return Notification.permission === 'granted' && localStorage.getItem('fcm_token');
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export { messaging };
