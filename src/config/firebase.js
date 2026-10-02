// Firebase configuration
// Replace these placeholder values with your actual Firebase project credentials
// after creating a project at https://console.firebase.google.com

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// Set to true to use Firebase, false to use local demo mode
export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';

// OCR Provider: 'mock' | 'tesseract' | 'google-vision'
export const OCR_PROVIDER = import.meta.env.VITE_OCR_PROVIDER || 'mock';
