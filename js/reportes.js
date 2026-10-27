/**
 * ============================================================
 * reportes.js — Cálculos del Sprint #5 (Panel de control y Reportes)
 * ============================================================
 * Todo se calcula leyendo las colecciones existentes (reservas, canchas,
 * usuarios). NO se crean colecciones nuevas ni se cambia el modelo.
 *
 * Decisiones técnicas:
 *  - Fechas en HORA LOCAL: los strings "YYYY-MM-DD" se generan con helpers
 *    de utils.js que usan getFullYear/getMonth/getDate (nunca toISOString(),
 *    que convierte a UTC y en Colombia UTC-5 devolvería el día equivocado).
 *  - Semana de lunes a domingo.
 *  - Consultas por rango: `fecha` es string ordenable, así que basta un
 *    único campo en el where (>= desde, <= hasta) → sin índice compuesto.
 *    El estado se filtra en el cliente.
 *  - Contadores de canchas/usuarios con getCountFromServer (no descarga
 *    todos los documentos).
 *  - Ingresos: suma `precio` SOLO de reservas confirmadas; si el precio no
 *    existe o no es número, cuenta como 0. Las canceladas nunca suman.
 */

import { db } from "./firebase-config.js";
import {
  collection, getDocs, query, where, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  hoyISO, inicioSemanaISO, finSemanaISO, inicioMesISO, finMesISO, esFechaValida
} from "./utils.js";

export const MAX_DIAS_RANGO = 366;

/* ---------- Consultas por rango ---------- */

/**
 * Devuelve todas las reservas cuya fecha esté entre `desde` y `hasta`
 * (inclusive), como array de objetos {id, ...datos}.
 * Usa where sobre UN solo campo ("fecha") → no requiere índice compuesto.
 */
export async function obtenerReservasEnRango(desde, hasta) {
  if (!esFechaValida(desde) || !esFechaValida(hasta)) {
    throw new Error("Fechas del rango inválidas.");
  }
  const q = query(
    collection(db, "reservas"),
    where("fecha", ">=", desde),
    where("fecha", "<=", hasta)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Carga la colección `usuarios` una sola vez como mapa uid → datos. */
export async function cargarMapaUsuarios() {
  const mapa = new Map();
  const snap = await getDocs(collection(db, "usuarios"));
  for (const d of snap.docs) mapa.set(d.id, d.data());
  return mapa;
}

/* ---------- Indicadores del panel ---------- */

/**
 * Calcula los cinco indicadores del panel de control consultando Firestore
 * al momento (sin caché):
 *   - reservasHoy / reservasSemana / reservasMes: solo estado "confirmada".
 *   - canchasActivas: documentos con activa == true (getCountFromServer).
 *   - usuariosTotal / usuariosActivos: total y con activo != false.
 * Cada consulta es independiente: si una falla, las demás se conservan
 * (se devuelve null en la que falló para que la UI muestre el error local).
 */
export async function calcularIndicadores() {
  const hoy = hoyISO();
  const [iniSem, finSem] = [inicioSemanaISO(), finSemanaISO()];
  const [iniMes, finMes] = [inicioMesISO(), finMesISO()];

  const contarConfirmadas = async (desde, hasta) => {
    const lista = await obtenerReservasEnRango(desde, hasta);
    return lista.filter((r) => r.estado === "confirmada").length;
  };

  const [reservasHoy, reservasSemana, reservasMes, resCanchas, resUsuarios] =
    await Promise.allSettled([
      contarConfirmadas(hoy, hoy),
      contarConfirmadas(iniSem, finSem),
      contarConfirmadas(iniMes, finMes),
      getCountFromServer(query(collection(db, "canchas"), where("activa", "==", true))),
      getDocs(collection(db, "usuarios"))
    ]);

  let usuariosTotal = null;
  let usuariosActivos = null;
  if (resUsuarios.status === "fulfilled") {
    const docs = resUsuarios.value.docs.map((d) => d.data());
    usuariosTotal = docs.length;
    // undefined se trata como activo (usuarios anteriores al Sprint #4)
    usuariosActivos = docs.filter((u) => u.activo !== false).length;
  }

  return {
    reservasHoy: valor(reservasHoy),
    reservasSemana: valor(reservasSemana),
    reservasMes: valor(reservasMes),
    canchasActivas: resCanchas.status === "fulfilled" ? resCanchas.value.data().count : null,
    usuariosTotal,
    usuariosActivos,
    actualizadoA: new Date()
  };
}

function valor(settled) {
  return settled.status === "fulfilled" ? settled.value : null;
}

/* ---------- Ingresos ---------- */

/** Precio numérico seguro: si no existe o no es número → 0. */
export function precioSeguro(r) {
  const n = Number(r.precio);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Calcula los ingresos de un rango: solo reservas CONFIRMADAS suman.
 * Devuelve:
 *   { total, cantidad, desglose: [{canchaId, nombre, tipo, cantidad, ingresos}] }
 * El desglose viene ordenado de mayor a menor ingreso.
 */
export function calcularIngresos(reservas) {
  const confirmadas = reservas.filter((r) => r.estado === "confirmada");
  const porCancha = new Map();

  for (const r of confirmadas) {
    const clave = r.canchaId || r.canchaNombre || "sin-cancha";
    if (!porCancha.has(clave)) {
      porCancha.set(clave, {
        canchaId: clave,
        nombre: r.canchaNombre || "Cancha sin nombre",
        tipo: r.canchaTipo || "",
        cantidad: 0,
        ingresos: 0
      });
    }
    const fila = porCancha.get(clave);
    fila.cantidad += 1;
    fila.ingresos += precioSeguro(r);
  }

  const desglose = [...porCancha.values()].sort((a, b) => b.ingresos - a.ingresos);
  const total = desglose.reduce((s, f) => s + f.ingresos, 0);
  return { total, cantidad: confirmadas.length, desglose };
}

/** Periodos predefinidos del selector de ingresos (fechas locales ISO). */
export function periodoAPrestaciones(periodo) {
  switch (periodo) {
    case "hoy":     return { desde: hoyISO(), hasta: hoyISO() };
    case "semana":  return { desde: inicioSemanaISO(), hasta: finSemanaISO() };
    case "mes":     return { desde: inicioMesISO(), hasta: finMesISO() };
    default:        return null; // personalizado → el llamador usa sus campos
  }
}

/* ---------- Reporte por rango ---------- */

/**
 * Valida un rango de fechas introducido por el administrador.
 * @returns {string|null} mensaje de error en español, o null si es válido.
 */
export function validarRango(desde, hasta) {
  if (!esFechaValida(desde) || !esFechaValida(hasta)) {
    return "Debes seleccionar las fechas desde y hasta.";
  }
  if (desde > hasta) {
    return 'La fecha "desde" no puede ser posterior a "hasta".';
  }
  const dias = Math.round(
    (new Date(`${hasta}T12:00:00`) - new Date(`${desde}T12:00:00`)) / 86400000
  ) + 1;
  if (dias > MAX_DIAS_RANGO) {
    return `El rango máximo permitido es de ${MAX_DIAS_RANGO} días.`;
  }
  return null;
}

/**
 * Genera el resumen + detalle de un reporte de reservas.
 * Cruza usuarioId con el mapa de usuarios (cargado una sola vez) para
 * nombre/correo; si no existe → "Usuario no disponible".
 */
export function generarReporte(reservas, mapaUsuarios) {
  const confirmadas = reservas.filter((r) => r.estado === "confirmada");
  const canceladas = reservas.filter((r) => r.estado === "cancelada");
  const ingresos = confirmadas.reduce((s, r) => s + precioSeguro(r), 0);

  const detalle = reservas
    .map((r) => {
      const u = mapaUsuarios.get(r.usuarioId);
      return {
        fecha: r.fecha || "",
        horaInicio: r.horaInicio || "",
        horaFin: r.horaFin || "",
        cancha: r.canchaNombre || "Cancha sin nombre",
        tipo: r.canchaTipo || "",
        usuarioNombre: u && u.nombre ? u.nombre : "Usuario no disponible",
        usuarioCorreo: u && u.correo ? u.correo : "—",
        precio: precioSeguro(r),
        estado: r.estado === "cancelada" ? "Cancelada" : r.estado === "confirmada" ? "Confirmada" : (r.estado || "")
      };
    })
    .sort((a, b) =>
      `${a.fecha}T${a.horaInicio}`.localeCompare(`${b.fecha}T${b.horaInicio}`)
    );

  return {
    resumen: {
      total: reservas.length,
      confirmadas: confirmadas.length,
      canceladas: canceladas.length,
      ingresos
    },
    detalle
  };
}
