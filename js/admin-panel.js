/**
 * ============================================================
 * admin-panel.js — Sprint #5: Panel de control del administrador
 * ============================================================
 * Secciones:
 *  1. Indicadores: reservas de hoy / semana / mes, canchas activas y
 *     usuarios registrados (con botón "Actualizar" y sello de hora).
 *  2. Ingresos por periodo (Hoy / Esta semana / Este mes / Rango
 *     personalizado) con desglose por cancha y fila de total.
 *
 * Reutiliza los cálculos puros de reportes.js y los helpers de utils.js.
 * La protección real de acceso son las reglas de firestore.rules; esta
 * página además exige data-page="admin" en guard.js (UX).
 */

import {
  calcularIndicadores, obtenerReservasEnRango, calcularIngresos, periodoAPrestaciones
} from "./reportes.js";
import {
  mostrarMensaje, limpiarMensaje, traducirErrorFirebase, bloquearBoton,
  formatoMoneda, formatearFechaLarga, hoyISO, esFechaValida
} from "./utils.js";

/* ---------- Indicadores ---------- */

const TARJETAS = [
  { id: "ind-hoy",      clave: "reservasHoy",    etiqueta: "Reservas de hoy",        sub: "" },
  { id: "ind-semana",   clave: "reservasSemana", etiqueta: "Reservas de la semana",  sub: "Lunes a domingo" },
  { id: "ind-mes",      clave: "reservasMes",    etiqueta: "Reservas del mes",       sub: "Mes calendario" },
  { id: "ind-canchas",  clave: "canchasActivas", etiqueta: "Canchas activas",        sub: "activa = true" },
  { id: "ind-usuarios", clave: "usuariosTotal",  etiqueta: "Usuarios registrados",   sub: "" }
];

function setTarjeta(id, valor, subTexto) {
  const num = document.getElementById(`${id}-num`);
  const sub = document.getElementById(`${id}-sub`);
  if (!num) return;
  if (valor === null || valor === undefined) {
    num.textContent = "—";
    num.classList.add("ind-error");
    if (sub) sub.textContent = "No se pudo consultar";
  } else {
    num.textContent = String(valor);
    num.classList.remove("ind-error");
    if (sub && subTexto !== undefined) sub.textContent = subTexto;
  }
}

async function cargarIndicadores() {
  const btn = document.getElementById("btn-actualizar");
  TARJETAS.forEach((t) => setTarjeta(t.id, "…", "Consultando…"));
  const restaurar = bloquearBoton(btn, "Actualizando…");
  try {
    const ind = await calcularIndicadores();
    setTarjeta("ind-hoy", ind.reservasHoy, formatearFechaLarga(hoyISO()));
    setTarjeta("ind-semana", ind.reservasSemana, "Lunes a domingo");
    setTarjeta("ind-mes", ind.reservasMes, "Mes calendario");
    setTarjeta("ind-canchas", ind.canchasActivas, "activa = true");
    setTarjeta(
      "ind-usuarios",
      ind.usuariosTotal,
      ind.usuariosActivos !== null ? `${ind.usuariosActivos} activos` : ""
    );
    const hhmm = ind.actualizadoA.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const sello = document.getElementById("sello-actualizacion");
    if (sello) sello.textContent = `Actualizado a las ${hhmm}`;
  } catch (error) {
    mostrarMensaje(
      document.getElementById("aviso-panel"),
      "error",
      traducirErrorFirebase(error, "No se pudieron cargar los indicadores. Verifica que las reglas de Firestore estén publicadas.")
    );
  } finally {
    restaurar();
  }
}

/* ---------- Ingresos ---------- */

let cargandoIngresos = false;

async function cargarIngresos() {
  if (cargandoIngresos) return;
  cargandoIngresos = true;
  const aviso = document.getElementById("aviso-ingresos");
  const contenedor = document.getElementById("detalle-ingresos");
  const selector = document.getElementById("sel-periodo");
  const desdeCampo = document.getElementById("ing-desde");
  const hastaCampo = document.getElementById("ing-hasta");
  const btn = document.getElementById("btn-aplicar-ingresos");

  limpiarMensaje(aviso);
  let desde, hasta;
  const periodo = selector.value;

  if (periodo === "personalizado") {
    desde = desdeCampo.value;
    hasta = hastaCampo.value;
    if (!esFechaValida(desde) || !esFechaValida(hasta)) {
      mostrarMensaje(aviso, "error", 'Debes seleccionar las fechas "desde" y "hasta".');
      cargandoIngresos = false;
      return;
    }
    if (desde > hasta) {
      mostrarMensaje(aviso, "error", 'La fecha "desde" no puede ser posterior a "hasta".');
      cargandoIngresos = false;
      return;
    }
  } else {
    ({ desde, hasta } = periodoAPrestaciones(periodo));
  }

  const restaurar = bloquearBoton(btn, "Calculando…");
  contenedor.innerHTML = `<div class="indicador-carga"><span class="spinner"></span> Calculando ingresos...</div>`;
  try {
    const reservas = await obtenerReservasEnRango(desde, hasta);
    const datos = calcularIngresos(reservas);
    pintarIngresos(contenedor, datos, desde, hasta);
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error", traducirErrorFirebase(
      error, "No se pudieron calcular los ingresos. Verifica sesión de admin y las reglas publicadas."
    ));
  } finally {
    restaurar();
    cargandoIngresos = false;
  }
}

/** Pinta total + tabla de desglose usando textContent (anti-XSS). */
function pintarIngresos(contenedor, datos, desde, hasta) {
  contenedor.innerHTML = "";

  const titulo = document.createElement("p");
  titulo.className = "descripcion";
  titulo.textContent = `Periodo: ${formatearFechaLarga(desde)}${desde !== hasta ? ` → ${formatearFechaLarga(hasta)}` : ""}`;
  contenedor.appendChild(titulo);

  const nota = document.createElement("p");
  nota.className = "nota-canceladas";
  nota.textContent = "Las reservas canceladas no se incluyen.";
  contenedor.appendChild(nota);

  if (datos.cantidad === 0) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    vacio.textContent = "No hay ingresos en este periodo.";
    contenedor.appendChild(vacio);
    return;
  }

  const totalBox = document.createElement("div");
  totalBox.className = "total-ingresos";
  const totalEtq = document.createElement("span");
  totalEtq.textContent = "Total de ingresos";
  const totalNum = document.createElement("strong");
  totalNum.textContent = formatoMoneda(datos.total);
  totalBox.append(totalEtq, totalNum);
  contenedor.appendChild(totalBox);

  // Tabla de desglose por cancha (mayor → menor ingreso)
  const wrap = document.createElement("div");
  wrap.className = "tabla-scroll";
  const tabla = document.createElement("table");
  tabla.className = "tabla-reservas";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  for (const texto of ["Cancha", "Tipo", "Reservas confirmadas", "Ingresos"]) {
    const th = document.createElement("th");
    th.textContent = texto;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);

  const tbody = document.createElement("tbody");
  for (const fila of datos.desglose) {
    const tr = document.createElement("tr");
    const tdNombre = document.createElement("td");
    tdNombre.textContent = fila.nombre;
    const tdTipo = document.createElement("td");
    tdTipo.textContent = fila.tipo || "—";
    const tdCant = document.createElement("td");
    tdCant.textContent = String(fila.cantidad);
    const tdIng = document.createElement("td");
    tdIng.textContent = formatoMoneda(fila.ingresos);
    tr.append(tdNombre, tdTipo, tdCant, tdIng);
    tbody.appendChild(tr);
  }
  // Fila final con el total
  const trTotal = document.createElement("tr");
  trTotal.className = "fila-total";
  const tdTotLbl = document.createElement("td");
  tdTotLbl.setAttribute("colspan", "2");
  tdTotLbl.textContent = "TOTAL";
  const tdTotCant = document.createElement("td");
  tdTotCant.textContent = String(datos.cantidad);
  const tdTotIng = document.createElement("td");
  tdTotIng.textContent = formatoMoneda(datos.total);
  trTotal.append(tdTotLbl, tdTotCant, tdTotIng);
  tbody.appendChild(trTotal);

  tabla.append(thead, tbody);
  wrap.appendChild(tabla);
  contenedor.appendChild(wrap);
}

/* ---------- Init ---------- */

export async function initAdminPanel() {
  const btnActualizar = document.getElementById("btn-actualizar");
  const selector = document.getElementById("sel-periodo");
  const btnAplicar = document.getElementById("btn-aplicar-ingresos");
  const desdeCampo = document.getElementById("ing-desde");
  const hastaCampo = document.getElementById("ing-hasta");

  if (!btnActualizar) return; // seguridad ante DOM inesperado

  btnActualizar.addEventListener("click", cargarIndicadores);

  const alternarCampos = () => {
    const personalizado = selector.value === "personalizado";
    document.getElementById("campos-personalizados").hidden = !personalizado;
    if (!personalizado) cargarIngresos();
  };
  selector.addEventListener("change", alternarCampos);
  btnAplicar.addEventListener("click", cargarIngresos);

  // Fechas máximas sugeridas para el rango personalizado
  desdeCampo.max = hoyISO();
  hastaCampo.max = hoyISO();

  await Promise.all([cargarIndicadores(), cargarIngresos()]);
}
