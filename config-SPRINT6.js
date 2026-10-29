/**
 * ============================================================
 * config.js — Reglas básicas de reserva (Sprint #6)
 * ============================================================
 * Constantes del sistema, sin pantalla ni colección de configuración.
 * Los mensajes de validación SIEMPRE deben construirse con estos
 * valores (nunca números escritos a mano en el texto).
 *
 * HORAS_MIN_CANCELAR reemplaza la antigua constante del Sprint #3
 * (CONSTANTE.config.minHorasAnticipacionCancelacion en utils.js),
 * que fue movida aquí para no duplicarla.
 */

export const REGLAS = {
  /** No se puede reservar más allá de hoy + MAX_DIAS_ANTICIPACION días. */
  MAX_DIAS_ANTICIPACION: 30,

  /** Máximo de reservas confirmadas y FUTURAS por usuario. */
  MAX_RESERVAS_ACTIVAS: 3,

  /** Horas mínimas de anticipación para cancelar (0 = regla desactivada). */
  HORAS_MIN_CANCELAR: 0
};
