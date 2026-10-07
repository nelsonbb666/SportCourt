/** Página de detalle de una cancha con consulta de disponibilidad por fecha. */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  courtService,
  type AvailabilitySlot,
  type Court,
} from "../services/courtService";
import ScheduleGrid from "../features/courts/ScheduleGrid";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CourtDetailPage() {
  const { id } = useParams();
  const courtId = Number(id);

  const [court, setCourt] = useState<Court | null>(null);
  const [day, setDay] = useState<string>(todayISO());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar la cancha una sola vez
  useEffect(() => {
    if (!Number.isFinite(courtId)) return;
    courtService
      .getCourt(courtId)
      .then(setCourt)
      .catch(() => setError("No se encontró la cancha solicitada."));
  }, [courtId]);

  // Cargar disponibilidad cada vez que cambia la cancha o la fecha
  useEffect(() => {
    if (!Number.isFinite(courtId)) return;
    setLoading(true);
    setError("");
    courtService
      .getAvailability(courtId, day)
      .then((data) => setSlots(data.slots))
      .catch(() => setError("No fue posible consultar la disponibilidad."))
      .finally(() => setLoading(false));
  }, [courtId, day]);

  const freeCount = slots.filter((s) => s.available).length;

  return (
    <section className="page court-detail-page">
      <div className="page-header-row">
        <Link to="/canchas" className="back-link">← Volver al catálogo</Link>
        <h2>Disponibilidad de la cancha</h2>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {court && (
        <div className="court-detail-card">
          <h3 className="court-name">{court.name}</h3>
          <p className="court-detail">🏅 Deporte: {court.sport?.name ?? "—"}</p>
          <p className="court-detail">📍 Ubicación: {court.location}</p>
          <p className="court-detail">👥 Capacidad: {court.capacity} personas</p>
          <p className="court-detail">💰 Precio: {court.price_per_hour} / hora</p>
        </div>
      )}

      <form className="availability-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="day">Selecciona una fecha:</label>
        <input
          id="day"
          type="date"
          value={day}
          min={todayISO()}
          onChange={(e) => setDay(e.target.value)}
        />
      </form>

      {loading ? (
        <p className="muted">Cargando horarios…</p>
      ) : (
        <>
          <p className="availability-summary">
            {freeCount > 0
              ? `${freeCount} horario(s) disponible(s) el ${day}`
              : `No hay horarios disponibles el ${day}`}
          </p>
          <ScheduleGrid slots={slots} />
        </>
      )}
    </section>
  );
}
