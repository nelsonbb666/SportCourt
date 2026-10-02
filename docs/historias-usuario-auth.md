# Historias de usuario — Módulo de autenticación (SportCourt)

## 1. Registrar Usuario ✅
**Escenario: Registro exitoso.** Dado que estoy en el sistema de reservas, cuando selecciono "REGISTRAR USUARIO" (`/registro`), entonces el sistema muestra un formulario con mis datos personales y al guardar registra al usuario correctamente con mensaje de confirmación.
- API: `POST /api/v1/auth/register` → 201; 409 si el correo ya existe; 422 si la contraseña es débil o el correo es inválido.

## 2. Iniciar Sesión ✅
- **Éxito:** `POST /api/v1/auth/login` valida credenciales, devuelve JWT + datos del usuario y permite ingresar.
- **Fallo:** credenciales incorrectas → 401 con mensaje "Las credenciales no son válidas".

## 3. Cerrar Sesión ✅
"Cerrar sesión" (navbar) llama `POST /api/v1/auth/logout`, elimina el token del cliente y redirige a `/login`. Sin token válido → 401.

## 4. Editar Perfil ✅
`GET/PUT /api/v1/auth/me` (protegido con JWT). Página `/perfil`: nombre, teléfono y cambio de contraseña propio (`PUT /api/v1/auth/me/password`).

## 5. Recuperar Contraseña ✅
- `POST /api/v1/auth/password-recovery`: solicita correo; si está registrado inicia el proceso (token de 30 min). Si no existe, respuesta neutra (no revela correos).
- `POST /api/v1/auth/password-reset`: valida el token y permite establecer nueva contraseña.
- ⚠️ Pendiente: enviar el token por email (aún no hay servicio de correo configurado; en desarrollo se expone `debug_reset_token`).

## Seguridad
- Contraseñas con hash bcrypt; nunca se almacenan ni devuelven en texto plano.
- Tokens JWT HS256 (expiración 24 h; reset 30 min).
- Rutas protegidas: `/perfil` exige sesión (frontend `ProtectedRoute`, backend dependencia `get_current_user`).
