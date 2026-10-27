/**
 * ============================================================
 * reservas.js — Crear, consultar y cancelar reservas (Sprint #3)
 * ============================================================
 * Modelo de un documento de "reservas":
 *   {
 *     canchaId, canchaNombre, canchaTipo, canchaUbicacion,
 *     usuarioId, fecha: "YYYY-MM-DD", horaInicio: "HH:mm",
 *     horaFin: "HH:mm", precio (number|null),
 *     estado: "confirmada" | "cancelada",
 *     creadaEn (serverTimestamp), canceladaEn (timestamp, solo al cancelar)
 *   }
 *
 * Anti doble-reserva: el ID del documento es DETERMINISTA,
 *   `${canchaId}_${fecha}_${horaInicio}`  (ej. abc123_2025-06-20_18:00)
 * y la escritura se hace dentro de runTransaction(): si ya existe una
 * reserva CONFIRMADA en ese horario se aborta; si no existe o está
 * CANCELADA se escribe/sobrescribe como confirmada (así un horario
 * cancelado puede volver a reservarse sin crear duplicados).
 */

import { db, auth } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, query, where, runTransaction,
  updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  mostrarMensaje, limpiarMensaje, traducirErrorFirebase, confirmarModal,
  bloquearBoton, esFechaValida, esFechaPasada, esHoraValida, horaAMinutos,
  formatearFechaLarga, fechaHoraEsPasada, minutosHasta, CONSTANTE
} from "./utils.js";

/* ---------- Utilidades de datos ---------- */

/** ID determinista de la reserva de un horario concreto. */
export function idReserva(canchaId, fecha, horaInicio) {
  // Se conservan los dos puntos de la hora (carácter válido en IDs de Firestore),
  // como en el ejemplo del sprint: abc123_2025-06-20_18:00
  return `${canchaId}_${fecha}_${horaInicio}`;
}

/** ¿El horario pedido cae dentro del horario de atención de la cancha? */
export function estaDentroDelHorario(cancha, horaInicio, horaFin) {
  const ap = horaAMinutos(cancha.horaApertura);
  const ci = horaAMinutos(cancha.horaCierre);
  const ini = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);
  if ([ap, ci, ini, fin].some(Number.isNaN)) return false;
  return ini >= ap && fin <= ci;
}

/**
 * Valida antes de reservar. Devuelve string de error o null si todo OK.
 * Chequeos: cancha activa, fecha/hora no pasadas, dentro del horario de
 * atención, y que el usuario no tenga otra reserva confirmada a la misma
 * fecha y hora en cualquier cancha.
 */
export async function validarAntesDeReservar(cancha, fecha, horaInicio, horaFin, uid) {
  if (!cancha) return "Selecciona una cancha válida.";
  if (cancha.activa === false) return "Esta cancha está inactiva y no se puede reservar.";
  if (!esFechaValida(fecha) || esFechaPasada(fecha)) return "No se pueden reservar fechas pasadas.";
  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) return "Horario seleccionado inválido.";
  if (fechaHoraEsPasada(fecha, horaInicio)) return "No se pueden reservar horarios que ya pasaron.";
  if (!estaDentroDelHorario(cancha, horaInicio, horaFin)) {
    return `El horario está fuera de la atención de la cancha (${cancha.horaApertura}–${cancha.horaCierre}).`;
  }

  // ¿El usuario ya tiene otra reserva confirmada a la misma fecha/hora (en cualquier cancha)?
  try {
    const q = query(
      collection(db, "reservas"),
      where("usuarioId", "==", uid),
      where("fecha", "==", fecha),
      where("estado", "==", "confirmada")
    );
    const snap = await getDocs(q);
    const conflicto = snap.docs.find((d) => {
      const r = d.data();
      const ini = horaAMinutos(r.horaInicio);
      const fin = horaAMinutos(r.horaFin);
      const nIni = horaAMinutos(horaInicio);
      const nFin = horaAMinutos(horaFin);
      return !Number.isNaN(ini) && !Number.isNaN(fin) && ini < nFin && fin > nIni;
    });
    if (conflicto) {
      const r = conflicto.data();
      return `Ya tienes una reserva confirmada el ${formatearFechaLarga(r.fecha)} de ${r.horaInicio} a ${r.horaFin}${r.canchaNombre ? ` en ${r.canchaNombre}` : ""}. No puedes reservar dos canchas a la misma hora.`;
    }
  } catch (error) {
    return traducirErrorFirebase(error, "No se pudieron verificar tus reservas actuales.");
  }

  return null;
}

/**
 * Crea (o reutiliza) la reserva con transacción. Lanza Error con .code
 * "horario-ocupado" si otro usuario tomó el horario entre tanto.
 */
export async function crearReserva(cancha, fecha, horaInicio, horaFin) {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

  const ref = doc(db, "reservas", idReserva(cancha.id, fecha, horaInicio));

  await runTransaction(db, async (transaccion) => {
    const actual = await transaccion.get(ref);
    if (actual.exists()) {
      const datos = actual.data();
      if (datos.estado === "confirmada") {
        const err = new Error("Este horario ya fue reservado.");
        err.code = "horario-ocupado";
        throw err; // aborta la transacción
      }
      // Cancelada propia → la reutilizo; cancelada de otro → también se permite
      // (el horario está libre); la escritura pisa el historial del dueño anterior.
    }
    transaccion.set(ref, {
      canchaId: cancha.id,
      canchaNombre: cancha.nombre || "",
      canchaTipo: cancha.tipo || "",
      canchaUbicacion: cancha.ubicacion || "",
      usuarioId: usuario.uid,
      fecha,
      horaInicio,
      horaFin,
      precio: typeof cancha.precioHora === "number" ? cancha.precioHora : null,
      estado: "confirmada",
      creadaEn: serverTimestamp(),
      canceladaEn: null
    });
  });

  return ref.id;
}

/** Cancela una reserva propia: estado → "cancelada" + canceladaEn (no se borra). */
export async function cancelarReserva(reservaId) {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

  const ref = doc(db, "reservas", reservaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("La reserva no existe.");
  const datos = snap.data();
  if (datos.usuarioId !== usuario.uid) throw new Error("No puedes cancelar reservas de otro usuario.");
  if (datos.estado !== "confirmada") throw new Error("Esta reserva ya no está vigente.");

  // Regla opcional de anticipación mínima (constante en utils.js, 0 = desactivada)
  const minHoras = Number(CONSTANTE.config.minHorasAnticipacionCancelacion) || 0;
  if (minHoras > 0) {
    const faltan = minutosHasta(datos.fecha, datos.horaInicio);
    if (faltan < minHoras * 60) {
      throw new Error(`Solo puedes cancelar con al menos ${minHoras} hora(s) de anticipación.`);
    }
  }

  await updateDoc(ref, {
    estado: "cancelada",
    canceladaEn: serverTimestamp()
  });
}

/**
 * Sprint #4 — Cancela una reserva como ADMINISTRADOR (cualquier usuario).
 * Además del cambio de estado registra quién la canceló y el motivo opcional:
 *   estado: "cancelada", canceladaEn, canceladaPor (UID), motivoCancelacion.
 * No borra el documento: conserva el historial y libera el horario, que
 * volverá a aparecer disponible en disponibilidad.html (generarBloques solo
 * cuenta las reservas "confirmada").
 */
export async function cancelarReservaComoAdmin(reservaId, motivo = "") {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

  const ref = doc(db, "reservas", reservaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("La reserva no existe.");
  const datos = snap.data();
  if (datos.estado !== "confirmada") throw new Error("Esta reserva ya no está vigente.");

  await updateDoc(ref, {
    estado: "cancelada",
    canceladaEn: serverTimestamp(),
    canceladaPor: usuario.uid,
    motivoCancelacion: (motivo || "").trim() || null
  });
}

/** Todas las reservas confirmadas del usuario en una fecha (para "Mis reservas" y validaciones). */
export async function obtenerReservasConfirmadasDeUsuario(uid, fecha) {
  const q = query(
    collection(db, "reservas"),
    where("usuarioId", "==", uid),
    where("fecha", "==", fecha),
    where("estado", "==", "confirmada")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ============================================================
   Página pages/mis-reservas.html
   ============================================================ */

/** Carga las reservas del usuario y las clasifica (sin índices compuestos: orden en cliente). */
async function cargarMisReservas(contenedor, aviso) {
  const usuario = auth.currentUser;
  if (!usuario) return;

  contenedor.innerHTML = `
    <div class="indicador-carga"><span class="spinner"></span> Consultando tus reservas...</div>`;

  let reservas;
  try {
    const q = query(collection(db, "reservas"), where("usuarioId", "==", usuario.uid));
    const snap = await getDocs(q);
    reservas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error", traducirErrorFirebase(
      error,
      "No se pudieron cargar tus reservas. Publica las reglas de firestore.rules en Firebase."
    ));
    return;
  }

  // Clasificación (orden por fecha+hora en el cliente → no requiere índice compuesto)
  const clave = (r) => `${r.fecha || ""}T${r.horaInicio || "00:00"}`;
  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = reservas
    .filter((r) => r.estado === "confirmada" && (r.fecha > hoy || (r.fecha === hoy && !fechaHoraEsPasada(r.fecha, r.horaFin))))
    .sort((a, b) => clave(a).localeCompare(clave(b))); // más cercana primero
  const pasadas = reservas
    .filter((r) => r.estado === "confirmada" && !proximas.includes(r))
    .sort((a, b) => clave(b).localeCompare(clave(a))); // más reciente primero
  const canceladas = reservas
    .filter((r) => r.estado === "cancelada")
    .sort((a, b) => clave(b).localeCompare(clave(a)));

  pintarPestanas({ proximas, pasadas, canceladas }, contenedor, aviso);
}

/** Pinta pestañas + tarjetas. Todo el texto dinámico va con textContent (anti-XSS). */
function pintarPestanas(grupos, contenedor, aviso) {
  contenedor.innerHTML = "";
  const total = grupos.proximas.length + grupos.pasadas.length + grupos.canceladas.length;

  if (!total) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    const titulo = document.createElement("h3");
    titulo.textContent = "Aún no tienes reservas";
    const parrafo = document.createElement("p");
    parrafo.textContent = "Consulta la disponibilidad de una cancha y reserva tu primer horario.";
    const btn = document.createElement("a");
    btn.className = "btn btn-primario";
    btn.href = "canchas.html";
    btn.textContent = "CONSULTAR CANCHA";
    vacio.append(titulo, parrafo, btn);
    contenedor.appendChild(vacio);
    return;
  }

  // Barra de pestañas
  const tabs = document.createElement("div");
  tabs.className = "tabs-reservas";
  const defs = [
    ["proximas", `Próximas (${grupos.proximas.length})`],
    ["pasadas", `Pasadas (${grupos.pasadas.length})`],
    ["canceladas", `Canceladas (${grupos.canceladas.length})`]
  ];
  for (const [nombre, etiqueta] of defs) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab-boton";
    b.dataset.tab = nombre;
    b.textContent = etiqueta;
    tabs.appendChild(b);
  }
  contenedor.appendChild(tabs);

  // Paneles
  for (const [nombre, lista] of defs.map(([n]) => [n, grupos[n]])) {
    const panel = document.createElement("div");
    panel.className = "tab-panel";
    panel.dataset.panel = nombre;

    if (!lista.length) {
      const v = document.createElement("p");
      v.className = "estado-vacioCompacto";
      v.textContent = nombre === "proximas"
        ? "No tienes reservas próximas."
        : nombre === "pasadas"
          ? "No tienes reservas pasadas."
          : "No tienes reservas canceladas.";
      panel.appendChild(v);
    } else {
      for (const r of lista) panel.appendChild(tarjetaReserva(r, nombre, aviso, grupos));
    }
    contenedor.appendChild(panel);
  }

  // Comportamiento de pestañas
  tabs.addEventListener("click", (e) => {
    const boton = e.target.closest(".tab-boton");
    if (!boton) return;
    activarTab(boton.dataset.tab);
  });
  function activarTab(nombreActivo) {
    contenedor.querySelectorAll(".tab-boton").forEach((b) =>
      b.classList.toggle("activo", b.dataset.tab === nombreActivo));
    contenedor.querySelectorAll(".tab-panel").forEach((p) =>
      p.classList.toggle("visible", p.dataset.panel === nombreActivo));
  }
  activarTab("proximas");
}

/** Construye la tarjeta de una reserva (textContent para todos los datos). */
function tarjetaReserva(reserva, grupo, aviso, grupos) {
  const art = document.createElement("article");
  art.className = `tarjeta-reserva estado-${grupo}`;

  const cabecera = document.createElement("div");
  cabecera.className = "tarjeta-reserva-cab";
  const nombre = document.createElement("h3");
  nombre.textContent = reserva.canchaNombre || "Cancha";
  const badge = document.createElement("span");
  badge.className = `badge-estado badge-${grupo}`;
  badge.textContent = grupo === "proximas" ? "Confirmada"
    : grupo === "pasadas" ? "Finalizada" : "Cancelada";
  cabecera.append(nombre, badge);
  art.appendChild(cabecera);

  const cuerpo = document.createElement("dl");
  cuerpo.className = "datos-reserva";
  const filas = [
    ["Tipo", reserva.canchaTipo || "—"],
    ["Ubicación", reserva.canchaUbicacion || "—"],
    ["Fecha", formatearFechaLarga(reserva.fecha)],
    ["Hora", `${reserva.horaInicio} – ${reserva.horaFin}`]
  ];
  if (typeof reserva.precio === "number") {
    filas.push(["Precio", `$${reserva.precio.toFixed(2)} (1 hora)`]);
  }
  for (const [etiqueta, valor] of filas) {
    const dt = document.createElement("dt");
    dt.textContent = etiqueta;
    const dd = document.createElement("dd");
    dd.textContent = valor;
    cuerpo.append(dt, dd);
  }
  art.appendChild(cuerpo);

  // Botón CANCELAR solo en próximas (confirmadas y futuras)
  if (grupo === "proximas") {
    const pie = document.createElement("div");
    pie.className = "tarjeta-reserva-pie";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-peligro btn-sm";
    btn.textContent = "CANCELAR";
    btn.addEventListener("click", async () => {
      const restaurar = bloquearBoton(btn, "Cancelando...");
      const ok = await confirmarModal({
        titulo: "Cancelar reserva",
        mensaje: `¿Seguro que deseas cancelar tu reserva de ${reserva.canchaNombre || "la cancha"} el ${formatearFechaLarga(reserva.fecha)} a las ${reserva.horaInicio}?`,
        textoAceptar: "Sí, cancelar reserva"
      });
      if (!ok) { restaurar(); return; }
      try {
        await cancelarReserva(reserva.id);
        mostrarMensaje(aviso, "exito",
          "Reserva cancelada. El horario vuelve a estar disponible para otros usuarios.");
        // Mover a "Canceladas" sin recargar la página
        reserva.estado = "cancelada";
        grupos.proximas = grupos.proximas.filter((r) => r.id !== reserva.id);
        grupos.canceladas.unshift(reserva);
        pintarPestanas(grupos, document.getElementById("lista-reservas"), aviso);
      } catch (error) {
        mostrarMensaje(aviso, "error", traducirErrorFirebase(
          error, error.message || "No se pudo cancelar la reserva. Inténtalo de nuevo."
        ));
        restaurar();
      }
    });
    pie.appendChild(btn);
    art.appendChild(pie);
  }

  return art;
}

/** Inicializa pages/mis-reservas.html */
export function initMisReservas() {
  const contenedor = document.getElementById("lista-reservas");
  const aviso = document.getElementById("mensaje-reservas");
  const btnRecargar = document.getElementById("btn-recargar");
  if (!contenedor || !aviso) return;

  if (btnRecargar) {
    btnRecargar.addEventListener("click", () => {
      limpiarMensaje(aviso);
      btnRecargar.disabled = true;
      cargarMisReservas(contenedor, aviso).finally(() => { btnRecargar.disabled = false; });
    });
  }

  cargarMisReservas(contenedor, aviso);
}
