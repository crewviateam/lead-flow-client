// Firebase Messaging Service Worker
// This file MUST be in the public folder and named firebase-messaging-sw.js
// It handles background push notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'LeadFlow Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'leadflow-notification',
    requireInteraction: payload.data?.type === 'achievement' || payload.data?.type === 'error',
    data: {
      url: payload.data?.link || '/',
      ...payload.data
    },
    // Vibration pattern for mobile
    vibrate: [200, 100, 200],
    // Actions (buttons on notification)
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Navigate to the URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed');
  // Re-subscribe logic could be added here
});

// CRITICAL: Handle raw push events (for data-only messages)
// This ensures notifications work even if FCM strips the notification field
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push payload:', payload);
      
      // If there's no notification field, create one from data
      if (!payload.notification && payload.data) {
        const title = payload.data.title || 'LeadFlow Notification';
        const options = {
          body: payload.data.body || payload.data.message || 'You have a new notification',
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: payload.data.tag || 'leadflow-push',
          data: payload.data
        };
        
        event.waitUntil(
          self.registration.showNotification(title, options)
        );
      }
    } catch (e) {
      console.log('[Service Worker] Push data parse error:', e);
    }
  }
});

console.log('[Service Worker] Firebase messaging service worker initialized');
