import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAJcyfrrskST3-OQ0f7vwnDnLaHvJJtgls',
  authDomain: 'star-wars-collection-hj.firebaseapp.com',
  projectId: 'star-wars-collection-hj',
  storageBucket: 'star-wars-collection-hj.firebasestorage.app',
  messagingSenderId: '176099065417',
  appId: '1:176099065417:web:bcc1d4989c25c47cf44998',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
