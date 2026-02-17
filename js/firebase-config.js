/**
 * Firebase Configuration
 * Initialize Firebase app and export Firestore instance
 */

const firebaseConfig = {
  apiKey: "AIzaSyCUANbzNpbH9NvYu9qAR-n-7nD4ozC77O0",
  authDomain: "our-journal-47372.firebaseapp.com",
  projectId: "our-journal-47372",
  storageBucket: "our-journal-47372.firebasestorage.app",
  messagingSenderId: "393352800637",
  appId: "1:393352800637:web:41cb6f7482b17fa4880414",
  measurementId: "G-PQ8RPTTH1C"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Export for use in other modules
window.firebaseApp = app;
window.firebaseDb = db;

console.log('[FIREBASE] Initialized successfully');
