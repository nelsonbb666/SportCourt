/** Página de administración de canchas (solo administradores).
 *  Historias de usuario:
 *  - "Registrar una cancha": el admin selecciona REGISTRAR CANCHA, completa un
 *    formulario y al guardar la cancha queda registrada y aparece en el listado.
 *  - "Modificar la información de una cancha": el admin selecciona una cancha,
 *    elige MODIFICAR, ve la información actual precargada, la edita y al guardar
 *    el sistema actualiza los datos correctamente.
 *  - "Eliminar una cancha": el admin selecciona una cancha, elige ELIMINAR, el
 *    sistema solicita confirmar; al confirmar la cancha se elimina y deja de
 *    aparecer en el listado.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "../components/ui/Alert";
import { useAuth } from "../context/AuthContext";
import { courtService } from "../services/courtService";
import type { Court, CourtPayload, Sport } from "../services/courtService";

interface FormState {
  name: string;
  sport_id: number;
  location: string;
  price_per_hour: string;
  capacity: string;
  description: string;
  image_url: string;
  is_available: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  sport_id: 0,
  location: "",
  price_per_hour: "",
  capacity: "10",
  description: "",
  image_url: "",
  is_available: true,
};

function toFormState(c: Court): FormState {
  return {
    name: c.name,
    sport_id: c.sport_id,
    location: c.location,
    price_per_hour: String(c.price_per_hour),
    capacity: String(c.capacity),
    description: c.description ?? "",
    image_url: c.image_url ?? "",
    is_available: c.is_available,
  };
}

export default function AdminCourtsPage() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Estado del formulario: modo "crear" | "editar" | oculto
  const [mode, setMode] = useState<"hidden" | "create" | "edit">("hidden");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [courtsData, sportsData] = await Promise.all([
        courtService.listCourts(),
        courtService.listSports(),
      ]);
      setCourts(courtsData);
      setSports(sportsData);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "No se pudo cargar el listado de canchas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourts();
  }, [loadCourts]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFeedback(null);
    setMode("create");
  };

  // El admin selecciona una cancha y elige MODIFICAR → se muestra su información actual
  const openEdit = (court: Court) => {
    setForm(toFormState(court));
    setEditingId(court.id);
    setFeedback(null);
    setMode("edit");
  };

  const closeForm = () => {
    setMode("hidden");
    setEditingId(null);
    setFeedback(null);
  };

  // Estado de la eliminación con confirmación (historia "Eliminar una cancha")
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const askDelete = (court: Court) => {
    setFeedback(null);
    setDeletingId(court.id);
  };

  const cancelDelete = () => setDeletingId(null);

  const confirmDelete = async () => {
    if (deletingId === null) return;
    const court = courts.find((c) => c.id === deletingId);
    setDeleteBusy(true);
    try {
      await courtService.deleteCourt(deletingId);
      // La cancha deja de aparecer en el listado (se retira localmente y se refresca)
      setCourts((prev) => prev.filter((c) => c.id !== deletingId));
      if (editingId === deletingId) closeForm();
      setDeletingId(null);
      setFeedback({
        kind: "success",
        text: `🗑️ La cancha "${court?.name ?? ""}" fue eliminada y ya no aparece en el listado.`,
      });
      await loadCourts();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "No se pudo eliminar la cancha",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const validationError = useMemo(() => {
    if (form.name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
    if (!form.sport_id) return "Selecciona el tipo de deporte.";
    if (form.location.trim().length < 3) return "La ubicación debe tener al menos 3 caracteres.";
    const price = Number(form.price_per_hour);
    if (!Number.isFinite(price) || price <= 0) return "El precio por hora debe ser mayor que 0.";
    const cap = Number(form.capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 100) return "La capacidad debe estar entre 1 y 100.";
    return null;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      setFeedback({ kind: "error", text: validationError });
      return;
    }
    const payload: CourtPayload = {
      name: form.name.trim(),
      sport_id: form.sport_id,
      location: form.location.trim(),
      price_per_hour: Number(form.price_per_hour),
      capacity: Number(form.capacity),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
    };

    setSaving(true);
    setFeedback(null);
    try {
      if (mode === "edit" && editingId !== null) {
        await courtService.updateCourt(editingId, payload);
        setFeedback({ kind: "success", text: `✅ La cancha "${payload.name}" se actualizó correctamente.` });
      } else {
        await courtService.createCourt(payload);
        setFeedback({ kind: "success", text: `✅ La cancha "${payload.name}" se registró correctamente.` });
      }
      // Refresca el listado para reflejar la cancha nueva/actualizada
      await loadCourts();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "No se pudo guardar la cancha",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <section className="admin-courts-page">
        <h1>Gestión de canchas</h1>
        <Alert kind="error">
          Solo un administrador puede registrar o modificar canchas. Inicia sesión con una
          cuenta de administrador.
        </Alert>
      </section>
    );
  }

  const formTitle = mode === "edit" ? "MODIFICAR CANCHA" : "REGISTRAR CANCHA";

  return (
    <section className="admin-courts-page">
      <div className="admin-header">
        <div>
          <h1>Gestión de canchas</h1>
          <p className="page-hint">
            Registra nuevas canchas o modifica la información de las existentes. Los cambios
            se reflejan de inmediato en el catálogo público.
          </p>
        </div>
        {/* Opción "REGISTRAR CANCHA" visible para el administrador */}
        {mode !== "create" && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            ＋ REGISTRAR CANCHA
          </button>
        )}
      </div>

      {feedback && <Alert kind={feedback.kind}>{feedback.text}</Alert>}
      {listError && <Alert kind="error">{listError}</Alert>}

      {mode !== "hidden" && (
        <form className="court-form card" onSubmit={handleSubmit}>
          <h2>{formTitle}</h2>
          {mode === "edit" && (
            <p className="page-hint">
              Información actual de la cancha seleccionada. Modifica los campos necesarios y
              guarda para actualizarla.
            </p>
          )}

          <div className="court-form-grid">
            <div className="field">
              <label htmlFor="cf-name">Nombre de la cancha *</label>
              <input
                id="cf-name"
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ej.: Cancha Central"
                maxLength={120}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-sport">Tipo de deporte *</label>
              <select
                id="cf-sport"
                value={form.sport_id}
                onChange={(e) => setField("sport_id", Number(e.target.value))}
                required
              >
                <option value={0}>Selecciona…</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cf-location">Ubicación *</label>
              <input
                id="cf-location"
                type="text"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Ej.: Calle 45 #12-34"
                maxLength={255}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-price">Precio por hora (COP) *</label>
              <input
                id="cf-price"
                type="number"
                min={1}
                max={1000000}
                step={500}
                value={form.price_per_hour}
                onChange={(e) => setField("price_per_hour", e.target.value)}
                placeholder="35000"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-capacity">Capacidad (personas) *</label>
              <input
                id="cf-capacity"
                type="number"
                min={1}
                max={100}
                value={form.capacity}
                onChange={(e) => setField("capacity", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-image">URL de imagen (opcional)</label>
              <input
                id="cf-image"
                type="url"
                value={form.image_url}
                onChange={(e) => setField("image_url", e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
            <div className="field field-full">
              <label htmlFor="cf-desc">Descripción (opcional)</label>
              <textarea
                id="cf-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Ej.: Césped sintético, techada, iluminación LED"
                maxLength={500}
              />
            </div>
            <label className="field-checkbox">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setField("is_available", e.target.checked)}
              />
              Disponible para reservas
            </label>
          </div>

          <div className="court-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !!validationError}>
              {saving ? "Guardando…" : "GUARDAR"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </button>
            {validationError && mode === "create" && (
              <span className="form-hint-error">{validationError}</span>
            )}
          </div>
        </form>
      )}

      <h2 className="admin-list-title">Canchas registradas ({courts.length})</h2>
      {loading ? (
        <p className="page-hint">Cargando canchas…</p>
      ) : courts.length === 0 ? (
        <div className="courts-empty">
          <p>Aún no hay canchas registradas.</p>
          <p className="page-hint">Usa el botón «REGISTRAR CANCHA» para agregar la primera.</p>
        </div>
      ) : (
        <ul className="admin-court-list">
          {courts.map((c) => (
            <li key={c.id} className={`admin-court-row${editingId === c.id ? " selected" : ""}`}>
              <div className="admin-court-info">
                <strong>{c.name}</strong>
                <span className="court-sport-badge">{c.sport?.name ?? ""}</span>
                <span
                  className={`court-status ${c.is_available ? "available" : "unavailable"}`}
                >
                  {c.is_available ? "Disponible" : "No disponible"}
                </span>
                <p className="court-detail">📍 {c.location} · 💰 {c.price_per_hour} COP/h · 👥 {c.capacity}</p>
              </div>
              <div className="admin-court-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openEdit(c)}
                >
                  ✏️ MODIFICAR
                </button>
                {/* Opción "ELIMINAR": el sistema solicita confirmar antes de retirar */}
                {deletingId === c.id ? (
                  <div className="delete-confirm" role="alertdialog" aria-label="Confirmar eliminación">
                    <span>¿Eliminar «{c.name}»?</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={confirmDelete}
                      disabled={deleteBusy}
                    >
                      {deleteBusy ? "Eliminando…" : "SÍ, ELIMINAR"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelDelete}
                      disabled={deleteBusy}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => askDelete(c)}
                    disabled={deleteBusy}
                  >
                    🗑️ ELIMINAR
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
