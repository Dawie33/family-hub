importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCXODubch_fM82Ik33TVbYQnR3Cc3VQnu8',
  authDomain: 'family-hub-c8e78.firebaseapp.com',
  projectId: 'family-hub-c8e78',
  messagingSenderId: '78165536381',
  appId: '1:78165536381:web:6ccb1dcd77a6eba96b8b14',
});

const messaging = firebase.messaging();

// Gestion des notifications reçues en arrière-plan
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title || 'FamilyHub', {
    body: body || '',
    icon: icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data,
  });
});
