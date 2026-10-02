/** Recuperación de contraseña: solicitar enlace y establecer nueva contraseña. */
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { authService } from "../../services/authService";

type Step = "request" | "reset";

export default function RecoveryForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await authService.requestPasswordRecovery(email.trim());
      let msg = res.message;
      // En desarrollo la API devuelve el token directamente (sin servicio de correo aún)
      if (res.debug_reset_token) {
        setToken(res.debug_reset_token);
        msg += " (Modo desarrollo: copia el token y pégalo abajo para continuar.)";
      }
      setMessage(msg);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("La contraseña debe contener al menos una letra y un número."); return;
    }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const res = await authService.resetPassword(token.trim(), password);
      setMessage(`✅ ${res.message}`);
      setError("");
      setStep("request");
    } catch (err) {
      setError(err instanceof Error ? err.message : "El token no es válido o expiró.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-form">
      <h2>Recuperar contraseña</h2>
      <Alert kind="success">{message}</Alert>
      <Alert kind="error">{error}</Alert>

      {step === "request" ? (
        <form onSubmit={handleRequest}>
          <p className="page-hint">Ingresa tu correo electrónico registrado.</p>
          <Input label="Correo electrónico" name="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={loading}>Enviar</Button>
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <p className="page-hint">Pega el token de recuperación y define tu nueva contraseña.</p>
          <Input label="Token de recuperación" name="token" value={token}
            onChange={(e) => setToken(e.target.value)} required />
          <Input label="Nueva contraseña" name="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirmar nueva contraseña" name="confirm" type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required />
          <Button type="submit" loading={loading}>Establecer contraseña</Button>
        </form>
      )}
      <p className="page-hint"><Link to="/login">Volver a iniciar sesión</Link></p>
    </section>
  );
}
