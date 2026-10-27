/**
 * ============================================================
 * guard.js — Protección de páginas privadas + navbar dinámica
 * ============================================================
 * Se importa en TODAS las páginas. Lee el estado de sesión de Firebase
 * y:
 *   1. Construye los enlaces de la barra de navegación:
 *      - Sin sesión:    "Registrar usuario" / "Iniciar sesión"
 *      - Con sesión:    "Dashboard" / "Mi perfil" / saludo / "Cerrar sesión"
 *   2. Si la página tiene <body data-page="privada">, exige sesión activa;
 *      en caso contrario redirige a login.html (con ?next= para volver).
 *   3. Si una página pública de auth (login/registro) se abre con sesión
 *      activa, redirige directo al dashboard.
 *   4. (Sprint #2) Si la página tiene <body data-page="admin">, exige además
 *      que el documento del usuario tenga rol == "admin"; si no, redirige al
 *      dashboard con un mensaje. La protección REAL son las reglas de
 *      Firestore; esto es solo experiencia de usuario.
 *
 * Rutas relativas: pensadas para funcionar tanto en localhost como en
 * GitHub Pages servido desde subcarpeta (/reserva-canchas/...).
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Detecta la carpeta base del sitio (funciona en GitHub Pages con subruta). */
const BASE = calcularBase();

function calcularBase() {
  // location.pathname ej.: /repo/pages/perfil.html → queremos /repo/
  const ruta = window.location.pathname;
  if (ruta.includes("/pages/")) {
    return ruta.substring(0, ruta.indexOf("/pages/") + 1);
  }
  return ruta.substring(0, ruta.lastIndexOf("/") + 1);
}

const esPaginaPrivada = document.body.dataset.page === "privada";
const esPaginaAdmin = document.body.dataset.page === "admin";
const requiereSesion = esPaginaPrivada || esPaginaAdmin;
const esPaginaAuthPublica = document.body.dataset.page === "auth-publica";

/** Enlace absoluto desde la raíz del sitio (para <a> generados por JS). */
function enlace(destino) {
  // destino ej.: "index.html", "pages/login.html"
  return `${BASE}${destino}`;
}

/* ---------- Rol de usuario (Sprint #2) ---------- */

let perfilCache = null; // documento de Firestore del usuario en sesión

/** Lee el documento de perfil del usuario (con caché por sesión). */
async function obtenerPerfil(usuario) {
  if (!usuario) return null;
  if (perfilCache && perfilCache.uid === usuario.uid) return perfilCache.perfil;
  try {
    const snap = await getDoc(doc(db, "usuarios", usuario.uid));
    const perfil = snap.exists() ? snap.data() : null;
    perfilCache = { uid: usuario.uid, perfil };
    return perfil;
  } catch (_) {
    return null;
  }
}

/**
 * ¿El usuario en sesión es administrador? (según su documento en Firestore)
 * Se exporta para que otras páginas (canchas.js) muestren/oculten acciones.
 * ⚠️ La protección real son las reglas de firestore.rules; esto es UX.
 */
export async function esAdmin() {
  const usuario = auth.currentUser;
  if (!usuario) return false;
  const perfil = await obtenerPerfil(usuario);
  return !!perfil && perfil.rol === "admin";
}

/* ---------- Cuentas inactivas (Sprint #4) ---------- */

/**
 * Si el documento del usuario tiene `activo === false`, se cierra la sesión
 * aunque ya estuviera abierta y se redirige al login con el mensaje.
 * Usuarios antiguos sin el campo se consideran activos.
 */
async function cerrarSesionSiInactivo(usuario) {
  if (!usuario) return false;
  const perfil = await obtenerPerfil(usuario);
  if (perfil && perfil.activo === false) {
    await signOut(auth);
    window.location.replace(`${enlace("pages/login.html")}?msg=${encodeURIComponent("Tu cuenta está desactivada. Contacta al administrador.")}`);
    return true;
  }
  return false;
}

/* ---------- Navbar ---------- */

async function pintarNavbar(usuario) {
  const contenedor = document.getElementById("nav-links");
  if (!contenedor) return;

  if (!usuario) {
    contenedor.innerHTML = `
      <a href="${enlace("pages/registro.html")}">Registrar usuario</a>
      <a href="${enlace("pages/login.html")}" class="btn-nav">Iniciar sesión</a>
    `;
    return;
  }

  // Obtener el nombre y rol para el saludo y las opciones de administración.
  const perfil = await obtenerPerfil(usuario);
  const nombre = perfil && perfil.nombre ? perfil.nombre.split(" ")[0] : "";
  const admin = !!perfil && perfil.rol === "admin";

  contenedor.innerHTML = `
    ${requiereSesion && !window.location.pathname.includes("dashboard.html")
      ? `<a href="${enlace("pages/dashboard.html")}">Dashboard</a>`
      : ""}
    <a href="${enlace("pages/canchas.html")}">Consultar cancha</a>
    <a href="${enlace("pages/mis-reservas.html")}">Mis reservas</a>
    ${admin ? `<a href="${enlace("pages/admin-panel.html")}">Panel de control</a>` : ""}
    ${admin ? `<a href="${enlace("pages/admin-cancha-form.html")}">Registrar cancha</a>` : ""}
    ${admin ? `<a href="${enlace("pages/admin-reservas.html")}">Reservas</a>` : ""}
    ${admin ? `<a href="${enlace("pages/admin-usuarios.html")}">Usuarios</a>` : ""}
    ${admin ? `<a href="${enlace("pages/admin-reportes.html")}">Reportes</a>` : ""}
    <a href="${enlace("pages/perfil.html")}">Mi perfil</a>
    <span id="nav-saludo">${nombre ? `Hola, ${nombre} 👋` : "Sesión activa"}${admin ? " · Admin" : ""}</span>
    <a href="#" id="btn-logout" class="btn-nav">Cerrar sesión</a>
  `;

  const btnLogout = document.getElementById("btn-logout");
  btnLogout.addEventListener("click", async (e) => {
    e.preventDefault();
    btnLogout.textContent = "Cerrando...";
    btnLogout.style.pointerEvents = "none";
    await signOut(auth);
    window.location.href = enlace("index.html");
  });
}

/* ---------- Guardas de acceso ---------- */

function redirigirALogin() {
  const siguiente = encodeURIComponent(window.location.pathname.split(BASE)[1] || "");
  window.location.replace(`${enlace("pages/login.html")}?next=${siguiente}`);
}

function irAlDashboard(mensaje) {
  const q = mensaje ? `?msg=${encodeURIComponent(mensaje)}` : "";
  window.location.replace(`${enlace("pages/dashboard.html")}${q}`);
}

onAuthStateChanged(auth, async (usuario) => {
  if (requiereSesion && !usuario) {
    redirigirALogin();
    return;
  }
  // Sprint #4: si la sesión abierta pertenece a una cuenta desactivada,
  // se cierra y se redirige al login con el mensaje correspondiente.
  if (usuario && await cerrarSesionSiInactivo(usuario)) {
    return;
  }
  if (esPaginaAuthPublica && usuario) {
    // Login/registro con sesión activa → directo al dashboard.
    irAlDashboard();
    return;
  }
  if (esPaginaAdmin && usuario) {
    const perfil = await obtenerPerfil(usuario);
    if (!perfil || perfil.rol !== "admin") {
      irAlDashboard("No tienes permisos de administrador para acceder a esa página.");
      return;
    }
  }
  pintarNavbar(usuario);
});

export { enlace, BASE };
