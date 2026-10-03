// Firebase config — to be added.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { 
  getFirestore 
 } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc3aMkze1st0gi7ZUFgd0wwejDkOFt9HE",
  authDomain: "pumpline-4319e.firebaseapp.com",
  projectId: "pumpline-4319e",
  storageBucket: "pumpline-4319e.firebasestorage.app",
  messagingSenderId: "724168946850",
  appId: "1:724168946850:web:c4454c0e676e308e2d93fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Make available to other JavaScript files
window.firebaseApp = app;
window.auth = auth;
window.db = db;

console.log("Firebase connected successfully!");