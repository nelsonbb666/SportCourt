/** Componente raíz: proveedores globales y rutas de SportCourt. */
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "../components/layout/HomeNavbar";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "../routes/ProtectedRoute";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import RecoveryPage from "../pages/RecoveryPage";
import RegisterPage from "../pages/RegisterPage";
import CourtsPage from "../pages/CourtsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar" element={<RecoveryPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/canchas" element={<CourtsPage />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
