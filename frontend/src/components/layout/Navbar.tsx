/** Barra de navegación con acciones según el estado de sesión. */
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">🏀 SportCourt</Link>
      <nav className="navbar-links">
        {isAuthenticated ? (
          <>
            <span className="navbar-user">Hola, {user?.full_name.split(" ")[0]}</span>
            <Link to="/canchas">CONSULTAR CANCHA</Link>
            <Link to="/perfil">Mi perfil</Link>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-primary">REGISTRAR USUARIO</Link>
          </>
        )}
      </nav>
    </header>
  );
}
