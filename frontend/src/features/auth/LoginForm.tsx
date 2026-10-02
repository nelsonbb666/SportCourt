/** Formulario de inicio de sesión (historias: Iniciar Sesión / credenciales inválidas). */
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email: email.trim(), password });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-form">
      <h2>Iniciar sesión</h2>
      <Alert kind="error">{error}</Alert>
      <form onSubmit={handleSubmit}>
        <Input label="Correo electrónico" name="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña" name="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" loading={loading}>Entrar</Button>
      </form>
      <p className="page-hint">
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link> ·{" "}
        <Link to="/registro">Crear cuenta</Link>
      </p>
    </section>
  );
}
