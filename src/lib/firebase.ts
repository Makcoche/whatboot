import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from "firebase/firestore";

// Configuración de Firebase
// Nota: en AI Studio, la configuración se lee de firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBQTmvtjlKL6covG5ekBP_D9AHNXsF5t70",
  authDomain: "gen-lang-client-0263267605.firebaseapp.com",
  projectId: "gen-lang-client-0263267605",
  storageBucket: "gen-lang-client-0263267605.firebasestorage.app",
  messagingSenderId: "792190266894",
  appId: "1:792190266894:web:44ae5bd713f6c3f8a3565f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
};
export type { FirebaseUser };
