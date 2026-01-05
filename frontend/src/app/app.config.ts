import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Import Firebase modules
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';

// Firebase configuration object
const firebaseConfig = {
  apiKey: 'AIzaSyCChFLlm7ejg2GKZHm2hwadjZo2EiCKx7I',
  authDomain: 'bifrost-room-booking.firebaseapp.com',
  projectId: 'bifrost-room-booking',
  storageBucket: 'bifrost-room-booking.firebasestorage.app',
  messagingSenderId: '742334529442',
  appId: '1:742334529442:web:b239630eef5ed005effcfb',
  measurementId: 'G-R8FLVY5SFB',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Initialize Firebase app directly as a provider
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    // Provide Firebase services (Firestore, Auth, etc.) directly as providers
    provideFirestore(() => getFirestore()),
    // Optional: If you're using Authentication
    provideAuth(() => getAuth()),
    // Add other Firebase services as needed, e.g., provideStorage(() => getStorage())
  ],
};
