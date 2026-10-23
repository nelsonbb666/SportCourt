/**
 * ============================================================
 * cargar-datos-ejemplo.js — Crea 3 canchas de prueba en Firestore
 * ============================================================
 * USO:
 *   1. Inicia sesión en el sitio con una cuenta que tenga rol "admin"
 *      (documento en "usuarios" con { rol: "admin" }).
 *   2. Abre la consola del navegador (F12) en cualquier página del sitio
 *      y pega este script completo, o ejecútalo así:
 *
 *        import("/assets/cargar-datos-ejemplo.js")
 *
 *   El script reutiliza la configuración Firebase ya cargada por la app.
 */

import { db } from "../js/firebase-config.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CANCHAS_DE_EJEMPLO = [
  {
    nombre: "La Estrella",
    tipo: "Fútbol 5",
    ubicacion: "Av. Central #123, Centro deportivo Norte",
    descripcion: "Cancha sintética techada con iluminación LED.",
    precioHora: 25000,
    horaApertura: "08:00",
    horaCierre: "22:00",
    activa: true
  },
  {
    nombre: "El Coliseo",
    tipo: "Baloncesto",
    ubicacion: "Calle 45 #7-20, Parque Metropolitano",
    descripcion: "Cancha al aire libre, piso acrílico reciente.",
    precioHora: 15000,
    horaApertura: "06:00",
    horaCierre: "20:00",
    activa: true
  },
  {
    nombre: "Racket Park",
    tipo: "Tenis",
    ubicacion: "Clubesport Ltda., sector El Roble",
    descripcion: "Dos canchas de polvo de ladrillo con clases disponibles.",
    precioHora: 30000,
    horaApertura: "07:00",
    horaCierre: "21:00",
    activa: true
  }
];

async function cargar() {
  const snap = await getDocs(collection(db, "canchas"));
  if (!snap.empty) {
    console.warn("⚠️ La colección 'canchas' ya tiene documentos; se omite la carga de ejemplo.");
    return;
  }
  for (const cancha of CANCHAS_DE_EJEMPLO) {
    await addDoc(collection(db, "canchas"), {
      ...cancha,
      creadaEn: new Date(),
      actualizadaEn: new Date()
    });
    console.info(`✅ Cancha creada: ${cancha.nombre}`);
  }
  console.info("🎉 Datos de ejemplo cargados. Recarga pages/canchas.html.");
}

cargar();
