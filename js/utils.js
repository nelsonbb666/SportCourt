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

/* ---------- Helpers de fecha y hora (Sprint #2) ---------- */

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** ¿Formato "YYYY-MM-DD" y fecha real? */
export function esFechaValida(fecha) {
  if (!FECHA_REGEX.test(fecha || "")) return false;
  const d = new Date(`${fecha}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

/** ¿Formato "HH:mm"? */
export function esHoraValida(hora) {
  return HORA_REGEX.test(hora || "");
}

/** Convierte "HH:mm" a minutos desde la medianoche (número o NaN). */
export function horaAMinutos(hora) {
  if (!esHoraValida(hora)) return NaN;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Convierte minutos desde la medianoche a "HH:mm". */
export function minutosAHora(minutos) {
  const h = Math.floor(minutos / 60) % 24;
  const m = Math.round(minutos) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Fecha local de hoy como "YYYY-MM-DD" (para el atributo min de <input type=date>). */
export function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** ¿La fecha "YYYY-MM-DD" es anterior a hoy (en hora local)? */
export function esFechaPasada(fecha) {
  return esFechaValida(fecha) && fecha < hoyISO();
}

/** Formatea "YYYY-MM-DD" a un texto legible en español (ej.: "sábado, 25 de octubre de 2026"). */
export function formatearFechaLarga(fecha) {
  if (!esFechaValida(fecha)) return fecha;
  const d = new Date(`${fecha}T12:00:00`);
  return d.toLocaleDateString("es", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* ============================================================
   Configuración y helpers del Sprint #3 (reservas)
   ============================================================ */

/**
 * Configuración general del sistema.
 * minHorasAnticipacionCancelacion: horas mínimas de anticipación para
 * poder cancelar una reserva. Por defecto 0 = regla desactivada.
 * Cámbiala aquí o en la consola con:
 *   CONSTANTE.config.minHorasAnticipacionCancelacion = 24;
 */
export const CONSTANTE = {
  config: {
    minHorasAnticipacionCancelacion: 0
  }
};

/** ¿Ya pasó el instante fecha("YYYY-MM-DD") + hora("HH:mm") en hora local? */
export function fechaHoraEsPasada(fecha, hora) {
  if (!esFechaValida(fecha) || !esHoraValida(hora)) return true; // dato inválido → se considera no reservable
  const inicio = new Date(`${fecha}T${hora}:00`);
  return inicio.getTime() <= Date.now();
}

/** Minutos transcurridos entre ahora y el inicio de fecha+hora (negativo si ya pasó). */
export function minutosHasta(fecha, hora) {
  const inicio = new Date(`${fecha}T${hora}:00`).getTime();
  return Math.floor((inicio - Date.now()) / 60000);
}

/* ---------- Modal de confirmación propio (sin window.confirm) ---------- */

let resolveModal = null;

function crearEstructuraModal() {
  if (document.getElementById("modal-fondo")) return;
  const contenedor = document.createElement("div");
  contenedor.innerHTML = `
    <div class="modal-fondo" id="modal-fondo" hidden>
      <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h3 id="modal-titulo"></h3>
        <div id="modal-mensaje"></div>
        <div class="modal-acciones">
          <button type="button" class="btn btn-contorno" id="modal-cancelar">Cancelar</button>
          <button type="button" class="btn btn-peligro" id="modal-aceptar">Confirmar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(contenedor.firstElementChild);

  const fondo = document.getElementById("modal-fondo");
  document.getElementById("modal-cancelar").addEventListener("click", () => cerrarModal(false));
  document.getElementById("modal-aceptar").addEventListener("click", () => cerrarModal(true));
  fondo.addEventListener("click", (e) => {
    if (e.target === fondo) cerrarModal(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !fondo.hidden) cerrarModal(false);
  });
}

function cerrarModal(valor) {
  const fondo = document.getElementById("modal-fondo");
  if (fondo) fondo.hidden = true;
  if (resolveModal) {
    resolveModal(valor);
    resolveModal = null;
  }
}

/**
 * Rellena el cuerpo del modal de forma SEGURA (sin innerHTML con datos):
 * - `mensaje` siempre va como texto plano (textContent).
 * - `contenido` (opcional): array de pares { etiqueta, valor } que se pintan
 *   como lista de resumen (usado al confirmar una reserva).
 */
function pintarContenidoModal(mensaje, contenido) {
  const cuerpo = document.getElementById("modal-mensaje");
  cuerpo.innerHTML = "";

  if (mensaje) {
    const p = document.createElement("p");
    p.className = "modal-texto";
    p.textContent = mensaje;
    cuerpo.appendChild(p);
  }

  if (Array.isArray(contenido) && contenido.length) {
    const dl = document.createElement("dl");
    dl.className = "modal-resumen";
    for (const { etiqueta, valor } of contenido) {
      const dt = document.createElement("dt");
      dt.textContent = etiqueta;
      const dd = document.createElement("dd");
      dd.textContent = valor; // textContent → escapa cualquier dato dinámico (anti-XSS)
      dl.append(dt, dd);
    }
    cuerpo.appendChild(dl);
  }
}

/**
 * Abre un modal de confirmación reutilizable (sin usar confirm() del navegador).
 * @param {{titulo?: string, mensaje?: string, contenido?: Array<{etiqueta:string, valor:string}>,
 *          textoAceptar?: string, claseAceptar?: "btn-peligro"|"btn-primario"}} opciones
 * @returns {Promise<boolean>} true si el usuario confirma.
 */
export function confirmarModal({
  titulo = "¿Estás seguro?", mensaje = "", contenido = null,
  textoAceptar = "Confirmar", claseAceptar = "btn-peligro"
} = {}) {
  crearEstructuraModal();
  document.getElementById("modal-titulo").textContent = titulo;
  pintarContenidoModal(mensaje, contenido);
  const btnAceptar = document.getElementById("modal-aceptar");
  btnAceptar.textContent = textoAceptar;
  btnAceptar.classList.remove("btn-peligro", "btn-primario");
  btnAceptar.classList.add(claseAceptar === "btn-primario" ? "btn-primario" : "btn-peligro");
  document.getElementById("modal-fondo").hidden = false;
  btnAceptar.focus();
  return new Promise((resolver) => { resolveModal = resolver; });
}
