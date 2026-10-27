/**
 * ============================================================
 * admin-reportes.js — Sprint #5: Generar, exportar e imprimir reportes
 * ============================================================
 * Flujo:
 *  1. El administrador elige un rango de fechas (validación: desde ≤ hasta,
 *     máximo 366 días) y pulsa "GENERAR REPORTE".
 *  2. Se consultan las reservas del rango (where sobre un solo campo
 *     "fecha" → sin índice compuesto) y se cruza usuarioId con la
 *     colección usuarios cargada UNA sola vez en un mapa en memoria.
 *  3. Se muestra resumen (total / confirmadas / canceladas / ingresos) +
 *     detalle ordenado por fecha y hora.
 *  4. "Exportar CSV" reutiliza utils.exportarCSV (BOM UTF-8, escape de
 *     comillas y anti-inyección de fórmulas). Nombre:
 *     reporte-reservas_DESDE_a_HASTA.csv, con el resumen al inicio.
 *  5. "Imprimir" usa window.print(); el @media print de styles.css deja
 *     solo título, rango, resumen y tabla.
 *
 * Si el rango no tiene reservas → mensaje "No hay datos para ese periodo"
 * y los botones de exportar/imprimir quedan deshabilitados.
 */

import {
  obtenerReservasEnRango, cargarMapaUsuarios, generarReporte, validarRango
} from "./reportes.js";
import {
  mostrarMensaje, limpiarMensaje, traducirErrorFirebase, bloquearBoton,
  formatoMoneda, formatearFechaLarga, hoyISO, exportarCSV
} from "./utils.js";

let ultimoReporte = null; // { desde, hasta, resumen, detalle } | null

/* ---------- Render ---------- */

function crearDatoResumen(etiqueta, valor) {
  const div = document.createElement("div");
  div.className = "resumen-dato";
  const strong = document.createElement("strong");
  strong.textContent = valor;
  const span = document.createElement("span");
  span.textContent = etiqueta;
  div.append(strong, span);
  return div;
}

function pintarReporte(contenedor, reporte) {
  contenedor.innerHTML = "";

  const titulo = document.createElement("h2");
  titulo.textContent = `Reporte: ${formatearFechaLarga(reporte.desde)} → ${formatearFechaLarga(reporte.hasta)}`;
  contenedor.appendChild(titulo);

  // Resumen
  const resumen = document.createElement("div");
  resumen.className = "resumen-reporte";
  resumen.append(
    crearDatoResumen("Total de reservas", String(reporte.resumen.total)),
    crearDatoResumen("Confirmadas", String(reporte.resumen.confirmadas)),
    crearDatoResumen("Canceladas", String(reporte.resumen.canceladas)),
    crearDatoResumen("Ingresos (confirmadas)", formatoMoneda(reporte.resumen.ingresos))
  );
  contenedor.appendChild(resumen);

  // Detalle (tabla con scroll horizontal en escritorio / tarjetas apiladas en móvil)
  const wrap = document.createElement("div");
  wrap.className = "tabla-scroll";
  const tabla = document.createElement("table");
  tabla.className = "tabla-reservas";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  for (const texto of ["Fecha", "Hora", "Cancha", "Usuario", "Precio", "Estado"]) {
    const th = document.createElement("th");
    th.textContent = texto;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);

  const tbody = document.createElement("tbody");
  for (const f of reporte.detalle) {
    const tr = document.createElement("tr");

    const tdFecha = document.createElement("td");
    tdFecha.textContent = f.fecha;

    const tdHora = document.createElement("td");
    tdHora.textContent = `${f.horaInicio} – ${f.horaFin}`;

    const tdCancha = document.createElement("td");
    tdCancha.textContent = f.cancha;
    if (f.tipo) {
      const small = document.createElement("small");
      small.textContent = ` ${f.tipo}`;
      tdCancha.appendChild(small);
    }

    const tdUsuario = document.createElement("td");
    tdUsuario.textContent = f.usuarioNombre;
    const smallCorreo = document.createElement("small");
    smallCorreo.textContent = ` ${f.usuarioCorreo}`;
    tdUsuario.appendChild(smallCorreo);

    const tdPrecio = document.createElement("td");
    tdPrecio.textContent = formatoMoneda(f.precio);

    const tdEstado = document.createElement("td");
    tdEstado.textContent = f.estado;

    tr.append(tdFecha, tdHora, tdCancha, tdUsuario, tdPrecio, tdEstado);
    tbody.appendChild(tr);
  }

  tabla.append(thead, tbody);
  wrap.appendChild(tabla);
  contenedor.appendChild(wrap);
}

/* ---------- Acciones ---------- */

async function generarYMostrar() {
  const aviso = document.getElementById("aviso-reportes");
  const contenedor = document.getElementById("resultado-reporte");
  const btnGenerar = document.getElementById("btn-generar");
  const btnCsv = document.getElementById("btn-csv");
  const btnImprimir = document.getElementById("btn-imprimir");
  const desdeInput = document.getElementById("r-desde");
  const hastaInput = document.getElementById("r-hasta");
  const desde = desdeInput.value;
  const hasta = hastaInput.value;

  limpiarMensaje(aviso);

  const errorValidacion = validarRango(desde, hasta);
  if (errorValidacion) {
    mostrarMensaje(aviso, "error", errorValidacion);
    return;
  }

  ultimoReporte = null;
  btnCsv.disabled = true;
  btnImprimir.disabled = true;

  // Deshabilitar todos los botones mientras se procesa.
  const restaurarGenerar = bloquearBoton(btnGenerar, "Generando…");
  btnCsv.disabled = true;
  btnImprimir.disabled = true;
  contenedor.innerHTML = `<div class="indicador-carga"><span class="spinner"></span> Consultando reservas del rango...</div>`;
  try {
    const [reservas, mapaUsuarios] = await Promise.all([
      obtenerReservasEnRango(desde, hasta),
      cargarMapaUsuarios()
    ]);

    if (reservas.length === 0) {
      contenedor.innerHTML = "";
      mostrarMensaje(aviso, "exito", "No hay datos para ese periodo.");
      return; // exportar/imprimir siguen deshabilitados (ultimoReporte = null)
    }

    const { resumen, detalle } = generarReporte(reservas, mapaUsuarios);
    ultimoReporte = { desde, hasta, resumen, detalle };
    pintarReporte(contenedor, ultimoReporte);
    btnCsv.disabled = false;
    btnImprimir.disabled = false;
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error", traducirErrorFirebase(
      error,
      "No se pudo generar el reporte. Verifica sesión de admin y que las reglas de Firestore estén publicadas."
    ));
  } finally {
    restaurarGenerar();
  }
}

function exportarCSVDelReporte() {
  if (!ultimoReporte) return;
  const { resumen, detalle, desde, hasta } = ultimoReporte;
  // El CSV incluye primero las filas del resumen y luego el detalle con su
  // propia fila de cabecera → se pasa `cabeceras` vacío a exportarCSV.
  const filas = [
    ["REPORTE DE RESERVAS", "", "", "", "", "", "", "", ""],
    ["Desde", desde, "Hasta", hasta, "", "", "", "", ""],
    ["Total de reservas", resumen.total, "Confirmadas", resumen.confirmadas,
     "Canceladas", resumen.canceladas, "Ingresos (solo confirmadas)", resumen.ingresos, ""],
    ["", "", "", "", "", "", "", "", ""],
    ["Fecha", "Hora inicio", "Hora fin", "Cancha", "Tipo", "Usuario", "Correo", "Precio", "Estado"]
  ];
  for (const f of detalle) {
    filas.push([f.fecha, f.horaInicio, f.horaFin, f.cancha, f.tipo, f.usuarioNombre, f.usuarioCorreo, f.precio, f.estado]);
  }
  exportarCSV(
    `reporte-reservas_${desde}_a_${hasta}.csv`,
    [],
    filas
  );
}

/* ---------- Init ---------- */

export function initAdminReportes() {
  const btnGenerar = document.getElementById("btn-generar");
  if (!btnGenerar) return;

  const desde = document.getElementById("r-desde");
  const hasta = document.getElementById("r-hasta");
  const btnCsv = document.getElementById("btn-csv");
  const btnImprimir = document.getElementById("btn-imprimir");

  // Rango inicial sugerido: lo que va del mes en curso (locales).
  desde.value = "";
  hasta.value = "";
  hasta.max = hoyISO();

  btnGenerar.addEventListener("click", generarYMostrar);
  btnCsv.addEventListener("click", exportarCSVDelReporte);
  btnImprimir.addEventListener("click", () => window.print());
}
