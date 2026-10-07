/** Página "CONSULTAR CANCHA": catálogo de canchas registradas con filtros.
 *  Historia de usuario: como usuario quiero consultar las canchas disponibles
 *  para conocer las opciones que puedo reservar (nombre, tipo y ubicación).
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "../components/ui/Alert";
import CourtCard from "../features/courts/CourtCard";
import { courtService } from "../services/courtService";
import type { Court, Sport } from "../services/courtService";

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros del catálogo
  const [search, setSearch] = useState("");
  const [sportId, setSportId] = useState<number | 0>(0);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    courtService.listSports().then(setSports).catch(() => undefined);
  }, []);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await courtService.listCourts({
        search: search || undefined,
        sport_id: sportId || undefined,
        only_available: onlyAvailable || undefined,
      });
      setCourts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo de canchas");
    } finally {
      setLoading(false);
    }
  }, [search, sportId, onlyAvailable]);

  // Consulta inicial + recarga cuando cambia el deporte/disponibilidad.
  // La búsqueda se aplica al enviar el formulario para no consultar en cada tecla.
  useEffect(() => {
    void loadCourts();
  }, [loadCourts]);

  return (
    <section className="courts-page">
      <h1>Consultar Cancha</h1>
      <p className="page-hint">
        Aquí puedes ver todas las canchas registradas en el sistema con su nombre,
        tipo de deporte y ubicación.
      </p>

      <form
        className="court-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void loadCourts();
        }}
      >
        <div className="field">
          <label htmlFor="q">Buscar por nombre</label>
          <input
            id="q"
            type="text"
            placeholder="Ej.: Cancha Central"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="sport">Tipo de deporte</label>
          <select
            id="sport"
            value={sportId}
            onChange={(e) => setSportId(Number(e.target.value))}
          >
            <option value={0}>Todos</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <label className="field-checkbox">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Solo disponibles
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Consultando…" : "BUSCAR"}
        </button>
      </form>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p className="page-hint">Cargando canchas…</p>
      ) : courts.length === 0 ? (
        <div className="courts-empty">
          <p>😕 No se encontraron canchas con los criterios actuales.</p>
          <p className="page-hint">Prueba cambiando la búsqueda o los filtros.</p>
        </div>
      ) : (
        <>
          <p className="courts-count">
            Se encontraron <strong>{courts.length}</strong> cancha{courts.length !== 1 && "s"}
          </p>
          <div className="courts-grid">
            {courts.map((c) => (
              <CourtCard key={c.id} court={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
