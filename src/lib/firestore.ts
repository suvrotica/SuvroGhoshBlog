import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtv8qUkhnuGAKX4lpnPWYBns-FfWVhmwk",
  authDomain: "blog-1b716.firebaseapp.com",
  projectId: "blog-1b716",
  storageBucket: "blog-1b716.appspot.com",
  messagingSenderId: "502711874678",
  appId: "1:502711874678:web:d115962d5b1822da829b57",
  measurementId: "G-RXMFV7KQXR"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };

