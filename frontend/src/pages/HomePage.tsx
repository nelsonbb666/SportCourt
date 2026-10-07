/** Página principal (index) de SportCourt — diseño verde/blanco.
 *  Muestra la estructura de todas las funcionalidades implementadas:
 *  registro, inicio/cierre de sesión, perfil, recuperación de contraseña,
 *  consulta de canchas y consulta de disponibilidad. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/HomeNavbar";
import { courtService, type Court } from "../services/courtService";
import { useAuth } from "../context/AuthContext";
import "../styles/home.css";

const FEATURES = [
  { icon: "📝", title: "Registrar Usuario", text: "Crea tu cuenta con tus datos personales y accede a todas las funciones del sistema." },
  { icon: "🔐", title: "Iniciar Sesión", text: "Ingresa con tu correo y contraseña para acceder a tu cuenta de forma segura." },
  { icon: "🚪", title: "Cerrar Sesión", text: "Protege tu cuenta cerrando la sesión cuando termines de usar el sistema." },
  { icon: "👤", title: "Editar Perfil", text: "Actualiza tu nombre, correo o teléfono y cambia tu contraseña cuando quieras." },
  { icon: "🔄", title: "Recuperar Contraseña", text: "¿Olvidaste tu contraseña? Restablece el acceso a tu cuenta en pocos pasos." },
  { icon: "🏟️", title: "Consultar Cancha", text: "Explora las canchas registradas: nombre, tipo de deporte y ubicación de cada una." },
  { icon: "🗓️", title: "Consultar Disponibilidad", text: "Elige una cancha y una fecha para ver los horarios libres y ocupados." },
  { icon: "🎯", title: "Reservar Horario", text: "Reserva tu bloque horario favorito y asegura tu partido (próximamente)." },
];

const STEPS = [
  { title: "Regístrate", text: "Crea tu cuenta en un minuto con tus datos personales." },
  { title: "Consulta canchas", text: "Filtra por deporte o ubicación y revisa la disponibilidad por día." },
  { title: "Reserva tu horario", text: "Elige un bloque libre y confirma tu reserva." },
  { title: "¡A jugar!", text: "Presenta tu reserva en la cancha y disfruta del partido." },
];

const SPORT_ICONS: Record<string, string> = {
  Futbol: "⚽", Fútbol: "⚽", Baloncesto: "🏀", Basketball: "🏀",
  Tenis: "🎾", Tennis: "🎾", Voleibol: "🏐", Sóftbol: "⚾", Beisbol: "⚾",
};

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  // Previsualización real de canchas desde la API (GET /api/v1/courts)
  useEffect(() => {
    let alive = true;
    courtService
      .listCourts({ only_available: true })
      .then((data) => { if (alive) setCourts(data.slice(0, 6)); })
      .catch(() => { if (alive) setCourts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="home">
      <Navbar />

      {/* HERO */}
      <section className="home-hero">
        <span className="hero-badge">Sistema de reservas de canchas</span>
        <h1>
          Reserva tu cancha <span>en minutos</span>
        </h1>
        <p>
          SportCourt te permite encontrar canchas deportivas cerca de ti, consultar
          su disponibilidad por día y asegurar tu horario favorito. Simple, rápido y verde. 🌱
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <>
              <Link to="/canchas" className="btn-hero-primary">CONSULTAR CANCHA</Link>
              <Link to="/perfil" className="btn-hero-secondary">Mi perfil ({user?.full_name.split(" ")[0]})</Link>
            </>
          ) : (
            <>
              <Link to="/registro" className="btn-hero-primary">REGISTRAR USUARIO</Link>
              <Link to="/login" className="btn-hero-secondary">Iniciar sesión</Link>
            </>
          )}
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="home-section">
        <h2>Todo lo que necesitas</h2>
        <p className="home-section-sub">
          Estas son las funcionalidades disponibles en el sistema, organizadas para que
          pases de registrarte a jugar sin complicaciones.
        </p>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CANCHAS DESTACADAS */}
      <section className="home-courts-band">
        <div className="home-courts-inner">
          <h2 style={{ textAlign: "center", color: "#14532d", margin: "0 0 0.5rem", fontSize: "1.9rem" }}>
            Canchas disponibles
          </h2>
          <p className="home-section-sub">
            Nombre, tipo de deporte y ubicación de las canchas registradas en el sistema.
          </p>
          {loading ? (
            <p className="courts-empty-home">Cargando canchas…</p>
          ) : courts.length === 0 ? (
            <p className="courts-empty-home">
              Aún no hay canchas registradas. Inicia sesión y visita el catálogo para comenzar.
            </p>
          ) : (
            <div className="courts-preview-grid">
              {courts.map((c) => (
                <article key={c.id} className="preview-card">
                  <div className="preview-card-header">
                    <span className="court-icon">
                      {SPORT_ICONS[c.sport?.name ?? ""] ?? "🏟️"}
                    </span>
                    <h3>{c.name}</h3>
                    <span className="preview-sport">{c.sport?.name ?? "Deporte"}</span>
                  </div>
                  <p className="preview-line">📍 {c.location}</p>
                  <p className="preview-line preview-price">${Number(c.price_per_hour).toFixed(2)} / hora</p>
                </article>
              ))}
            </div>
          )}
          <div className="courts-cta">
            <Link to={isAuthenticated ? "/canchas" : "/login"} className="btn-cta">
              Ver todas las canchas →
            </Link>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="home-section">
        <h2>¿Cómo funciona?</h2>
        <p className="home-section-sub">Cuatro pasos del registro a la cancha.</p>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.title} className="step-card">
              <div className="step-number">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="home-cta-band">
        <h2>¿Listo para jugar?</h2>
        <p>Crea tu cuenta gratis y consulta la disponibilidad de las canchas hoy mismo.</p>
        {isAuthenticated ? (
          <Link to="/canchas" className="btn-hero-primary">CONSULTAR CANCHA</Link>
        ) : (
          <Link to="/registro" className="btn-hero-primary">REGISTRAR USUARIO</Link>
        )}
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <strong>🏀 SportCourt</strong> — Sistema de reserva de canchas · Verde y blanco · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
