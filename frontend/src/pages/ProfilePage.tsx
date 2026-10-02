/** Editar perfil: nombre, teléfono y cambio de contraseña. */
import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(""); setErr("");
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() || null });
      setMsg("✅ Perfil actualizado correctamente.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(""); setPwErr("");
    if (pw.next.length < 8) { setPwErr("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (pw.next !== pw.confirm) { setPwErr("Las contraseñas no coinciden."); return; }
    setPwLoading(true);
    try {
      const res = await authService.changePassword(pw.current, pw.next);
      setPwMsg(`✅ ${res.message}`);
      setPw({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPwErr(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <section className="card-form">
      <h2>Mi perfil</h2>
      <p className="page-hint">Correo de la cuenta: <strong>{user?.email}</strong></p>

      <Alert kind="success">{msg}</Alert>
      <Alert kind="error">{err}</Alert>
      <form onSubmit={handleProfile}>
        <Input label="Nombre completo" name="full_name" value={fullName}
          onChange={(e) => setFullName(e.target.value)} required minLength={3} />
        <Input label="Teléfono" name="phone" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <Button type="submit" loading={loading}>Guardar cambios</Button>
      </form>

      <hr />
      <h3>Cambiar contraseña</h3>
      <Alert kind="success">{pwMsg}</Alert>
      <Alert kind="error">{pwErr}</Alert>
      <form onSubmit={handlePassword}>
        <Input label="Contraseña actual" name="current" type="password" value={pw.current}
          onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
        <Input label="Nueva contraseña" name="next" type="password" value={pw.next}
          onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required minLength={8} />
        <Input label="Confirmar nueva contraseña" name="confirm" type="password" value={pw.confirm}
          onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required minLength={8} />
        <Button type="submit" variant="secondary" loading={pwLoading}>Cambiar contraseña</Button>
      </form>
    </section>
  );
}
