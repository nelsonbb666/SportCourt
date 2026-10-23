/**
 * ============================================================
 * perfil.js — Lectura y edición del perfil de usuario
 * ============================================================
 * El perfil vive en Firestore: colección "usuarios", documento con el UID.
 * Campos editables: nombre y teléfono. El correo es solo lectura.
 * Cambio de contraseña: requiere reautenticación con la contraseña actual.
 */

import { auth, db } from "./firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * Lee el documento de perfil del usuario autenticado.
 * @returns {Promise<object|null>} Datos del perfil o null si no existe.
 */
export async function obtenerPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Actualiza nombre y teléfono en Firestore (merge: no borra otros campos).
 * El correo NO se modifica desde aquí.
 */
export async function actualizarPerfil(uid, { nombre, telefono }) {
  await updateDoc(doc(db, "usuarios", uid), {
    nombre: nombre.trim(),
    telefono: telefono.trim()
  });
}

/**
 * Cambia la contraseña tras verificar la contraseña actual (reautenticación).
 * Requiere sesión reciente; Firebase lanzará auth/requires-recent-login
 * si el usuario lleva mucho tiempo conectado (guard.js/utils lo traduce).
 */
export async function cambiarPassword({ passwordActual, passwordNueva }) {
  const usuario = auth.currentUser;
  if (!usuario || !usuario.email) {
    throw Object.assign(new Error("No hay sesión activa."), { code: "auth/internal-error" });
  }

  const credencial = EmailAuthProvider.credential(usuario.email, passwordActual);
  await reauthenticateWithCredential(usuario, credencial); // Verifica la clave actual.
  await updatePassword(usuario, passwordNueva);            // Solo en Auth, nunca en Firestore.
}
