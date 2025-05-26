import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAaFqqnTDn5XCuSUue7Zp7LpEdQZuUFs5I",
  authDomain: "singms24.firebaseapp.com",
  projectId: "singms24",
  storageBucket: "singms24.appspot.com",
  messagingSenderId: "670247821601",
  appId: "1:670247821601:web:f209853d5fac4cde755e60",
  measurementId: "G-ZEFXXTGBFX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Conditionally enable analytics
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export { app };
