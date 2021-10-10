importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');


let app = firebase.initializeApp({
    apiKey: "AIzaSyALqHMEQb4xklCnIqUP_hqbKXEo8u0zx8A",
    projectId: "atpenn-fe837",
    appId: "1:124658895102:web:1265e4bf88cb0839c33daf",
    messagingSenderId: "124658895102",
});

console.log("Setting up ATPenn push notification");

const messaging = firebase.messaging(app);

// messaging.onBackgroundMessage((payload) => {
//      console.log('[firebase-messaging-sw.js] Received background message ', payload);

//     const notificationTitle = 'Background Message from html';
//     const notificationOptions = {
//         body: 'Background Message body.',
//         icon: '/firebase-logo.png'
//     };

//     return self.registration.showNotification(notificationTitle,
//         notificationOptions);
// });