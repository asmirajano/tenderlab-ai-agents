import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtrmtw_VTU_gpIiokn0yonLiEMdgmGJms",
  authDomain: "tenderlab-ai-agents.firebaseapp.com",
  projectId: "tenderlab-ai-agents",
  storageBucket: "tenderlab-ai-agents.firebasestorage.app",
  messagingSenderId: "398180283651",
  appId: "1:398180283651:web:5944433d352ce40b322536",
};

export type FirebaseClientServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let services: FirebaseClientServices | null = null;

export function getFirebaseClientServices(): FirebaseClientServices | null {
  if (typeof window === "undefined") return null;
  if (services) return services;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  services = { app, auth: getAuth(app), db: getFirestore(app) };
  return services;
}
