/** Formulario de registro de usuario (historia: Registrar Usuario). */
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }));

  const validate = (): string => {
    if (form.full_name.trim().length < 3) return "El nombre completo debe tener al menos 3 caracteres.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Ingresa un correo electrónico válido.";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      return "La contraseña debe contener al menos una letra y un número.";
    if (form.password !== form.confirm) return "Las contraseñas no coinciden.";
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); setSuccess(""); return; }
    setLoading(true);
    setError("");
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      setSuccess("✅ ¡Registro exitoso! El usuario fue registrado correctamente. Puedes iniciar sesión.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-form">
      <h2>Registrar usuario</h2>
      <p className="page-hint">Ingresa tus datos personales para crear tu cuenta.</p>
      <Alert kind="success">{success}</Alert>
      <Alert kind="error">{error}</Alert>
      <form onSubmit={handleSubmit} noValidate>
        <Input label="Nombre completo" name="full_name" value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)} placeholder="Ej: Ana Pérez" required />
        <Input label="Correo electrónico" name="email" type="email" value={form.email}
          onChange={(e) => set("email", e.target.value)} placeholder="tucorreo@example.com" required />
        <Input label="Teléfono (opcional)" name="phone" value={form.phone}
          onChange={(e) => set("phone", e.target.value)} placeholder="+57 300 1234567" />
        <Input label="Contraseña" name="password" type="password" value={form.password}
          onChange={(e) => set("password", e.target.value)} minLength={8} required />
        <Input label="Confirmar contraseña" name="confirm" type="password" value={form.confirm}
          onChange={(e) => set("confirm", e.target.value)} minLength={8} required />
        <Button type="submit" loading={loading}>Guardar</Button>
      </form>
      <p className="page-hint">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </section>
  );
}
