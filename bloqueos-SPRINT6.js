/**
 * ============================================================
 * bloqueos.js — Bloqueo de horarios (Sprint #6)
 * ============================================================
 * Colección "bloqueos": UN DOCUMENTO POR CADA HORA bloqueada, con el
 * MISMO ID determinista que las reservas: `${canchaId}_${fecha}_${horaInicio}`.
 *
 * ¿Por qué el mismo ID? Así la transacción de crearReserva puede leer
 * directamente bloqueos/{mismoID} (las transacciones del cliente solo
 * permiten leer por referencia, no por consulta) y las reglas de
 * Firestore pueden verificar con exists() que no haya bloqueo. Un
 * horario bloqueado queda protegido de verdad, también en condiciones
 * de carrera.
 *
 * Modelo del documento:
 *   { canchaId, canchaNombre, fecha "YYYY-MM-DD", horaInicio "HH:mm",
 *     horaFin "HH:mm" (una hora después), motivo (obligatorio),
 *     grupoId (compartido por los bloques de una misma operación),
 *     rangoInicio, rangoFin ("HH:mm" del bloqueo completo),
 *     creadoPor (UID admin), creadoEn (serverTimestamp) }
 */

import { db } from "./firebase-config.js";
import {
  collection, doc, getDocs, query, where, runTransaction, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { hoyISO, esFechaValida, esHoraValida, horasDelRango, minutosAHora, horaAMinutos } from "./utils.js";
import { idReserva } from "./reservas.js";

/* ---------- Consultas ---------- */

/**
 * Bloqueos de una cancha en una fecha exacta.
 * Dos igualdades sobre canchaId + fecha → NO requiere índice compuesto.
 */
export async function listarBloqueosDeCanchaYFecha(canchaId, fecha) {
  const q = query(
    collection(db, "bloqueos"),
    where("canchaId", "==", canchaId),
    where("fecha", "==", fecha)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Todos los bloqueos VIGENTES (desde hoy en adelante).
 * Rango sobre un único campo `fecha` → sin índice compuesto.
 * @param {string} [canchaId] filtro opcional por cancha (en cliente).
 * @param {string} [fecha] filtro opcional por fecha exacta (en cliente).
 */
export async function listarBloqueosVigentes(canchaId = "", fecha = "") {
  const q = query(
    collection(db, "bloqueos"),
    where("fecha", ">=", hoyISO())
  );
  const snap = await getDocs(q);
  let bloqueos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (canchaId) bloqueos = bloqueos.filter((b) => b.canchaId === canchaId);
  if (fecha) bloqueos = bloqueos.filter((b) => b.fecha === fecha);
  return bloqueos;
}

/**
 * Agrupa documentos de bloqueo por grupoId (una fila por operación de
 * bloqueo, mostrando el rango horario completo). Orden por fecha asc.
 */
export function agruparBloqueos(bloqueos) {
  const mapa = new Map();
  for (const b of bloqueos) {
    const clave = `${b.grupoId || b.id}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        grupoId: clave,
        canchaId: b.canchaId,
        canchaNombre: b.canchaNombre || "Cancha",
        fecha: b.fecha,
        rangoInicio: b.rangoInicio || b.horaInicio,
        rangoFin: b.rangoFin || b.horaFin,
        motivo: b.motivo || "—",
        creadoPor: b.creadoPor || "",
        horas: []
      });
    }
    const grupo = mapa.get(clave);
    grupo.horas.push(b.horaInicio);
    // Por si algún documento tuviera rango inconsistente, tomamos el mínimo/máximo real.
    if (b.horaInicio < grupo.rangoInicio) grupo.rangoInicio = b.horaInicio;
    if ((b.horaFin || b.horaInicio) > grupo.rangoFin) grupo.rangoFin = b.horaFin || b.horaInicio;
  }
  const grupos = [...mapa.values()];
  grupos.sort((a, b) =>
    `${a.fecha}${a.rangoInicio}`.localeCompare(`${b.fecha}${b.rangoInicio}`));
  return grupos;
}

/* ---------- Creación con transacción ---------- */

/**
 * Errores de negocio de crearBloqueo(): se lanzan con .code para que la
 * interfaz distinga entre "hay reservas confirmadas", "ya bloqueado" y
 * errores técnicos.
 */
export class ErrorBloqueo extends Error {
  constructor(code, message, detalles = []) {
    super(message);
    this.code = code;
    this.detalles = detalles;
  }
}

/**
 * Bloquea un rango de horas de una cancha en UNA sola transacción.
 *
 * Regla de las transacciones de Firestore: TODAS las lecturas van antes
 * de las escrituras. Se leen primero reservas/{id} y bloqueos/{id} de
 * cada hora; si algo impide el bloqueo se aborta sin escribir nada.
 *
 * @param {object} cancha  - { id, nombre, horaApertura, horaCierre, activa }
 * @param {string} fecha   - "YYYY-MM-DD" (no pasada)
 * @param {string} inicio  - "HH:mm" en punto
 * @param {string} fin     - "HH:mm" en punto, posterior a inicio
 * @param {string} motivo  - 3 a 200 caracteres
 * @param {string} uidAdmin - UID del administrador que crea el bloqueo
 * @returns {Promise<{grupoId: string, horas: string[]}>}
 */
export async function crearBloqueo(cancha, fecha, inicio, fin, motivo, uidAdmin) {
  /* ----- Validaciones previas (sin tocar Firestore) ----- */
  if (!cancha) throw new ErrorBloqueo("sin-cancha", "Selecciona una cancha válida.");
  if (!esFechaValida(fecha)) throw new ErrorBloqueo("fecha-invalida", "La fecha seleccionada no es válida.");
  if (fecha < hoyISO()) throw new ErrorBloqueo("fecha-pasada", "No se pueden bloquear fechas pasadas.");
  if (!esHoraValida(inicio) || !esHoraValida(fin)) {
    throw new ErrorBloqueo("hora-invalida", "Las horas seleccionadas no son válidas.");
  }
  if (!/:00$/.test(inicio) || !/:00$/.test(fin)) {
    throw new ErrorBloqueo("hora-no-punto", "Las horas deben ser en punto (bloques de 1 hora, ej. 18:00).");
  }
  const horas = horasDelRango(inicio, fin);
  if (!horas.length) {
    throw new ErrorBloqueo("rango-invalido", "La hora de fin debe ser posterior a la de inicio.");
  }

  const ap = Number(cancha.horaApertura?.split(":")[0]);
  const ci = Number(cancha.horaCierre?.split(":")[0]);
  const iniH = Number(inicio.split(":")[0]);
  const finH = Number(fin.split(":")[0]);
  if (Number.isFinite(ap) && Number.isFinite(ci) && (iniH < ap || finH > ci)) {
    throw new ErrorBloqueo(
      "fuera-horario",
      `El rango está fuera del horario de atención de la cancha (${cancha.horaApertura}–${cancha.horaCierre}).`
    );
  }

  const motivoLimpio = (motivo || "").trim();
  if (motivoLimpio.length < 3 || motivoLimpio.length > 200) {
    throw new ErrorBloqueo("motivo-invalido", "El motivo debe tener entre 3 y 200 caracteres.");
  }

  /* ----- Transacción: todas las lecturas antes de las escrituras ----- */
  const refsReservas = horas.map((h) => doc(db, "reservas", idReserva(cancha.id, fecha, h)));
  const refsBloqueos = horas.map((h) => doc(db, "bloqueos", idReserva(cancha.id, fecha, h)));
  const grupoId = doc(collection(db, "bloqueos")).id; // ID generado sin escribir

  await runTransaction(db, async (transaccion) => {
    // 1) LECTURAS
    const reservasSnap = [];
    const bloqueosSnap = [];
    for (const ref of refsReservas) reservasSnap.push(await transaccion.get(ref));
    for (const ref of refsBloqueos) bloqueosSnap.push(await transaccion.get(ref));

    // 2) RESERVAS CONFIRMADAS impiden el bloqueo (las canceladas NO)
    const horasConReserva = [];
    reservasSnap.forEach((snap, i) => {
      if (snap.exists() && snap.data().estado === "confirmada") horasConReserva.push(horas[i]);
    });
    if (horasConReserva.length) {
      throw new ErrorBloqueo(
        "reservas-confirmadas",
        `Hay reservas confirmadas en estos horarios (${horasConReserva.join(", ")}). Cancélalas primero desde Reservas.`,
        horasConReserva
      );
    }

    // 3) HORARIOS YA BLOQUEADOS
    const horasYaBloqueadas = [];
    bloqueosSnap.forEach((snap, i) => {
      if (snap.exists()) horasYaBloqueadas.push(horas[i]);
    });
    if (horasYaBloqueadas.length) {
      throw new ErrorBloqueo(
        "ya-bloqueado",
        `Esos horarios ya están bloqueados (${horasYaBloqueadas.join(", ")}).`,
        horasYaBloqueadas
      );
    }

    // 4) ESCRITURAS: un documento por hora, mismo grupoId.
    //    horaFin de cada bloque = una hora después de su horaInicio.
    refsBloqueos.forEach((ref, i) => {
      transaccion.set(ref, {
        canchaId: cancha.id,
        canchaNombre: cancha.nombre || "",
        fecha,
        horaInicio: horas[i],
        horaFin: minutosAHora(horaAMinutos(horas[i]) + 60),
        motivo: motivoLimpio,
        grupoId,
        rangoInicio: inicio,
        rangoFin: fin,
        creadoPor: uidAdmin,
        creadoEn: serverTimestamp()
      });
    });
  });

  return { grupoId, horas };
}

/* ---------- Levantar (eliminar) un bloqueo ---------- */

/**
 * Elimina TODOS los documentos del grupo de bloqueo con writeBatch.
 * @param {Array<string>} ids - IDs de documentos del grupo (hora por hora).
 */
export async function levantarBloqueo(ids) {
  if (!ids || !ids.length) throw new ErrorBloqueo("sin-ids", "No hay horarios que levantar.");
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(doc(db, "bloqueos", id));
  await batch.commit();
}
