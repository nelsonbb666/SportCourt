/**
 * ============================================================
 * utils.js — Validaciones de formularios y mensajes en pantalla
 * ============================================================
 * Sin dependencias externas. Todo el texto orientativo está en español.
 */

/* ---------- Mensajes en pantalla (sin alert) ---------- */

/**
 * Muestra un mensaje de éxito o error dentro de un contenedor .mensaje.
 * @param {HTMLElement} elemento - Contenedor con clase "mensaje".
 * @param {"exito"|"error"} tipo - Tipo de mensaje.
 * @param {string} texto - Mensaje a mostrar.
 */
export function mostrarMensaje(elemento, tipo, texto) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.remove("mensaje-exito", "mensaje-error");
  elemento.classList.add("visible", tipo === "exito" ? "mensaje-exito" : "mensaje-error");
}

/** Oculta el mensaje del contenedor indicado. */
export function limpiarMensaje(elemento) {
  if (!elemento) return;
  elemento.textContent = "";
  elemento.classList.remove("visible", "mensaje-exito", "mensaje-error");
}

/* ---------- Habilitar/deshabilitar botones mientras procesa ---------- */

/**
 * Deshabilita un botón y le cambia el texto (ej.: "Guardando...").
 * Devuelve una función para restaurarlo.
 */
export function bloquearBoton(boton, textoProcesando = "Procesando...") {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoProcesando;
  return () => {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  };
}

/* ---------- Validaciones ---------- */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO_REGEX = /^\+?[0-9\s-]{7,15}$/;

/** ¿El correo tiene un formato válido? */
export function esCorreoValido(correo) {
  return EMAIL_REGEX.test((correo || "").trim());
}

/** ¿El teléfono tiene un formato razonable (7 a 15 dígitos, opcional +)? */
export function esTelefonoValido(telefono) {
  return TELEFONO_REGEX.test((telefono || "").trim());
}

/**
 * Contraseña mínima: 8 caracteres, al menos una letra y un número.
 * (Las mayúsculas/minúsculas no son obligatorias, pero sí "letras y números".)
 */
export function esPasswordValida(password) {
  if (!password || password.length < 8) return false;
  const tieneLetra = /[A-Za-z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  return tieneLetra && tieneNumero;
}

/** Nombre completo: mínimo 3 caracteres y al menos una palabra sin dígitos. */
export function esNombreValido(nombre) {
  const limpio = (nombre || "").trim();
  return limpio.length >= 3 && /[A-Za-zÁÉÍÓÚÑáéíóúñ ]/.test(limpio);
}

/**
 * Valida el formulario de registro completo.
 * @returns {string|null} Mensaje de error en español o null si todo es válido.
 */
export function validarRegistro({ nombre, correo, telefono, password, confirm }) {
  if (!esNombreValido(nombre)) {
    return "El nombre completo es obligatorio (mínimo 3 caracteres).";
  }
  if (!correo.trim()) {
    return "El correo electrónico es obligatorio.";
  }
  if (!esCorreoValido(correo)) {
    return "El formato del correo electrónico no es válido.";
  }
  if (!telefono.trim()) {
    return "El teléfono es obligatorio.";
  }
  if (!esTelefonoValido(telefono)) {
    return "El teléfono no es válido (usa entre 7 y 15 dígitos, puedes iniciar con +).";
  }
  if (!esPasswordValida(password)) {
    return "La contraseña debe tener mínimo 8 caracteres, con letras y números.";
  }
  if (password !== confirm) {
    return "Las contraseñas no coinciden.";
  }
  return null;
}

/**
 * Valida el formulario de login (solo formato, sin credenciales).
 * @returns {string|null} Mensaje de error o null.
 */
export function validarLogin({ correo, password }) {
  if (!correo.trim() || !esCorreoValido(correo)) {
    return "Ingresa un correo electrónico válido.";
  }
  if (!password) {
    return "Ingresa tu contraseña.";
  }
  return null;
}

/* ---------- Traducción de códigos de error de Firebase ---------- */

const MENSAJES_FIREBASE = {
  "auth/email-already-in-use":
    "Este correo ya está registrado. Inicia sesión o recupera tu contraseña.",
  "auth/invalid-email": "El formato del correo electrónico no es válido.",
  "auth/weak-password":
    "La contraseña es muy débil: usa mínimo 8 caracteres, con letras y números.",
  "auth/wrong-password": "Las credenciales no son válidas.",
  "auth/invalid-credential": "Las credenciales no son válidas.",
  "auth/user-not-found": "Las credenciales no son válidas.",
  "auth/too-many-requests":
    "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
  "auth/network-request-failed":
    "Error de conexión. Revisa tu internet e inténtalo nuevamente.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada. Contacta al administrador.",
  "auth/requires-recent-login":
    "Por seguridad, vuelve a iniciar sesión antes de cambiar la contraseña.",
  "auth/operation-not-allowed":
    "El registro con correo/contraseña no está habilitado en Firebase.",
  "auth/missing-password": "Ingresa tu contraseña actual.",
  "auth/missing-email": "Ingresa tu correo electrónico."
};

/**
 * Convierte un error de Firebase (u otro) en un mensaje amigable en español.
 * @param {Error|{code?: string}} error
 * @param {string} [mensajeGenerico] - Texto alternativo si el código no está mapeado.
 */
export function traducirErrorFirebase(error, mensajeGenerico = "Ocurrió un error inesperado. Inténtalo de nuevo.") {
  const codigo = (error && error.code) || "";
  if (MENSAJES_FIREBASE[codigo]) return MENSAJES_FIREBASE[codigo];
  // Errores de red / Firestore sin código conocido
  if (codigo.startsWith("permission-denied")) {
    return "No tienes permisos para realizar esta acción.";
  }
  return mensajeGenerico;
}
