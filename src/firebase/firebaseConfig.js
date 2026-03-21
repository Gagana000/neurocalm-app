import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCIDjdLoyj_GAYzOuVet2YOcaT55tT91HU",
  authDomain: "neurocalm-f2900.firebaseapp.com",
  projectId: "neurocalm-f2900",
  storageBucket: "neurocalm-f2900.firebasestorage.app",
  messagingSenderId: "302824596743",
  appId: "1:302824596743:web:4826a7584ff9ee36a051a2",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
