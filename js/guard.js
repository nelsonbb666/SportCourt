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
const esPaginaAuthPublica = document.body.dataset.page === "auth-publica";

/** Enlace absoluto desde la raíz del sitio (para <a> generados por JS). */
function enlace(destino) {
  // destino ej.: "index.html", "pages/login.html"
  return `${BASE}${destino}`;
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

  // Obtener el nombre para el saludo (si existe el documento de perfil).
  let nombre = "";
  try {
    const snap = await getDoc(doc(db, "usuarios", usuario.uid));
    nombre = snap.exists() ? (snap.data().nombre || "").split(" ")[0] : "";
  } catch (_) {
    /* Silencioso: el saludo sin nombre no es crítico. */
  }

  contenedor.innerHTML = `
    ${esPaginaPrivada && !window.location.pathname.includes("dashboard.html")
      ? `<a href="${enlace("pages/dashboard.html")}">Dashboard</a>`
      : ""}
    <a href="${enlace("pages/perfil.html")}">Mi perfil</a>
    <span id="nav-saludo">${nombre ? `Hola, ${nombre} 👋` : "Sesión activa"}</span>
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

function irAlDashboard() {
  window.location.replace(enlace("pages/dashboard.html"));
}

onAuthStateChanged(auth, (usuario) => {
  if (esPaginaPrivada && !usuario) {
    redirigirALogin();
    return;
  }
  if (esPaginaAuthPublica && usuario) {
    // Login/registro con sesión activa → directo al dashboard.
    irAlDashboard();
    return;
  }
  pintarNavbar(usuario);
});

export { enlace };
