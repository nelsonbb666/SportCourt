/**
 * ============================================================
 * auth.js — Registro, inicio de sesión, cierre y recuperación
 * ============================================================
 * Módulo ES. Cada página importa solo las funciones que necesita.
 * NO se guardan contraseñas en Firestore: el perfil almacena
 * nombre, teléfono, correo y fecha de creación.
 */

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- 1. Registro de usuario ---------- */

/**
 * Crea la cuenta en Firebase Auth y guarda el perfil en Firestore
 * (colección "usuarios", documento con el UID).
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function registrarUsuario({ nombre, correo, telefono, password }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, correo.trim(), password);

    // Documento de perfil: id = UID del usuario recién creado.
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      correo: correo.trim().toLowerCase(),
      rol: "usuario", // Sprint #2: "usuario" | "admin" (el admin se asigna a mano en Firebase Console)
      fechaCreacion: serverTimestamp()
      // ⚠️ Nunca guardar la contraseña aquí.
    });

    // El registro deja sesión activa; la cerramos para dirigir al login
    // tal como pide el criterio de aceptación ("redirigir al inicio de sesión").
    await signOut(auth);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/* ---------- 2. Inicio de sesión ---------- */

/**
 * Valida credenciales contra Firebase Auth.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function iniciarSesion({ correo, password }) {
  try {
    await signInWithEmailAndPassword(auth, correo.trim(), password);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/* ---------- 3. Cierre de sesión ---------- */

export async function cerrarSesion() {
  await signOut(auth);
}

/* ---------- 4. Recuperación de contraseña ---------- */

/**
 * Envía el correo de restablecimiento con sendPasswordResetEmail.
 * Siempre responde ok para mostrar el mensaje genérico de seguridad,
 * sin revelar si el correo existe o no.
 * @returns {Promise<{ok: boolean}>}
 */
export async function recuperarPassword(correo) {
  try {
    await sendPasswordResetEmail(auth, correo.trim());
  } catch (_) {
    /* Se ignora deliberadamente: siempre mostramos el mensaje genérico. */
  }
  return { ok: true };
}
