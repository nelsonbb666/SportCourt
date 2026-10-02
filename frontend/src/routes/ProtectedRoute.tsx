/** Ruta protegida: exige sesión activa; redirige a /login en caso contrario. */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <p className="page-hint">Cargando…</p>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
