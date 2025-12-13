// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "meet-app-a15e9.firebaseapp.com",
  projectId: "meet-app-a15e9",
  storageBucket: "meet-app-a15e9.firebasestorage.app",
  messagingSenderId: "185343907888",
  appId: "1:185343907888:web:563bc7eb669b753cd3b5f5",
  measurementId: "G-BQKRTX3CSW"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);