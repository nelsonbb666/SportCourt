/**
 * ============================================================
 * firebase-config.js — Inicialización de Firebase (SDK modular v10+)
 * ============================================================
 *
 * 👉 DONDE PEGAR TU CONFIGURACIÓN REAL:
 *    1. Ve a https://console.firebase.google.com → tu proyecto →
 *       "Project settings" (⚙️) → "Your apps" → app Web.
 *    2. Copia el objeto `firebaseConfig` que muestra la consola.
 *    3. Reemplaza los valores de ejemplo (placeholders) de abajo
 *       por los tuyos. NO subas credenciales sensibles: la API key
 *       de Firebase es pública por diseño; la seguridad real se
 *       aplica en firestore.rules y en los dominios autorizados.
 *
 * Requisitos en la consola de Firebase:
 *    - Authentication → Sign-in method → Email/Password habilitado.
 *    - Firestore Database creado, con las reglas de /firestore.rules publicadas.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ PLACEHOLDERS: reemplázalos por la configuración real de tu proyecto Firebase.
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",                        // ej.: "AIzaSyD..."
  authDomain: "TU_PROYECTO.firebaseapp.com",        // ej.: "reserva-canchas.firebaseapp.com"
  projectId: "TU_PROJECT_ID",                        // ej.: "reserva-canchas"
  storageBucket: "TU_PROYECTO.appspot.com",         // ej.: "reserva-canchas.appspot.com"
  messagingSenderId: "TU_SENDER_ID",                 // ej.: "123456789012"
  appId: "TU_APP_ID"                                 // ej.: "1:123456789012:web:abc123"
};

// Inicialización única y expuesta a toda la aplicación.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
