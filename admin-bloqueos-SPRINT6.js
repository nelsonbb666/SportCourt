/**
 * ============================================================
 * admin-bloqueos.js — Página de administración de bloqueos (Sprint #6)
 * ============================================================
 * - Formulario: cancha + fecha + rango de horas + motivo → crearBloqueo()
 *   (una sola transacción que aborta si hay reservas confirmadas o el
 *   horario ya está bloqueado).
 * - Listado de bloqueos VIGENTES agrupados por grupoId, con filtros por
 *   cancha y fecha, y botón "LEVANTAR BLOQUEO" (modal de confirmación +
 *   writeBatch de eliminación).
 * Todo el texto dinámico se pinta con textContent (anti-XSS); el motivo
 * lo escribe el admin pero igualmente se escapa.
 */

import { db, auth } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  mostrarMensaje, limpiarMensaje, bloquearBoton, confirmarModal,
  hoyISO, formatearFechaLarga, esHoraValida
} from "./utils.js";
import {
  crearBloqueo, listarBloqueosVigentes, agruparBloqueos, levantarBloqueo, ErrorBloqueo
} from "./bloqueos.js";

let canchasCache = [];   // canchas activas del sistema
let gruposCache = [];    // grupos de bloqueo vigentes (con sus ids de documento)

/* ---------- Carga de canchas ---------- */

async function cargarCanchas(selectPrincipal, selectFiltro) {
  try {
    const snap = await getDocs(collection(db, "canchas"));
    canchasCache = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.activa !== false)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

    for (const select of [selectPrincipal, selectFiltro]) {
      select.innerHTML = "";
      if (select === selectPrincipal) {
        const op = document.createElement("option");
        op.value = "";
        op.textContent = canchasCache.length ? "— Selecciona una cancha —" : "No hay canchas activas";
        select.appendChild(op);
      } else {
        const op = document.createElement("option");
        op.value = "";
        op.textContent = "Todas las canchas";
        select.appendChild(op);
      }
      for (const c of canchasCache) {
        const opcion = document.createElement("option");
        opcion.value = c.id;
        opcion.textContent = `${c.nombre}${c.tipo ? ` (${c.tipo})` : ""}`;
        select.appendChild(opcion);
      }
    }
    selectPrincipal.disabled = canchasCache.length === 0;
  } catch (error) {
    mostrarMensaje(document.getElementById("mensaje-bloqueos"), "error",
      error && error.code === "permission-denied"
        ? "No tienes permisos para leer canchas. Publica las reglas de firestore.rules en Firebase."
        : "No se pudieron cargar las canchas.");
  }
}

/* ---------- Formulario: crear bloqueo ---------- */

async function manejarEnvioBloqueo(evento) {
  evento.preventDefault();
  const aviso = document.getElementById("mensaje-bloqueos");
  const btn = document.getElementById("btn-bloquear");

  const cancha = canchasCache.find((c) => c.id === document.getElementById("b-cancha").value) || null;
  const fecha = document.getElementById("b-fecha").value;
  const inicio = document.getElementById("b-inicio").value;
  const fin = document.getElementById("b-fin").value;
  const motivo = document.getElementById("b-motivo").value;

  // Validaciones rápidas en cliente (los mensajes exactos los genera crearBloqueo)
  if (!cancha) { mostrarMensaje(aviso, "error", "Selecciona una cancha."); return; }
  if (!fecha) { mostrarMensaje(aviso, "error", "Selecciona una fecha."); return; }
  if (!esHoraValida(inicio) || !esHoraValida(fin)) {
    mostrarMensaje(aviso, "error", "Indica la hora de inicio y la hora de fin."); return;
  }

  const usuario = auth.currentUser;
  if (!usuario) { mostrarMensaje(aviso, "error", "Tu sesión expiró. Vuelve a iniciar sesión."); return; }

  const restaurar = bloquearBoton(btn, "Bloqueando...");
  limpiarMensaje(aviso);
  try {
    const { horas } = await crearBloqueo(cancha, fecha, inicio, fin, motivo, usuario.uid);
    mostrarMensaje(aviso, "exito",
      `✅ Bloqueo registrado: ${cancha.nombre}, ${formatearFechaLarga(fecha)} de ${inicio} a ${fin} (${horas.length} hora${horas.length === 1 ? "" : "s"}).`);
    anadirEnlaceDisponibilidad(aviso, cancha.id);
    evento.target.reset();
    document.getElementById("b-fecha").min = hoyISO();
    await cargarListaBloqueos(); // sin recargar la página
  } catch (error) {
    if (error instanceof ErrorBloqueo) {
      mostrarMensaje(aviso, "error", error.message);
      if (error.code === "reservas-confirmadas") anadirEnlaceReservas(aviso);
    } else if (error && String(error.code || "").startsWith("permission-denied")) {
      mostrarMensaje(aviso, "error",
        "No tienes permisos para crear bloqueos. Verifica que publicaste las reglas actualizadas de firestore.rules.");
    } else {
      mostrarMensaje(aviso, "error", error.message || "No se pudo guardar el bloqueo. Inténtalo de nuevo.");
    }
  } finally {
    restaurar();
  }
}

/** Enlace directo a Reservas del admin cuando el bloqueo se abortó por reservas. */
function anadirEnlaceReservas(aviso) {
  const previo = document.getElementById("enlace-reservas-bloqueo");
  if (previo) previo.remove();
  aviso.appendChild(document.createElement("br"));
  const link = document.createElement("a");
  link.id = "enlace-reservas-bloqueo";
  link.className = "enlace-mis-reservas";
  link.href = "admin-reservas.html";
  link.textContent = "Ir a Reservas para cancelar →";
  aviso.appendChild(link);
}

/** Enlace para verificar el bloqueo en disponibilidad después de crearlo. */
function anadirEnlaceDisponibilidad(aviso, canchaId) {
  const previo = document.getElementById("enlace-disponibilidad-bloqueo");
  if (previo) previo.remove();
  aviso.appendChild(document.createElement("br"));
  const link = document.createElement("a");
  link.id = "enlace-disponibilidad-bloqueo";
  link.className = "enlace-mis-reservas";
  link.href = `disponibilidad.html?cancha=${encodeURIComponent(canchaId)}`;
  link.textContent = "Ver cómo quedó la disponibilidad →";
  aviso.appendChild(link);
}

/* ---------- Listado de bloqueos vigentes ---------- */

async function cargarListaBloqueos() {
  const contenedor = document.getElementById("lista-bloqueos");
  const aviso = document.getElementById("mensaje-bloqueos");
  const canchaId = document.getElementById("f-b-cancha").value;
  const fecha = document.getElementById("f-b-fecha").value;

  contenedor.innerHTML = `
    <div class="indicador-carga"><span class="spinner"></span> Consultando bloqueos...</div>`;

  let bloqueos;
  try {
    bloqueos = await listarBloqueosVigentes(canchaId, fecha);
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error",
      error && error.code === "permission-denied"
        ? "No tienes permisos para consultar bloqueos. Publica las reglas de firestore.rules en Firebase."
        : "No se pudieron consultar los bloqueos. Revisa la conexión e inténtalo de nuevo.");
    return;
  }

  // Guardamos también los ids de documento por grupo (para eliminarlos luego)
  const idsPorGrupo = new Map();
  for (const b of bloqueos) {
    const clave = b.grupoId || b.id;
    if (!idsPorGrupo.has(clave)) idsPorGrupo.set(clave, []);
    idsPorGrupo.get(clave).push(b.id);
  }

  gruposCache = agruparBloqueos(bloqueos).map((g) => ({ ...g, ids: idsPorGrupo.get(g.grupoId) || [] }));
  pintarListaBloqueos(gruposCache, contenedor);
}

/** Tabla en escritorio / tarjetas en móvil (CSS decide). textContent anti-XSS. */
function pintarListaBloqueos(grupos, contenedor) {
  contenedor.innerHTML = "";

  if (!grupos.length) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    vacio.textContent = "No hay bloqueos vigentes.";
    contenedor.appendChild(vacio);
    return;
  }

  // Encabezado de tabla (solo visible en escritorio por CSS)
  const tabla = document.createElement("div");
  tabla.className = "tabla-bloqueos";

  const cabecera = document.createElement("div");
  cabecera.className = "fila-bloqueos fila-bloqueos-cab";
  for (const tituloText of ["Cancha", "Fecha", "Horario", "Motivo", "Creado por", "Acción"]) {
    const celda = document.createElement("span");
    celda.textContent = tituloText;
    cabecera.appendChild(celda);
  }
  tabla.appendChild(cabecera);

  for (const g of grupos) {
    const fila = document.createElement("div");
    fila.className = "fila-bloqueos tarjeta-bloqueo";

    const celdas = [
      [g.canchaNombre, "dato-etq", "Cancha"],
      [formatearFechaLarga(g.fecha), "dato-etq", "Fecha"],
      [`${g.rangoInicio} – ${g.rangoFin} (${g.horas.length} h)`, "dato-etq", "Horario"],
      [g.motivo, "dato-motivo", "Motivo"],
      [g.creadoPor ? `Admin · ${String(g.creadoPor).slice(0, 8)}…` : "—", "dato-etq", "Creado por"]
    ];
    for (const [valor, clase, etiqueta] of celdas) {
      const celda = document.createElement("span");
      celda.className = clase;
      const etqMovil = document.createElement("small");
      etqMovil.textContent = `${etiqueta}:`;
      const texto = document.createElement("span");
      texto.textContent = valor;
      celda.append(etqMovil, texto);
      fila.appendChild(celda);
    }

    const celdaAccion = document.createElement("span");
    celdaAccion.className = "dato-accion";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-peligro btn-sm";
    btn.textContent = "LEVANTAR BLOQUEO";
    btn.addEventListener("click", () => confirmarLevantar(g, btn));
    celdaAccion.appendChild(btn);
    fila.appendChild(celdaAccion);

    tabla.appendChild(fila);
  }

  contenedor.appendChild(tabla);
}

/** Modal de confirmación propio (sin confirm()) antes de eliminar el grupo. */
async function confirmarLevantar(grupo, boton) {
  const aviso = document.getElementById("mensaje-bloqueos");
  limpiarMensaje(aviso);

  const ok = await confirmarModal({
    titulo: "Levantar bloqueo",
    mensaje: "¿Seguro que deseas levantar este bloqueo? Los horarios volverán a estar disponibles.",
    contenido: [
      { etiqueta: "Cancha", valor: grupo.canchaNombre },
      { etiqueta: "Fecha", valor: formatearFechaLarga(grupo.fecha) },
      { etiqueta: "Horario", valor: `${grupo.rangoInicio} – ${grupo.rangoFin}` },
      { etiqueta: "Motivo", valor: grupo.motivo }
    ],
    textoAceptar: "Sí, levantar bloqueo",
    claseAceptar: "btn-peligro"
  });
  if (!ok) return;

  const restaurar = bloquearBoton(boton, "Levantando...");
  try {
    await levantarBloqueo(grupo.ids);
    mostrarMensaje(aviso, "exito",
      `🔓 Bloqueo levantado: ${grupo.canchaNombre}, ${formatearFechaLarga(grupo.fecha)} de ${grupo.rangoInicio} a ${grupo.rangoFin}. Los horarios vuelven a estar disponibles.`);
    await cargarListaBloqueos(); // refresco sin recargar la página
  } catch (error) {
    mostrarMensaje(aviso, "error",
      error && String(error.code || "").startsWith("permission-denied")
        ? "No tienes permisos para eliminar bloqueos. Publica las reglas de firestore.rules en Firebase."
        : error.message || "No se pudo levantar el bloqueo. Inténtalo de nuevo.");
    restaurar();
  }
}

/* ---------- Inicialización ---------- */

export async function initAdminBloqueos() {
  const form = document.getElementById("form-bloqueo");
  if (!form) return;

  const selectCancha = document.getElementById("b-cancha");
  const selectFiltro = document.getElementById("f-b-cancha");
  const fechaInput = document.getElementById("b-fecha");
  const fechaFiltro = document.getElementById("f-b-fecha");

  fechaInput.min = hoyISO();
  fechaInput.value = hoyISO();

  await cargarCanchas(selectCancha, selectFiltro);
  await cargarListaBloqueos();

  form.addEventListener("submit", manejarEnvioBloqueo);

  document.getElementById("btn-recargar-bloqueos")
    .addEventListener("click", cargarListaBloqueos);
  selectFiltro.addEventListener("change", cargarListaBloqueos);
  fechaFiltro.addEventListener("change", cargarListaBloqueos);

  document.getElementById("btn-limpiar-filtros").addEventListener("click", () => {
    selectFiltro.value = "";
    fechaFiltro.value = "";
    cargarListaBloqueos();
  });
}
