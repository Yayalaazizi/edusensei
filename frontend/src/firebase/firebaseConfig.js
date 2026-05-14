import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBlEio_gChAcIwqn7Yj_xdG-GWcCTQBYqU",
  authDomain: "educhat-45772.firebaseapp.com",
  projectId: "educhat-45772",
  storageBucket: "educhat-45772.firebasestorage.app",
  messagingSenderId: "568981881827",
  appId: "1:568981881827:web:e2bec56562fd787dc056d6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);