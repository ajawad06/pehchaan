import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCL-BPRbdTR_nwLh8frkicih9cRWsP9A6M",
  authDomain: "pehchaan-3bf79.firebaseapp.com",
  projectId: "pehchaan-3bf79",
  storageBucket: "pehchaan-3bf79.firebasestorage.app",
  messagingSenderId: "1061958413836",
  appId: "1:1061958413836:web:250f283dea81d6bce5c829",
  measurementId: "G-BDR9C3JKH2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const signIn = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Auth error", error);
    throw error;
  }
};
