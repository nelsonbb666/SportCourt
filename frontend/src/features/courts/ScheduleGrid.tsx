/** Grilla de horarios: diferencia visualmente bloques disponibles y ocupados. */
import type { AvailabilitySlot } from "../../services/courtService";

export default function ScheduleGrid({
  slots,
}: {
  slots: AvailabilitySlot[];
}) {
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div className="schedule-grid-wrap">
      <div className="schedule-legend" aria-label="Leyenda de horarios">
        <span className="legend-item">
          <i className="legend-dot available" /> Disponible
        </span>
        <span className="legend-item">
          <i className="legend-dot occupied" /> Ocupado
        </span>
      </div>

      <ul className="schedule-grid">
        {slots.map((slot) => (
          <li key={slot.hour}>
            <div
              className={`schedule-slot ${slot.available ? "available" : "occupied"}`}
              title={slot.available ? "Horario libre" : "Horario reservado"}
            >
              <span className="slot-hours">
                {fmt(slot.hour)} – {fmt(slot.hour + 1)}
              </span>
              <span className="slot-state">
                {slot.available ? "Disponible" : "Ocupado"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
