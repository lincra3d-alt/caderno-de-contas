import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCeXqEwvnQGBE7FQ7fe44auUbRDGfuV1s",
  authDomain: "financas-804c0.firebaseapp.com",
  projectId: "financas-804c0",
  storageBucket: "financas-804c0.firebasestorage.app",
  messagingSenderId: "800829839601",
  appId: "1:800829839601:web:062a32b5a0e2f63fd3b150",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}
