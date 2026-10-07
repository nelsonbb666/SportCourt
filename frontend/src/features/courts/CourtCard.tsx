/** Tarjeta de presentación de una cancha en el catálogo. */
import { Link } from "react-router-dom";
import type { Court } from "../../services/courtService";

const SPORT_ICONS: Record<string, string> = {
  Fútbol: "⚽",
  Baloncesto: "🏀",
  Voleibol: "🏐",
  Tenis: "🎾",
  Microfútbol: "⚽",
  Béisbol: "⚾",
};

export default function CourtCard({ court }: { court: Court }) {
  const sportName = court.sport?.name ?? "";
  const icon = SPORT_ICONS[sportName] ?? "🏟️";
  const price = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(court.price_per_hour);

  return (
    <article className="court-card">
      <div className="court-card-header">
        <span className="court-icon" aria-hidden>{icon}</span>
        <div>
          <h3 className="court-name">{court.name}</h3>
          <span className="court-sport-badge">{sportName}</span>
        </div>
        <span
          className={`court-status ${court.is_available ? "available" : "unavailable"}`}
        >
          {court.is_available ? "Disponible" : "No disponible"}
        </span>
      </div>

      <p className="court-detail">📍 {court.location}</p>
      <p className="court-detail">👥 Capacidad: {court.capacity} personas</p>
      <p className="court-detail">💰 {price} / hora</p>
      {court.description && <p className="court-desc">{court.description}</p>}

      <Link to={`/canchas/${court.id}`} className="btn btn-primary court-cta">
        Ver disponibilidad
      </Link>
    </article>
  );
}
