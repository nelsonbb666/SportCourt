/**
 * ============================================================
 * admin-reservas.js — Panel de administrador: todas las reservas
 * ============================================================
 * Sprint #4. Funcionalidades:
 *  - Listar TODAS las reservas (colección "reservas").
 *  - Cruzar usuarioId con la colección "usuarios" (cargada una sola vez
 *    en un mapa en memoria) para mostrar nombre y correo del reserva.
 *  - Filtros EN EL CLIENTE (rango de fechas, cancha, estado, búsqueda por
 *    nombre/correo) → evita índices compuestos de Firestore.
 *  - Orden fecha+hora invertible, contadores resumen, paginación "Cargar más".
 *  - Cancelar reservas de otros usuarios (cancelarReservaComoAdmin).
 *  - Exportar CSV de las reservas filtradas (utils.exportarCSV).
 *
 * Seguridad: la protección real son las reglas de firestore.rules; aquí solo
 * se ocultan acciones que el backend ya rechazaría si faltara el rol admin.
 */

import { db } from "./firebase-config.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import { cancelarReservaComoAdmin } from "./reservas.js";
import { esAdmin } from "./guard.js";
import {
  mostrarMensaje, limpiarMensaje, traducirErrorFirebase, bloquearBoton,
  formatearFechaLarga, hoyISO, fechaHoraEsPasada, exportarCSV,
  etiquetaEstadoReserva, claseBadgeReserva, confirmarModal
} from "./utils.js";

const TAMANO_PAGINA = 25;

/* ---------- Estado en memoria ---------- */

let todas = [];          // reservas [{id, ...datos}]
let mapaUsuarios = null; // uid → {nombre, correo} (se carga una sola vez)
let visibles = 0;        // paginación "Cargar más"
let ordenDesc = true;    // ↓ más recientes primero

/* ---------- Carga de datos ---------- */

async function cargarMapaUsuarios() {
  if (mapaUsuarios) return mapaUsuarios;
  mapaUsuarios = new Map();
  const snap = await getDocs(collection(db, "usuarios"));
  for (const d of snap.docs) {
    const u = d.data();
    mapaUsuarios.set(d.id, { nombre: u.nombre || "", correo: u.correo || "" });
  }
  return mapaUsuarios;
}

async function cargarReservas(contenedor, aviso) {
  contenedor.innerHTML = `<div class="indicador-carga"><span class="spinner"></span> Cargando reservas...</div>`;
  try {
    const [snapR] = await Promise.all([
      getDocs(collection(db, "reservas")),
      cargarMapaUsuarios()
    ]);
    todas = snapR.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizar(contenedor, aviso);
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error", traducirErrorFirebase(
      error,
      "No se pudieron cargar las reservas. Verifica sesión de admin y las reglas publicadas."
    ));
  }
}

/* ---------- Filtros ---------- */

function leerFiltros() {
  return {
    desde: document.getElementById("f-desde").value || "",
    hasta: document.getElementById("f-hasta").value || "",
    cancha: document.getElementById("f-cancha").value || "",
    estado: document.getElementById("f-estado").value || "",
    busqueda: (document.getElementById("f-busqueda").value || "").trim().toLowerCase()
  };
}

function estadoDe(r) {
  if (r.estado === "cancelada") return "cancelada";
  return fechaHoraEsPasada(r.fecha, r.horaFin || r.horaInicio) ? "pasada" : "confirmada";
}

function aplicarFiltros() {
  const f = leerFiltros();
  let lista = todas.filter((r) => {
    if (f.desde && r.fecha < f.desde) return false;
    if (f.hasta && r.fecha > f.hasta) return false;
    if (f.cancha && r.canchaId !== f.cancha) return false;
    if (f.estado && estadoDe(r) !== f.estado) return false;
    if (f.busqueda) {
      const u = mapaUsuarios?.get(r.usuarioId) || {};
      const texto = `${u.nombre || ""} ${u.correo || ""} ${r.canchaNombre || ""}`.toLowerCase();
      if (!texto.includes(f.busqueda)) return false;
    }
    return true;
  });
  const clave = (r) => `${r.fecha || ""}T${r.horaInicio || "00:00"}`;
  lista.sort((a, b) => ordenDesc ? clave(b).localeCompare(clave(a)) : clave(a).localeCompare(clave(b)));
  return lista;
}

/* ---------- Contadores ---------- */

function pintarContadores(lista) {
  const cont = document.getElementById("contadores");
  if (!cont) return;
  const hoy = hoyISO();
  document.getElementById("c-total").textContent = String(lista.length);
  document.getElementById("c-confirmadas").textContent = String(lista.filter((r) => estadoDe(r) === "confirmada").length);
  document.getElementById("c-canceladas").textContent = String(lista.filter((r) => r.estado === "cancelada").length);
  document.getElementById("c-hoy").textContent = String(lista.filter((r) => r.fecha === hoy).length);
  cont.hidden = false;
}

/* ---------- Render: tabla en escritorio, tarjetas en móvil ---------- */

function filaDatos(r) {
  const u = mapaUsuarios?.get(r.usuarioId);
  return {
    usuario: u ? u.nombre : "Usuario no disponible",
    correo: u ? u.correo : "—",
    cancha: r.canchaNombre || "—",
    tipo: r.canchaTipo || "—",
    fecha: r.fecha || "",
    hora: `${r.horaInicio || "—"} – ${r.horaFin || "—"}`,
    precio: typeof r.precio === "number" ? `$${r.precio.toFixed(2)}` : "—",
    estado: estadoDe(r),
    reserva: r
  };
}

function crearBadge(texto, clase) {
  const badge = document.createElement("span");
  badge.className = `badge-estado ${clase}`;
  badge.textContent = texto; // textContent → anti-XSS
  return badge;
}

function renderizar(contenedor, aviso) {
  const lista = aplicarFiltros();
  pintarContadores(lista);
  contenedor.innerHTML = "";

  if (!lista.length) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    const h = document.createElement("h3");
    h.textContent = todas.length
      ? "No hay reservas con esos filtros"
      : "Aún no hay reservas registradas";
    vacio.appendChild(h);
    const p = document.createElement("p");
    p.textContent = todas.length
      ? "Prueba a ampliar el rango de fechas o limpiar los filtros."
      : "Cuando los usuarios reserven horarios, aparecerán aquí.";
    vacio.appendChild(p);
    contenedor.appendChild(vacio);
    ocultarCargarMas();
    return;
  }

  visibles = Math.min(visibles || TAMANO_PAGINA, lista.length);
  visibles = visibles >= lista.length ? Math.min(TAMANO_PAGINA, lista.length) : visibles;

  const envoltorio = document.createElement("div");
  envoltorio.className = "tabla-responsive";

  const tabla = document.createElement("table");
  tabla.className = "tabla-reservas";
  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  for (const titulo of ["Usuario", "Cancha", "Fecha", "Hora", "Precio", "Estado", "Acciones"]) {
    const th = document.createElement("th");
    th.textContent = titulo;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const r of lista.slice(0, visibles)) {
    const d = filaDatos(r);
    const tr = document.createElement("tr");
    tr.classList.add("fila-reserva-movil"); // en móvil cada fila se ve como tarjeta

    // Usuario (nombre + correo en dos líneas)
    const tdUsuario = document.createElement("td");
    tdUsuario.setAttribute("data-label", "Usuario");
    const strong = document.createElement("strong");
    strong.textContent = d.usuario;
    const small = document.createElement("small");
    small.textContent = d.correo;
    tdUsuario.append(strong, document.createElement("br"), small);
    tr.appendChild(tdUsuario);

    // Cancha (nombre + tipo)
    const tdCancha = document.createElement("td");
    tdCancha.setAttribute("data-label", "Cancha");
    const cn = document.createElement("strong");
    cn.textContent = d.cancha;
    const ct = document.createElement("small");
    ct.textContent = d.tipo;
    tdCancha.append(cn, document.createElement("br"), ct);
    tr.appendChild(tdCancha);

    // Fecha legible en español
    const tdFecha = document.createElement("td");
    tdFecha.setAttribute("data-label", "Fecha");
    tdFecha.textContent = formatearFechaLarga(d.fecha);
    tr.appendChild(tdFecha);

    // Hora
    const tdHora = document.createElement("td");
    tdHora.setAttribute("data-label", "Hora");
    tdHora.textContent = d.hora;
    tr.appendChild(tdHora);

    // Precio
    const tdPrecio = document.createElement("td");
    tdPrecio.setAttribute("data-label", "Precio");
    tdPrecio.textContent = d.precio;
    tr.appendChild(tdPrecio);

    // Estado (color + texto)
    const tdEstado = document.createElement("td");
    tdEstado.setAttribute("data-label", "Estado");
    tdEstado.appendChild(crearBadge(
      etiquetaEstadoReserva(d.reserva.estado, d.estado === "pasada"),
      claseBadgeReserva(d.reserva.estado, d.estado === "pasada")
    ));
    tr.appendChild(tdEstado);

    // Acciones: CANCELAR solo en confirmadas y futuras
    const tdAccion = document.createElement("td");
    tdAccion.setAttribute("data-label", "Acciones");
    if (d.estado === "confirmada") {
      tdAccion.appendChild(crearBotonCancelar(d.reserva, aviso, contenedor));
    } else {
      tdAccion.textContent = "—";
    }
    tr.appendChild(tdAccion);

    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
  envoltorio.appendChild(tabla);
  contenedor.appendChild(envoltorio);

  // Botón "Cargar más"
  const btnMas = document.getElementById("btn-cargar-mas");
  if (btnMas) {
    if (visibles < lista.length) {
      btnMas.hidden = false;
      btnMas.textContent = `Cargar más reservas (${lista.length - visibles} restantes)`;
      btnMas.onclick = () => { visibles += TAMANO_PAGINA; renderizar(contenedor, aviso); };
    } else {
      ocultarCargarMas();
    }
  }
}

function ocultarCargarMas() {
  const btnMas = document.getElementById("btn-cargar-mas");
  if (btnMas) btnMas.hidden = true;
}

/* ---------- Cancelar como admin (modal con motivo opcional) ---------- */

function crearBotonCancelar(reserva, aviso, contenedor) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-peligro btn-sm";
  btn.textContent = "CANCELAR";

  btn.addEventListener("click", async () => {
    const restaurar = bloquearBoton(btn, "Cancelando...");

    // Modal propio con los datos de la reserva + campo de motivo opcional.
    const ok = await confirmarModal({
      titulo: "Cancelar reserva de usuario",
      mensaje: `¿Seguro que deseas cancelar la reserva de ${reserva.canchaNombre || "la cancha"} el ${formatearFechaLarga(reserva.fecha)} a las ${reserva.horaInicio}? Se liberará el horario y el usuario verá la reserva como cancelada.`,
      contenido: [
        { etiqueta: "Usuario", valor: nombreCorreoDe(reserva.usuarioId) },
        { etiqueta: "Horario", valor: `${reserva.horaInicio} – ${reserva.horaFin}` }
      ],
      textoAceptar: "Sí, cancelar reserva",
      campoOpcional: { etiqueta: "Motivo (opcional)", placeholder: "ej.: reprogramación de la cancha" }
    });
    if (!ok) { restaurar(); return; }

    const motivo = document.getElementById("modal-input-valor")?.value || "";
    try {
      await cancelarReservaComoAdmin(reserva.id, motivo);
      mostrarMensaje(aviso, "exito", "✅ Reserva cancelada. El horario vuelve a estar disponible.");
      // Actualización local sin recargar toda la página
      reserva.estado = "cancelada";
      reserva.canceladaPor = auth.currentUser?.uid || null;
      reserva.motivoCancelacion = motivo.trim() || null;
      renderizar(contenedor, aviso);
    } catch (error) {
      mostrarMensaje(aviso, "error", traducirErrorFirebase(
        error, error.message || "No se pudo cancelar la reserva. Inténtalo de nuevo."
      ));
      restaurar();
    }
  });
  return btn;
}

function nombreCorreoDe(uid) {
  const u = mapaUsuarios?.get(uid);
  return u ? `${u.nombre} (${u.correo})` : "Usuario no disponible";
}

/* ---------- Selector de canchas (para el filtro) ---------- */

async function llenarFiltroCanchas() {
  const select = document.getElementById("f-cancha");
  if (!select) return;
  try {
    const snap = await getDocs(collection(db, "canchas"));
    const canchas = snap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre || "(sin nombre)" }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    for (const c of canchas) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      select.appendChild(opt);
    }
  } catch (_) { /* el listado principal mostrará el error si procede */ }
}

/* ---------- Inicialización ---------- */

export async function initAdminReservas() {
  const contenedor = document.getElementById("lista-admin-reservas");
  const aviso = document.getElementById("mensaje-admin-reservas");
  if (!contenedor || !aviso) return;

  // Doble control: guard.js ya redirige, pero verificamos el rol igualmente.
  if (!(await esAdmin())) {
    mostrarMensaje(aviso, "error", "No tienes permisos de administrador.");
    contenedor.innerHTML = "";
    return;
  }

  // Filtros reactivos (todo en cliente).
  for (const id of ["f-desde", "f-hasta", "f-cancha", "f-estado"]) {
    document.getElementById(id).addEventListener("change", () => { visibles = 0; renderizar(contenedor, aviso); });
  }
  document.getElementById("f-busqueda").addEventListener("input", () => { visibles = 0; renderizar(contenedor, aviso); });

  document.getElementById("btn-limpiar").addEventListener("click", () => {
    document.getElementById("f-desde").value = "";
    document.getElementById("f-hasta").value = "";
    document.getElementById("f-cancha").value = "";
    document.getElementById("f-estado").value = "";
    document.getElementById("f-busqueda").value = "";
    visibles = 0;
    renderizar(contenedor, aviso);
  });

  const btnOrden = document.getElementById("btn-orden");
  btnOrden.addEventListener("click", () => {
    ordenDesc = !ordenDesc;
    btnOrden.textContent = ordenDesc ? "↓ Más recientes" : "↑ Más antiguas";
    renderizar(contenedor, aviso);
  });

  document.getElementById("btn-exportar").addEventListener("click", () => {
    const lista = aplicarFiltros();
    if (!lista.length) {
      mostrarMensaje(aviso, "error", "No hay reservas que exportar con esos filtros.");
      return;
    }
    exportarCSV(
      `reservas-${hoyISO()}.csv`,
      ["Usuario", "Correo", "Cancha", "Tipo", "Fecha", "Hora inicio", "Hora fin", "Precio", "Estado"],
      lista.map((r) => {
        const d = filaDatos(r);
        return [d.usuario, d.correo, d.cancha, d.tipo, d.fecha, r.horaInicio, r.horaFin,
          typeof r.precio === "number" ? r.precio : "", etiquetaEstadoReserva(r.estado, d.estado === "pasada")];
      })
    );
    mostrarMensaje(aviso, "exito", `✅ CSV exportado con ${lista.length} reserva(s). Revisa tu carpeta de descargas.`);
  });

  await llenarFiltroCanchas();
  await cargarReservas(contenedor, aviso);
}
