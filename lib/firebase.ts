import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDl0LKspEod8C_ZsvamibDdne7YiXgos-E",
  authDomain: "featmy-c6e7e.firebaseapp.com",
  projectId: "featmy-c6e7e",
  storageBucket: "featmy-c6e7e.firebasestorage.app",
  messagingSenderId: "79916128482",
  appId: "1:79916128482:web:3f31fec268ff0073e526bb",
  measurementId: "G-S24EG1KQ56",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

auth
  .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => console.error("Erro ao configurar persistencia:", error));

export { firebase, auth, db };
