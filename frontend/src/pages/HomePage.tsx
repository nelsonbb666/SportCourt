/** Página de inicio del sistema de reservas. */
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  return (
    <section className="hero">
      <h1>Reserva tu cancha en minutos</h1>
      <p className="page-hint">
        SportCourt te permite encontrar y reservar canchas deportivas cerca de ti.
      </p>
      {isAuthenticated ? (
        <>
          <p>Bienvenido/a, <strong>{user?.full_name}</strong>. 🎉</p>
          <p className="page-hint">
            La funcionalidad de reserva de canchas se construirá en las próximas historias de usuario.
          </p>
        </>
      ) : (
        <div className="hero-actions">
          <Link to="/registro" className="btn btn-primary">REGISTRAR USUARIO</Link>
          <Link to="/login" className="btn btn-secondary">Iniciar sesión</Link>
        </div>
      )}
    </section>
  );
}
