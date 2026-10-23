/**
 * ============================================================
 * canchas.js — Listado, registro, edición y eliminación de canchas
 * ============================================================
 * Se usa en dos páginas:
 *   - pages/canchas.html            (listado + filtros + acciones admin)
 *   - pages/admin-cancha-form.html  (registrar / modificar con ?id=)
 *
 * Modelo de datos (colección "canchas", un doc por cancha):
 *   nombre, tipo, ubicacion, descripcion, precioHora (number|null),
 *   horaApertura "HH:mm", horaCierre "HH:mm", activa (bool),
 *   creadaEn / actualizadaEn (serverTimestamp).
 */

import { db } from "./firebase-config.js";
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { esAdmin, enlace } from "./guard.js";
import {
  mostrarMensaje, limpiarMensaje, bloquearBoton, traducirErrorFirebase,
  confirmarModal, esHoraValida, horaAMinutos, hoyISO
} from "./utils.js";

export const TIPOS_CANCHA = [
  "Fútbol 5", "Fútbol 7", "Fútbol 11", "Baloncesto", "Tenis", "Voleibol", "Pádel"
];

/* ============================================================
   LISTADO (pages/canchas.html)
   ============================================================ */

let canchasCache = [];
let esAdminActual = false;

const ICONO_TIPO = {
  "Fútbol 5": "⚽", "Fútbol 7": "⚽", "Fútbol 11": "⚽",
  "Baloncesto": "🏀", "Tenis": "🎾", "Voleibol": "🏐", "Pádel": "🎾"
};

/** Carga todas las canchas y pinta el listado. */
async function cargarCanchas() {
  const lista = document.getElementById("lista-canchas");
  lista.innerHTML = `
    <div class="indicador-carga" style="grid-column: 1 / -1;">
      <span class="spinner"></span> Obteniendo canchas...
    </div>`;

  try {
    const snap = await getDocs(collection(db, "canchas"));
    canchasCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    pintarLista();
  } catch (error) {
    lista.innerHTML = "";
    const aviso = document.getElementById("mensaje-canchas");
    mostrarMensaje(aviso, "error", traducirErrorFirebase(error, "No se pudieron cargar las canchas."));
  }
}

/** Aplica filtro por tipo + búsqueda por nombre y repinta. */
function pintarLista() {
  const lista = document.getElementById("lista-canchas");
  const filtroTipo = document.getElementById("filtro-tipo");
  const busqueda = document.getElementById("busqueda-nombre");

  const texto = (busqueda.value || "").trim().toLowerCase();
  const tipo = filtroTipo.value;

  const visibles = canchasCache.filter((c) => {
    const coincideTipo = !tipo || c.tipo === tipo;
    const coincideTexto = !texto || (c.nombre || "").toLowerCase().includes(texto);
    return coincideTipo && coincideTexto;
  });

  lista.innerHTML = "";

  if (!canchasCache.length) {
    lista.innerHTML = `
      <div class="estado-vacio" style="grid-column: 1 / -1;">
        <p style="font-size: 2rem;">🏟️</p>
        <h3>Aún no hay canchas registradas</h3>
        <p>${esAdminActual
          ? 'Usa el botón "REGISTRAR CANCHA" para agregar la primera.'
          : "Cuando el administrador registre canchas, aparecerán aquí."}</p>
      </div>`;
    return;
  }

  if (!visibles.length) {
    lista.innerHTML = `
      <div class="estado-vacio" style="grid-column: 1 / -1;">
        <p>No encontramos canchas con ese filtro o búsqueda.</p>
      </div>`;
    return;
  }

  for (const cancha of visibles) {
    lista.appendChild(crearTarjeta(cancha));
  }
}

/** Construye una tarjeta de cancha (con textContent para evitar XSS). */
function crearTarjeta(cancha) {
  const articulo = document.createElement("article");
  articulo.className = "tarjeta-cancha";
  articulo.dataset.id = cancha.id;

  const titulo = document.createElement("h3");
  titulo.textContent = `${ICONO_TIPO[cancha.tipo] || "🏟️"} ${cancha.nombre}`;
  articulo.appendChild(titulo);

  const etiquetas = document.createElement("div");
  etiquetas.className = "etiquetas-cancha";
  const chipTipo = document.createElement("span");
  chipTipo.className = "chip";
  chipTipo.textContent = cancha.tipo || "Sin tipo";
  etiquetas.appendChild(chipTipo);
  if (cancha.activa === false) {
    const chipInactiva = document.createElement("span");
    chipInactiva.className = "chip chip-inactiva";
    chipInactiva.textContent = "Inactiva";
    etiquetas.appendChild(chipInactiva);
  }
  articulo.appendChild(etiquetas);

  agregarDato(articulo, "📍 Ubicación:", cancha.ubicacion);
  if (cancha.horaApertura && cancha.horaCierre) {
    agregarDato(articulo, "🕗 Horario:", `${cancha.horaApertura} – ${cancha.horaCierre}`);
  }
  if (typeof cancha.precioHora === "number") {
    agregarDato(articulo, "💰 Precio por hora:", `$ ${cancha.precioHora.toLocaleString("es")}`);
  }
  if (cancha.descripcion) {
    const p = document.createElement("p");
    p.className = "descripcion-cancha";
    p.textContent = cancha.descripcion;
    articulo.appendChild(p);
  }

  /* Acciones */
  const acciones = document.createElement("div");
  acciones.className = "acciones-cancha";

  const btnVer = document.createElement("a");
  btnVer.className = "btn-mini btn-primario";
  btnVer.href = `disponibilidad.html?cancha=${encodeURIComponent(cancha.id)}`;
  btnVer.textContent = "Ver disponibilidad";
  acciones.appendChild(btnVer);

  if (esAdminActual) {
    const btnEditar = document.createElement("a");
    btnEditar.className = "btn-mini btn-contorno";
    btnEditar.href = `admin-cancha-form.html?id=${encodeURIComponent(cancha.id)}`;
    btnEditar.textContent = "MODIFICAR";
    acciones.appendChild(btnEditar);

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "btn-mini btn-peligro";
    btnEliminar.textContent = "ELIMINAR";
    btnEliminar.addEventListener("click", () => eliminarCancha(cancha, btnEliminar));
    acciones.appendChild(btnEliminar);
  }

  articulo.appendChild(acciones);
  return articulo;
}

function agregarDato(contenedor, etiqueta, valor) {
  if (!valor) return;
  const p = document.createElement("p");
  p.className = "dato";
  const strong = document.createElement("strong");
  strong.textContent = `${etiqueta} `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(String(valor)));
  contenedor.appendChild(p);
}

/** Elimina una cancha tras modal de confirmación y advertencia de reservas futuras. */
async function eliminarCancha(cancha, boton) {
  const aviso = document.getElementById("mensaje-canchas");
  const restaurar = bloquearBoton(boton, "Eliminando...");

  try {
    // ¿Tiene reservas futuras confirmadas? (advertencia antes de permitir eliminar)
    const hoy = hoyISO();
    const q = query(
      collection(db, "reservas"),
      where("canchaId", "==", cancha.id),
      where("estado", "==", "confirmada"),
      where("fecha", ">=", hoy)
    );
    const snapReservas = await getDocs(q);
    const futuras = snapReservas.size;

    let mensaje = `Se eliminará "${cancha.nombre}" del listado de forma permanente.`;
    if (futuras > 0) {
      mensaje =
        `⚠️ Advertencia: "${cancha.nombre}" tiene ${futuras} reserva(s) futura(s) confirmada(s). ` +
        `Si la eliminas, esas reservas quedarán sin cancha. ${mensaje}`;
    }

    const confirmado = await confirmarModal({
      titulo: "Eliminar cancha",
      mensaje,
      textoAceptar: futuras > 0 ? "Eliminar de todos modos" : "Sí, eliminar"
    });
    if (!confirmado) {
      restaurar();
      return;
    }

    await deleteDoc(doc(db, "canchas", cancha.id));
    canchasCache = canchasCache.filter((c) => c.id !== cancha.id);
    pintarLista(); // desaparece sin recargar toda la página
    mostrarMensaje(aviso, "exito", `La cancha "${cancha.nombre}" fue eliminada correctamente.`);
  } catch (error) {
    restaurar();
    mostrarMensaje(aviso, "error", traducirErrorFirebase(error, "No se pudo eliminar la cancha."));
  }
}

/** Inicializa la página de listado. */
export async function initListadoCanchas() {
  const btnRegistrar = document.getElementById("btn-registrar-cancha");

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) return; // guard.js redirige al login
    esAdminActual = await esAdmin();
    if (btnRegistrar) btnRegistrar.hidden = !esAdminActual;
    await cargarCanchas();
  });

  document.getElementById("filtro-tipo").addEventListener("change", pintarLista);
  document.getElementById("busqueda-nombre").addEventListener("input", pintarLista);
}

/* ============================================================
   FORMULARIO registrar / modificar (pages/admin-cancha-form.html)
   ============================================================ */

/** Valida los datos del formulario. Devuelve error en español o null. */
export function validarCancha({ nombre, tipo, ubicacion, horaApertura, horaCierre, precioHora }) {
  if (!nombre.trim()) return "El nombre de la cancha es obligatorio.";
  if (!tipo) return "Selecciona el tipo de cancha.";
  if (!ubicacion.trim()) return "La ubicación es obligatoria.";
  if (!esHoraValida(horaApertura)) return "La hora de apertura es obligatoria (formato HH:mm).";
  if (!esHoraValida(horaCierre)) return "La hora de cierre es obligatoria (formato HH:mm).";
  if (horaAMinutos(horaCierre) <= horaAMinutos(horaApertura)) {
    return "La hora de cierre debe ser posterior a la hora de apertura.";
  }
  if (precioHora !== "" && (Number.isNaN(Number(precioHora)) || Number(precioHora) < 0)) {
    return "El precio por hora no puede ser negativo ni inválido.";
  }
  return null;
}

/** Comprueba que no exista otra cancha activa con el mismo nombre (lógicamente única). */
async function nombreDuplicado(nombre, idExcluir = null) {
  const snap = await getDocs(collection(db, "canchas"));
  const limpio = nombre.trim().toLowerCase();
  return snap.docs.some((d) => {
    const data = d.data();
    return d.id !== idExcluir && (data.nombre || "").trim().toLowerCase() === limpio;
  });
}

/** Rellena el <select> de tipos de cancha. */
function poblarTipos(select) {
  for (const tipo of TIPOS_CANCHA) {
    const opcion = document.createElement("option");
    opcion.value = tipo;
    opcion.textContent = tipo;
    select.appendChild(opcion);
  }
}

/** Guarda (crea o actualiza) la cancha del formulario. */
async function guardarCancha(evento) {
  evento.preventDefault();

  const aviso = document.getElementById("mensaje-form");
  const boton = document.getElementById("btn-guardar");
  const idCancha = new URLSearchParams(window.location.search).get("id");

  const datos = {
    nombre: document.getElementById("nombre").value,
    tipo: document.getElementById("tipo").value,
    ubicacion: document.getElementById("ubicacion").value,
    descripcion: document.getElementById("descripcion").value,
    precioHora: document.getElementById("precio-hora").value,
    horaApertura: document.getElementById("hora-apertura").value,
    horaCierre: document.getElementById("hora-cierre").value,
    activa: document.getElementById("activa").checked
  };

  const errorValidacion = validarCancha(datos);
  if (errorValidacion) {
    mostrarMensaje(aviso, "error", errorValidacion);
    return;
  }

  const restaurar = bloquearBoton(boton, "Guardando...");
  try {
    if (await nombreDuplicado(datos.nombre, idCancha)) {
      restaurar();
      mostrarMensaje(aviso, "error", `Ya existe una cancha con el nombre "${datos.nombre.trim()}". Usa otro nombre.`);
      return;
    }

    const payload = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      ubicacion: datos.ubicacion.trim(),
      descripcion: datos.descripcion.trim(),
      precioHora: datos.precioHora === "" ? null : Number(datos.precioHora),
      horaApertura: datos.horaApertura,
      horaCierre: datos.horaCierre,
      activa: datos.activa,
      actualizadaEn: new Date()
    };

    if (idCancha) {
      await updateDoc(doc(db, "canchas", idCancha), payload);
    } else {
      await addDoc(collection(db, "canchas"), { ...payload, creadaEn: new Date() });
    }

    mostrarMensaje(aviso, "exito", idCancha
      ? "✅ La cancha se actualizó correctamente. Volviendo al listado..."
      : "✅ La cancha se registró correctamente. Volviendo al listado...");
    setTimeout(() => { window.location.href = enlace("pages/canchas.html"); }, 1200);
  } catch (error) {
    restaurar();
    mostrarMensaje(aviso, "error", traducirErrorFirebase(error, "No se pudo guardar la cancha."));
  }
}

/** Inicializa la página de formulario (registro o edición con ?id=). */
export async function initFormularioCancha() {
  const selectTipo = document.getElementById("tipo");
  poblarTipos(selectTipo);

  // Solo administradores (la protección real son las reglas de Firestore;
  // guard.js ya redirige si data-page="admin", pero revalidamos aquí).
  if (!(await esAdmin())) {
    window.location.replace(enlace("pages/dashboard.html"));
    return;
  }

  const idCancha = new URLSearchParams(window.location.search).get("id");
  const titulo = document.getElementById("titulo-form");
  const subtitulo = document.getElementById("subtitulo-form");

  if (idCancha) {
    titulo.textContent = "Modificar cancha";
    subtitulo.textContent = "Edita la información de la cancha existente.";
    document.title = "Modificar cancha | Reserva de Canchas";
    try {
      const snap = await getDoc(doc(db, "canchas", idCancha));
      if (!snap.exists()) {
        mostrarMensaje(document.getElementById("mensaje-form"), "error",
          "No se encontró la cancha solicitada. Regresa al listado.");
        return;
      }
      const c = snap.data();
      document.getElementById("nombre").value = c.nombre || "";
      selectTipo.value = c.tipo || "";
      if (!selectTipo.value && c.tipo) {
        const opcion = document.createElement("option");
        opcion.value = c.tipo;
        opcion.textContent = c.tipo;
        selectTipo.appendChild(opcion);
        selectTipo.value = c.tipo;
      }
      document.getElementById("ubicacion").value = c.ubicacion || "";
      document.getElementById("descripcion").value = c.descripcion || "";
      document.getElementById("precio-hora").value =
        typeof c.precioHora === "number" ? c.precioHora : "";
      document.getElementById("hora-apertura").value = c.horaApertura || "";
      document.getElementById("hora-cierre").value = c.horaCierre || "";
      document.getElementById("activa").checked = c.activa !== false;
    } catch (error) {
      mostrarMensaje(document.getElementById("mensaje-form"), "error",
        traducirErrorFirebase(error, "No se pudieron cargar los datos de la cancha."));
      return;
    }
  }

  document.getElementById("formulario-cancha").addEventListener("submit", guardarCancha);
}
