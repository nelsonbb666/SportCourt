/**
 * ============================================================
 * disponibilidad.js — Consulta de horarios por cancha y fecha
 * ============================================================
 * Sprint #2: se LEE la colección "reservas" para marcar bloques
 * ocupados. El Sprint #3 solo tendrá que escribir en esa misma
 * colección usando los bloques generados por generarBloques().
 *
 * Modelo de una reserva (documento de "reservas"):
 *   { canchaId, usuarioId, fecha: "YYYY-MM-DD",
 *     horaInicio: "HH:mm", horaFin: "HH:mm",
 *     estado: "confirmada" | "cancelada", creadaEn }
 */

import { db, auth } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// (no se necesita enlace aquí; guard.js carga igual para la navbar y protección)
import {
  mostrarMensaje, limpiarMensaje, esFechaValida, esFechaPasada, hoyISO,
  horaAMinutos, minutosAHora, formatearFechaLarga, confirmarModal, bloquearBoton
} from "./utils.js";
import { validarAntesDeReservar, crearReserva } from "./reservas.js";

/* ============================================================
   Lógica pura y reutilizable (la usará el Sprint #3)
   ============================================================ */

/**
 * Genera los bloques horarios de 1 hora entre apertura y cierre de la cancha,
 * y marca el estado de cada uno según las reservas confirmadas y la hora actual.
 *
 * @param {object} cancha - { horaApertura: "HH:mm", horaCierre: "HH:mm" }
 * @param {string} fecha - "YYYY-MM-DD" (no debe ser pasada; se valida aquí también)
 * @param {Array<{horaInicio: string, horaFin: string}>} reservas - reservas CONFIRMADAS del día
 * @returns {Array<{inicio: string, fin: string, estado: "disponible"|"ocupado"|"pasado"}>}
 */
export function generarBloques(cancha, fecha, reservas) {
  const bloques = [];
  const aperturas = horaAMinutos(cancha.horaApertura);
  const cierres = horaAMinutos(cancha.horaCierre);
  if (Number.isNaN(aperturas) || Number.isNaN(cierres) || cierres <= aperturas) return bloques;

  // Reservas como lista de intervalos [ini, fin) en minutos.
  const intervalos = (reservas || []).map((r) => ({
    ini: horaAMinutos(r.horaInicio),
    fin: horaAMinutos(r.horaFin)
  })).filter((i) => !Number.isNaN(i.ini) && !Number.isNaN(i.fin));

  // Si la fecha consultada es hoy, los bloques cuya hora de inicio ya pasó
  // no están disponibles.
  const esHoy = fecha === hoyISO();
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  for (let inicio = aperturas; inicio + 60 <= cierres; inicio += 60) {
    const fin = inicio + 60;
    let estado = "disponible";

    const ocupada = intervalos.some((i) => i.ini < fin && i.fin > inicio);
    if (ocupada) {
      estado = "ocupado";
    } else if (esHoy && inicio <= minutosAhora) {
      estado = "pasado";
    }

    bloques.push({
      inicio: minutosAHora(inicio),
      fin: minutosAHora(fin),
      estado
    });
  }

  return bloques;
}

/** Obtiene las reservas confirmadas de una cancha en una fecha. */
export async function obtenerReservasDelDia(canchaId, fecha) {
  const q = query(
    collection(db, "reservas"),
    where("canchaId", "==", canchaId),
    where("fecha", "==", fecha),
    where("estado", "==", "confirmada")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/* ============================================================
   Página pages/disponibilidad.html (Sprint #3: reserva activa)
   ============================================================ */

let canchaActual = null;
let ultimaFechaConsultada = null;
let reservandoEnCurso = false; // evita doble clic / doble reserva simultánea

async function cargarDisponibilidad() {
  const contenedor = document.getElementById("resultado-disponibilidad");
  const aviso = document.getElementById("mensaje-disponibilidad");

  const fechaInput = document.getElementById("fecha").value;

  if (!canchaActual) return;

  if (!esFechaValida(fechaInput)) {
    mostrarMensaje(aviso, "error", "Selecciona una fecha válida.");
    return;
  }
  if (esFechaPasada(fechaInput)) {
    mostrarMensaje(aviso, "error", "No se pueden consultar fechas pasadas.");
    return;
  }

  ultimaFechaConsultada = fechaInput;

  contenedor.innerHTML = `
    <div class="indicador-carga"><span class="spinner"></span> Consultando horarios...</div>`;

  try {
    const reservas = await obtenerReservasDelDia(canchaActual.id, fechaInput);
    const bloques = generarBloques(canchaActual, fechaInput, reservas);
    pintarBloques(bloques, fechaInput);
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error",
      error && error.code === "permission-denied"
        ? "No tienes permisos para consultar las reservas. Publica las reglas de firestore.rules en Firebase."
        : "No se pudo consultar la disponibilidad. Revisa que la colección \"reservas\" exista o contacta al administrador.");
  }
}

/** Vuelve a consultar los bloques del día (tras reservar). Sin recargar la página. */
async function refrescarBloques() {
  const aviso = document.getElementById("mensaje-disponibilidad");
  if (!canchaActual || !ultimaFechaConsultada) return;
  try {
    const reservas = await obtenerReservasDelDia(canchaActual.id, ultimaFechaConsultada);
    const bloques = generarBloques(canchaActual, ultimaFechaConsultada, reservas);
    pintarBloques(bloques, ultimaFechaConsultada);
  } catch (_) {
    mostrarMensaje(aviso, "error", "No se pudo actualizar la disponibilidad. Pulsa CONSULTAR HORARIOS de nuevo.");
  }
}

/** Añade un enlace "Ver mis reservas" dentro del mensaje de éxito. */
function anadirEnlaceMisReservas(aviso) {
  const previo = document.getElementById("enlace-mis-reservas-exito");
  if (previo) previo.remove();
  aviso.appendChild(document.createElement("br"));
  const link = document.createElement("a");
  link.id = "enlace-mis-reservas-exito";
  link.className = "enlace-mis-reservas";
  link.href = "mis-reservas.html";
  link.textContent = "Ver mis reservas →";
  aviso.appendChild(link);
}

/**
 * Flujo completo al pulsar "Reservar" en un bloque disponible:
 * validaciones → modal de resumen → transacción → refresco de bloques.
 */
async function iniciarReserva(bloque, boton) {
  const aviso = document.getElementById("mensaje-disponibilidad");
  if (reservandoEnCurso) return; // protección extra contra doble clic
  reservandoEnCurso = true;
  const restaurar = bloquearBoton(boton, "Reservando...");

  try {
    limpiarMensaje(aviso);

    // Datos completos y ACTUALES de la cancha (activa, horarios, precio)
    await recargarDatosCancha(canchaActual.id);

    const usuario = auth.currentUser;
    if (!usuario) {
      mostrarMensaje(aviso, "error", "Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    const errorVal = await validarAntesDeReservar(
      canchaActual, ultimaFechaConsultada, bloque.inicio, bloque.fin, usuario.uid
    );
    if (errorVal) {
      mostrarMensaje(aviso, "error", errorVal);
      return;
    }

    // Resumen de confirmación (modal propio, no confirm())
    const precioTexto = typeof canchaActual.precioHora === "number"
      ? `$${canchaActual.precioHora.toFixed(2)} por hora`
      : "Sin precio definido";
    const ok = await confirmarModal({
      titulo: "Confirmar reserva",
      mensaje: "Revisa los datos antes de confirmar tu reserva:",
      contenido: [
        { etiqueta: "Cancha", valor: canchaActual.nombre || "—" },
        { etiqueta: "Tipo", valor: canchaActual.tipo || "—" },
        { etiqueta: "Ubicación", valor: canchaActual.ubicacion || "—" },
        { etiqueta: "Fecha", valor: formatearFechaLarga(ultimaFechaConsultada) },
        { etiqueta: "Horario", valor: `${bloque.inicio} – ${bloque.fin}` },
        { etiqueta: "Precio", valor: precioTexto }
      ],
      textoAceptar: "CONFIRMAR RESERVA",
      claseAceptar: "btn-primario"
    });
    if (!ok) return;

    // Transacción anti doble-reserva (ID determinista + runTransaction)
    await crearReserva(canchaActual, ultimaFechaConsultada, bloque.inicio, bloque.fin);

    mostrarMensaje(aviso, "exito", "✅ Reserva confirmada. El horario ya aparece como ocupado.");
    anadirEnlaceMisReservas(aviso);
    await refrescarBloques(); // el bloque pasa a ocupado sin recargar la página
    boton.dataset.conservaEstado = "true"; // el DOM se pintó de nuevo; no restaurar botón viejo
  } catch (error) {
    if (error && error.code === "horario-ocupado") {
      mostrarMensaje(aviso, "error",
        "Otro usuario acaba de reservar este horario. Se actualizó la disponibilidad.");
      await refrescarBloques();
    } else if (error && String(error.code || "").startsWith("permission-denied")) {
      mostrarMensaje(aviso, "error",
        "No tienes permisos para reservar. Verifica que las reglas de firestore.rules estén publicadas en Firebase.");
    } else {
      mostrarMensaje(aviso, "error",
        (error && error.message) || "No se pudo completar la reserva. Inténtalo de nuevo.");
    }
  } finally {
    reservandoEnCurso = false;
    if (document.body.contains(boton) && boton.dataset.conservaEstado !== "true") {
      restaurar();
    }
  }
}

/** Pinta la cuadrícula de bloques con leyenda y conteo. */
function pintarBloques(bloques, fecha) {
  const contenedor = document.getElementById("resultado-disponibilidad");
  contenedor.innerHTML = "";

  if (!bloques.length) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    vacio.textContent = "Esta cancha no tiene horarios configurados correctamente (apertura/cierre).";
    contenedor.appendChild(vacio);
    return;
  }

  const disponibles = bloques.filter((b) => b.estado === "disponible").length;

  // Conteo: "6 horarios disponibles de 14"
  const resumen = document.createElement("p");
  resumen.className = "resumen-disponibilidad";
  resumen.textContent =
    `${formatearFechaLarga(fecha)} — ${disponibles} horario${disponibles === 1 ? "" : "s"} disponible${disponibles === 1 ? "" : "s"} de ${bloques.length}`;
  contenedor.appendChild(resumen);

  // Leyenda clara
  const leyenda = document.createElement("div");
  leyenda.className = "leyenda";
  leyenda.innerHTML = `
    <span><span class="cuadro cuadro-disponible"></span>Disponible</span>
    <span><span class="cuadro cuadro-ocupado"></span>Ocupado</span>
    <span><span class="cuadro cuadro-pasado"></span>Ya pasó (hoy)</span>`;
  contenedor.appendChild(leyenda);

  // Cuadrícula de bloques
  const grid = document.createElement("div");
  grid.className = "grid-horarios";

  for (const bloque of bloques) {
    const div = document.createElement("div");
    div.className = `bloque-horario bloque-${bloque.estado}`;

    const hora = document.createElement("span");
    hora.className = "hora";
    hora.textContent = `${bloque.inicio} – ${bloque.fin}`;
    div.appendChild(hora);

    const btn = document.createElement("button");
    btn.type = "button";
    if (bloque.estado === "disponible") {
      // Sprint #3: botón activo
      btn.textContent = "Reservar";
      btn.classList.add("btn-reservar-bloque");
      btn.addEventListener("click", () => iniciarReserva(bloque, btn));
    } else if (bloque.estado === "ocupado") {
      btn.textContent = "Ocupado";
      btn.disabled = true;
    } else {
      btn.textContent = "No disponible";
      btn.disabled = true;
    }
    div.appendChild(btn);

    grid.appendChild(div);
  }

  contenedor.appendChild(grid);
}

/** Carga el <select> de canchas (activas primero) y preselecciona ?cancha=. */
async function poblarSelectCanchas(select) {
  const aviso = document.getElementById("mensaje-disponibilidad");
  try {
    const snap = await getDocs(collection(db, "canchas"));
    const canchas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!canchas.length) {
      const opcion = document.createElement("option");
      opcion.value = "";
      opcion.textContent = "No hay canchas registradas aún";
      select.appendChild(opcion);
      select.disabled = true;
      mostrarMensaje(aviso, "exito", "Aún no hay canchas registradas. Un administrador debe crearlas primero.");
      return;
    }

    // Orden alfabético; las inactivas al final con aviso.
    canchas.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

    for (const c of canchas) {
      const opcion = document.createElement("option");
      opcion.value = c.id;
      opcion.textContent = `${c.nombre}${c.tipo ? ` (${c.tipo})` : ""}${c.activa === false ? " · Inactiva" : ""}`;
      select.appendChild(opcion);
    }

    // Preselección desde ?cancha=<id> (viene del botón "Ver disponibilidad")
    const idParam = new URLSearchParams(window.location.search).get("cancha");
    if (idParam && canchas.some((c) => c.id === idParam)) {
      select.value = idParam;
    }

    canchaActual = canchas.find((c) => c.id === select.value) || null;
  } catch (error) {
    mostrarMensaje(aviso, "error", "No se pudieron cargar las canchas. Verifica sesión y reglas de Firestore.");
  }
}

/** Inicializa la página de disponibilidad. */
export async function initDisponibilidad() {
  const select = document.getElementById("selector-cancha");
  const fechaInput = document.getElementById("fecha");
  const btnBuscar = document.getElementById("btn-buscar");
  const restaurarOriginal = () => { btnBuscar.disabled = false; btnBuscar.textContent = "CONSULTAR HORARIOS"; };

  // Fecha mínima: hoy (no permitir fechas pasadas)
  fechaInput.min = hoyISO();
  fechaInput.value = hoyISO();

  await poblarSelectCanchas(select);

  select.addEventListener("change", () => {
    const id = select.value;
    canchaActual = id ? { id, nombre: select.options[select.selectedIndex].textContent } : null;
    recargarDatosCancha(id); // trae horaApertura/horaCierre reales desde Firestore
  });

  fechaInput.addEventListener("change", () => {
    if (fechaInput.value < hoyISO()) {
      fechaInput.value = hoyISO();
    }
  });

  btnBuscar.addEventListener("click", async () => {
    if (!canchaActual || !canchaActual.horaApertura) {
      await recargarDatosCancha(select.value);
    }
    btnBuscar.disabled = true;
    btnBuscar.textContent = "Consultando...";
    await cargarDisponibilidad();
    restaurarOriginal();
  });

  // Si llegó con ?cancha=, cargar sus datos y consultar automáticamente.
  const idParam = new URLSearchParams(window.location.search).get("cancha");
  if (idParam) {
    await recargarDatosCancha(idParam);
    btnBuscar.disabled = true;
    btnBuscar.textContent = "Consultando...";
    await cargarDisponibilidad();
    restaurarOriginal();
  }
}

/** Lee el documento completo de la cancha seleccionada (horario apertura/cierre). */
async function recargarDatosCancha(id) {
  if (!id) { canchaActual = null; return; }
  try {
    const snap = await getDoc(doc(db, "canchas", id));
    if (snap.exists()) {
      canchaActual = { id, ...snap.data() };
    }
  } catch (_) {
    /* Se avisará al intentar consultar. */
  }
}
