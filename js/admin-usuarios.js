/**
 * ============================================================
 * admin-usuarios.js — Gestión de usuarios (administrador)
 * ============================================================
 * Sprint #4. Funcionalidades:
 *  - Listar todos los usuarios de la colección "usuarios" con nombre,
 *    correo, teléfono, rol, estado (Activo/Inactivo) y fecha de registro.
 *  - Búsqueda por nombre/correo y filtros por rol y estado (en cliente).
 *  - Ver detalle: modal con todos los datos + cantidad de reservas
 *    (confirmadas / canceladas) y listado de sus reservas.
 *  - Acciones permitidas: activar/desactivar cuenta y cambiar rol,
 *    ambas con modal de confirmación propio.
 *  - Protecciones: un admin NO puede desactivarse a sí mismo ni quitarse
 *    el rol de admin; debe quedar siempre al menos un administrador activo.
 *
 * ⚠️ Limitación técnica (sin backend): no se puede eliminar ni deshabilitar
 * cuentas de Firebase Authentication desde el navegador. La desactivación
 * se modela con el campo `activo` en Firestore y se aplica en login/guard.
 * La protección real del backend son las reglas de firestore.rules.
 */

import { db, auth } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { esAdmin } from "./guard.js";
import {
  mostrarMensaje, traducirErrorFirebase, bloquearBoton, confirmarModal,
  formatearFechaLarga, etiquetaEstadoCuenta, claseBadgeCuenta,
  etiquetaEstadoReserva, claseBadgeReserva, fechaHoraEsPasada
} from "./utils.js";

/* ---------- Estado en memoria ---------- */

let usuarios = []; // [{ uid, nombre, correo, telefono, rol, activo, fechaCreacion }]

/* ---------- Carga ---------- */

async function cargarUsuarios(contenedor, aviso) {
  contenedor.innerHTML = `<div class="indicador-carga"><span class="spinner"></span> Cargando usuarios...</div>`;
  try {
    const snap = await getDocs(collection(db, "usuarios"));
    usuarios = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    renderizarLista(contenedor, aviso);
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje(aviso, "error", traducirErrorFirebase(
      error,
      "No se pudieron cargar los usuarios. Publica las reglas de firestore.rules (Sprint #4) en Firebase."
    ));
  }
}

/* ---------- Filtros (en cliente) ---------- */

function leerFiltrosUsuarios() {
  return {
    busqueda: (document.getElementById("u-busqueda").value || "").trim().toLowerCase(),
    rol: document.getElementById("u-rol").value || "",
    estado: document.getElementById("u-estado").value || ""
  };
}

function aplicarFiltrosUsuarios() {
  const f = leerFiltrosUsuarios();
  let lista = usuarios.filter((u) => {
    if (f.busqueda) {
      const texto = `${u.nombre || ""} ${u.correo || ""}`.toLowerCase();
      if (!texto.includes(f.busqueda)) return false;
    }
    if (f.rol && (u.rol || "usuario") !== f.rol) return false;
    const activo = u.activo !== false; // undefined → activo (usuarios del Sprint #1)
    if (f.estado === "activo" && !activo) return false;
    if (f.estado === "inactivo" && activo) return false;
    return true;
  });
  lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  return lista;
}

/* ---------- Render de la lista ---------- */

function badge(texto, clase) {
  const b = document.createElement("span");
  b.className = `badge-estado ${clase}`;
  b.textContent = texto; // textContent → anti-XSS
  return b;
}

function fechaRegistro(u) {
  const ts = u.fechaCreacion;
  if (ts && typeof ts.toDate === "function") {
    const d = ts.toDate();
    return d.toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });
  }
  return "—";
}

function renderizarLista(contenedor, aviso) {
  const lista = aplicarFiltrosUsuarios();
  contenedor.innerHTML = "";

  if (!lista.length) {
    const vacio = document.createElement("div");
    vacio.className = "estado-vacio";
    const h = document.createElement("h3");
    h.textContent = usuarios.length ? "No hay usuarios con esos filtros" : "Aún no hay usuarios registrados";
    vacio.appendChild(h);
    contenedor.appendChild(vacio);
    return;
  }

  for (const u of lista) {
    contenedor.appendChild(tarjetaUsuario(u, aviso, contenedor));
  }
}

function tarjetaUsuario(u, aviso, contenedor) {
  const yo = auth.currentUser && auth.currentUser.uid === u.uid;
  const activo = u.activo !== false;
  const rol = u.rol || "usuario";

  const art = document.createElement("article");
  art.className = "tarjeta-usuario";

  const datos = document.createElement("div");
  datos.className = "tarjeta-usuario-datos";
  const h = document.createElement("h3");
  h.textContent = u.nombre || "(sin nombre)";
  const pCorreo = document.createElement("p");
  pCorreo.textContent = `📧 ${u.correo || "—"}`;
  const pTel = document.createElement("p");
  pTel.textContent = `📞 ${u.telefono || "—"} · 🗓 Registrado: ${fechaRegistro(u)}${yo ? " · (tú)" : ""}`;
  const badges = document.createElement("p");
  badges.append(
    badge(rol === "admin" ? "Administrador" : "Usuario", rol === "admin" ? "badge-rol-admin" : "badge-rol-usuario"),
    document.createTextNode(" "),
    badge(etiquetaEstadoCuenta(activo), claseBadgeCuenta(activo))
  );
  datos.append(h, pCorreo, pTel, badges);
  art.appendChild(datos);

  const acciones = document.createElement("div");
  acciones.className = "tarjeta-usuario-acciones";

  // VER información (detalle + reservas)
  const btnVer = document.createElement("button");
  btnVer.type = "button";
  btnVer.className = "btn btn-contorno btn-sm";
  btnVer.textContent = "VER";
  btnVer.addEventListener("click", () => abrirDetalleUsuario(u, aviso));
  acciones.appendChild(btnVer);

  // ACTIVAR / DESACTIVAR (bloqueado para sí mismo)
  const btnAct = document.createElement("button");
  btnAct.type = "button";
  btnAct.className = `btn btn-sm ${activo ? "btn-peligro" : "btn-primario"}`;
  btnAct.textContent = activo ? "DESACTIVAR" : "ACTIVAR";
  if (yo) {
    btnAct.disabled = true;
    btnAct.title = "No puedes desactivar tu propia cuenta.";
  }
  btnAct.addEventListener("click", async () => {
    if (yo) return;
    if (activo && !(await hayOtroAdminActivoAdemasDe(u))) {
      mostrarMensaje(aviso, "error", "No se puede desactivar: debe quedar siempre al menos un administrador activo.");
      return;
    }
    const ok = await confirmarModal({
      titulo: activo ? "Desactivar cuenta" : "Activar cuenta",
      mensaje: activo
        ? `¿Seguro que deseas desactivar la cuenta de ${u.nombre || u.correo}? No podrá iniciar sesión ni reservar hasta que la reactives.`
        : `¿Deseas reactivar la cuenta de ${u.nombre || u.correo}? Volverá a poder iniciar sesión y reservar.`,
      contenido: [
        { etiqueta: "Nombre", valor: u.nombre || "—" },
        { etiqueta: "Correo", valor: u.correo || "—" },
        { etiqueta: "Rol", valor: rol === "admin" ? "Administrador" : "Usuario" }
      ],
      textoAceptar: activo ? "Sí, desactivar" : "Sí, activar",
      claseAceptar: activo ? "btn-peligro" : "btn-primario"
    });
    if (!ok) return;
    const restaurar = bloquearBoton(btnAct, "Guardando...");
    try {
      await cambiarCampo(uidRef(u.uid), { activo: !activo });
      u.activo = !activo;
      mostrarMensaje(aviso, "exito", activo
        ? `✅ Cuenta de ${u.nombre || u.correo} desactivada.`
        : `✅ Cuenta de ${u.nombre || u.correo} reactivada.`);
      renderizarLista(contenedor, aviso); // sin recargar toda la página
    } catch (error) {
      mostrarMensaje(aviso, "error", traducirErrorFirebase(error, "No se pudo actualizar la cuenta."));
      restaurar();
    }
  });
  acciones.appendChild(btnAct);

  // CAMBIAR ROL (bloqueado para sí mismo si es admin)
  const btnRol = document.createElement("button");
  btnRol.type = "button";
  btnRol.className = "btn btn-contorno btn-sm";
  btnRol.textContent = rol === "admin" ? "QUITAR ADMIN" : "HACER ADMIN";
  if (yo && rol === "admin") {
    btnRol.disabled = true;
    btnRol.title = "No puedes quitarte el rol de administrador a ti mismo.";
  }
  btnRol.addEventListener("click", async () => {
    if (yo && rol === "admin") return;
    const nuevoRol = rol === "admin" ? "usuario" : "admin";
    if (nuevoRol === "usuario" && rol === "admin" && !(await hayOtroAdminActivoAdemasDe(u))) {
      mostrarMensaje(aviso, "error", "No se puede quitar el rol: debe quedar siempre al menos un administrador activo.");
      return;
    }
    const ok = await confirmarModal({
      titulo: "Cambiar rol de usuario",
      mensaje: nuevoRol === "admin"
        ? `¿Deseas asignar el rol de ADMINISTRADOR a ${u.nombre || u.correo}? Podrá gestionar canchas, reservas y usuarios.`
        : `¿Deseas quitarle el rol de administrador a ${u.nombre || u.correo}? Pasará a ser usuario normal.`,
      contenido: [
        { etiqueta: "Nombre", valor: u.nombre || "—" },
        { etiqueta: "Rol actual", valor: rol === "admin" ? "Administrador" : "Usuario" },
        { etiqueta: "Nuevo rol", valor: nuevoRol === "admin" ? "Administrador" : "Usuario" }
      ],
      textoAceptar: "Sí, cambiar rol",
      claseAceptar: "btn-primario"
    });
    if (!ok) return;
    const restaurar = bloquearBoton(btnRol, "Guardando...");
    try {
      await cambiarCampo(uidRef(u.uid), { rol: nuevoRol });
      u.rol = nuevoRol;
      mostrarMensaje(aviso, "exito", `✅ Rol actualizado: ${u.nombre || u.correo} ahora es ${nuevoRol === "admin" ? "administrador" : "usuario"}.`);
      renderizarLista(contenedor, aviso);
    } catch (error) {
      mostrarMensaje(aviso, "error", traducirErrorFirebase(error, "No se pudo cambiar el rol."));
      restaurar();
    }
  });
  acciones.appendChild(btnRol);

  art.appendChild(acciones);
  return art;
}

/* ---------- Escritura en Firestore ---------- */

function uidRef(uid) { return doc(db, "usuarios", uid); }

async function cambiarCampo(ref, campos) {
  await updateDoc(ref, campos);
}

/** ¿Existe otro admin ACTIVO además del usuario indicado? */
function hayOtroAdminActivoAdemasDe(u) {
  return usuarios.some((otro) =>
    otro.uid !== u.uid &&
    (otro.rol || "usuario") === "admin" &&
    otro.activo !== false
  );
}

/* ---------- Detalle del usuario (con sus reservas) ---------- */

async function abrirDetalleUsuario(u, aviso) {
  // Panel informativo (no booleano): creamos un modal de detalle propio que
  // reutiliza las clases del modal de utils.js e inyectamos solo nodos seguros.
  let modal = document.getElementById("modal-detalle-fondo");
  if (!modal) {
    const envoltorio = document.createElement("div");
    envoltorio.innerHTML = `
      <div class="modal-fondo" id="modal-detalle-fondo" hidden>
        <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo">
          <h3 id="detalle-titulo">Detalle del usuario</h3>
          <div id="detalle-cuerpo"></div>
          <div class="modal-acciones">
            <button type="button" class="btn btn-contorno" id="detalle-cerrar">Cerrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(envoltorio.firstElementChild);
    modal = document.getElementById("modal-detalle-fondo");
    document.getElementById("detalle-cerrar").addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  }

  const cont = document.getElementById("detalle-cuerpo");
  cont.innerHTML = "";
  document.getElementById("detalle-titulo").textContent = `Información de ${u.nombre || u.correo}`;

  // Datos del usuario
  const dl = document.createElement("dl");
  dl.className = "modal-resumen";
  const filas = [
    ["Nombre", u.nombre || "—"],
    ["Correo", u.correo || "—"],
    ["Teléfono", u.telefono || "—"],
    ["Rol", (u.rol || "usuario") === "admin" ? "Administrador" : "Usuario"],
    ["Estado", etiquetaEstadoCuenta(u.activo !== false)],
    ["Registrado", fechaRegistro(u)],
    ["UID", u.uid]
  ];
  for (const [etiqueta, valor] of filas) {
    const dt = document.createElement("dt"); dt.textContent = etiqueta;
    const dd = document.createElement("dd"); dd.textContent = valor;
    dl.append(dt, dd);
  }
  cont.appendChild(dl);

  // Contador de reservas propias
  const carga = document.createElement("p");
  carga.className = "indicador-carga";
  carga.textContent = "Consultando sus reservas...";
  cont.appendChild(carga);
  modal.hidden = false;

  try {
    const q = query(collection(db, "reservas"), where("usuarioId", "==", u.uid));
    const snap = await getDocs(q);
    const reservas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => `${b.fecha}T${b.horaInicio}`.localeCompare(`${a.fecha}T${a.horaInicio}`));
    const confirmadas = reservas.filter((r) => r.estado === "confirmada").length;
    const canceladas = reservas.filter((r) => r.estado === "cancelada").length;

    carga.remove();
    const resumen = document.createElement("p");
    resumen.textContent = `Reservas: ${confirmadas} confirmada(s) · ${canceladas} cancelada(s) · total ${reservas.length}`;
    cont.appendChild(resumen);

    const lista = document.createElement("div");
    lista.className = "detalle-reservas-lista";
    if (!reservas.length) {
      const v = document.createElement("p");
      v.textContent = "Este usuario aún no tiene reservas.";
      lista.appendChild(v);
    }
    for (const r of reservas.slice(0, 50)) {
      const item = document.createElement("div");
      item.className = "detalle-reserva-item";
      const texto = document.createElement("span");
      texto.textContent = `${r.canchaNombre || "Cancha"} · ${formatearFechaLarga(r.fecha)} · ${r.horaInicio}–${r.horaFin}`;
      const pasada = r.estado === "confirmada" && fechaHoraEsPasada(r.fecha, r.horaFin || r.horaInicio);
      item.append(texto, badge(
        etiquetaEstadoReserva(r.estado, pasada),
        claseBadgeReserva(r.estado, pasada)
      ));
      lista.appendChild(item);
    }
    cont.appendChild(lista);
  } catch (error) {
    carga.remove();
    const err = document.createElement("p");
    err.textContent = traducirErrorFirebase(error, "No se pudieron consultar las reservas de este usuario.");
    cont.appendChild(err);
  }
}

/* ---------- Inicialización ---------- */

export async function initAdminUsuarios() {
  const contenedor = document.getElementById("lista-usuarios");
  const aviso = document.getElementById("mensaje-admin-usuarios");
  if (!contenedor || !aviso) return;

  // Doble control: guard.js ya redirige a no-admins; verificamos igualmente.
  if (!(await esAdmin())) {
    mostrarMensaje(aviso, "error", "No tienes permisos de administrador.");
    return;
  }

  for (const id of ["u-busqueda"]) {
    document.getElementById(id).addEventListener("input", () => renderizarLista(contenedor, aviso));
  }
  for (const id of ["u-rol", "u-estado"]) {
    document.getElementById(id).addEventListener("change", () => renderizarLista(contenedor, aviso));
  }
  document.getElementById("btn-limpiar-u").addEventListener("click", () => {
    document.getElementById("u-busqueda").value = "";
    document.getElementById("u-rol").value = "";
    document.getElementById("u-estado").value = "";
    renderizarLista(contenedor, aviso);
  });
  document.getElementById("btn-recargar-u").addEventListener("click", () => cargarUsuarios(contenedor, aviso));

  await cargarUsuarios(contenedor, aviso);
}
