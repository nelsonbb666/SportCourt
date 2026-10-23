# Pull Request — Sprint #1: Gestión de Usuarios

**Repositorio:** reserva-canchas
**Rama origen (head):** `feature/sprint-1-gestion-usuarios`
**Rama destino (base):** `develop`
**Tipo:** Feature sprint

---

## 📝 Resumen

Implementa el **Sprint #1** del sistema de reservas de canchas deportivas: gestión completa
de usuarios sobre **Firebase** (Auth + Cloud Firestore) con un frontend 100% estático
(HTML5 + CSS3 + JavaScript ES Modules desde CDN). Sin Node, sin npm, sin build: listo para
publicarse en **GitHub Pages**. Esta base queda preparada para el Sprint #2 (reserva de
canchas), que reutilizará la autenticación, el guard de páginas privadas y la colección
`usuarios`.

## ✨ Funcionalidades incluidas

| # | Funcionalidad | Páginas / módulos |
|---|---------------|-------------------|
| 1 | **Registro de usuario**: nombre completo, correo, teléfono, contraseña + confirmación. Crea la cuenta en Firebase Auth y guarda el perfil en Firestore (`usuarios/{uid}` con nombre, teléfono, correo y fecha de creación). Mensaje de éxito y redirección al login. | `pages/registro.html`, `js/auth.js` |
| 2 | **Inicio de sesión**: validación con Firebase; éxito → `dashboard.html`; error → *"Las credenciales no son válidas"* (mismo mensaje para correo inexistente o clave errónea). Si ya hay sesión, redirige directo al dashboard. | `pages/login.html`, `js/auth.js`, `js/guard.js` |
| 3 | **Cierre de sesión**: botón "Cerrar sesión" en la navbar cuando hay sesión activa; cierra en Firebase, redirige al inicio y bloquea `dashboard.html` / `perfil.html` (redirigen a login con `?next=`). | `js/guard.js` |
| 4 | **Editar perfil**: carga datos actuales desde Firestore; permite editar nombre y teléfono (correo solo lectura); cambio de contraseña con **reautenticación** (contraseña actual) y validación de la nueva. Confirmación al guardar y errores claros. Persistencia verificable al recargar. | `pages/perfil.html`, `js/perfil.js` |
| 5 | **Recuperar contraseña**: enlace "¿Olvidaste tu contraseña?" → `recuperar.html` → `sendPasswordResetEmail`. Siempre muestra el mensaje genérico *"Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña"* (no revela si el correo existe). La nueva contraseña se define desde el enlace de Firebase. | `pages/recuperar.html`, `js/auth.js` |

**Interfaz y UX**
- Tema deportivo verde/blanco, **responsive** (Flexbox/Grid, breakpoint móvil ≤600 px).
- **Navbar dinámica**: sin sesión → "Registrar usuario / Iniciar sesión"; con sesión →
  "Dashboard / Mi perfil / saludo con nombre / Cerrar sesión".
- Mensajes de éxito/error **en pantalla** (sin `alert`), todos en español.
- Botones **deshabilitados con texto de progreso** mientras procesan ("Registrando...", "Verificando...", etc.).
- **Traducción de códigos de error de Firebase** a mensajes amigables:
  `auth/email-already-in-use`, `auth/wrong-password`, `auth/invalid-credential`,
  `auth/user-not-found`, `auth/weak-password`, `auth/too-many-requests`,
  `auth/network-request-failed`, `auth/requires-recent-login`, entre otros (`js/utils.js`).

**Seguridad**
- `js/firebase-config.js` con **placeholders** y comentario explicando dónde pegar la config real.
- `firestore.rules`: cada usuario solo puede leer/escribir su propio documento
  (`match /usuarios/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`)
  y denegación por defecto para cualquier otra ruta.
- **Nunca se almacenan contraseñas en Firestore** (solo en Firebase Auth).

## 🧪 Cómo probar

1. Clonar y configurar Firebase (ver README: Auth Email/Password + Firestore + pegar
   `firebaseConfig` en `js/firebase-config.js`).
2. Servir localmente: `python -m http.server 8000` (o Live Server de VS Code) → abrir
   `http://localhost:8000`.
3. Flujo completo:
   - Inicio → **REGISTRAR USUARIO** → llenar formulario → mensaje "¡Registro exitoso!" →
     redirige al login (con aviso "Registro completado").
   - Probar validaciones: correo mal formado, contraseña `abc1234` (sin letras+número),
     contraseñas que no coinciden, correo duplicado → *"Este correo ya está registrado..."*.
   - Login correcto → **Dashboard** con saludo y correo. Login incorrecto →
     *"Las credenciales no son válidas."*.
   - **Mi perfil** → cambiar nombre/teléfono → guardar → **recargar** → los cambios persisten.
     Cambiar contraseña con clave actual incorrecta → error claro.
   - **Cerrar sesión** → vuelve al inicio; abrir directamente `/pages/dashboard.html` o
     `/pages/perfil.html` → redirige al login.
   - **¿Olvidaste tu contraseña?** → enviar correo → mensaje genérico y bandeja de entrada
     con el enlace de Firebase para definir nueva contraseña.
4. GitHub Pages: publicar la rama y verificar el mismo flujo en
   `https://<usuario>.github.io/<repo>/` (agregar el dominio a *Authorized domains* en Firebase).

## ✅ Checklist de criterios de aceptación (Definition of Done)

- [x] Me registro y veo el mensaje de confirmación.
- [x] Inicio sesión con credenciales correctas (redirige a `dashboard.html`).
- [x] Con credenciales incorrectas veo **"Las credenciales no son válidas"**.
- [x] Cierro sesión, soy redirigido al inicio y las páginas privadas quedan bloqueadas.
- [x] Edito mi perfil y los cambios persisten al recargar (Firestore).
- [x] Recibo el correo de recuperación y puedo definir una nueva contraseña.
- [x] El sitio funciona publicado en GitHub Pages (rutas relativas + subruta compatible).
- [x] El README permite a otra persona ponerlo en marcha desde cero.
- [x] Validaciones: campos obligatorios, correo válido, contraseña ≥8 con letras y números,
      contraseñas coinciden, correo duplicado con mensaje claro.
- [x] Navbar cambia según estado de sesión; botones se deshabilitan al procesar.
- [x] Reglas de seguridad: acceso restringido al propio documento; sin contraseñas en Firestore.

## 🔁 Commits del sprint (Conventional Commits)

```
chore: inicialización del repositorio (README, .gitignore, LICENSE)
feat(ui): estilos base y página de inicio
feat(auth): registro de usuario
feat(auth): inicio y cierre de sesión
feat(perfil): edición de perfil
feat(auth): recuperación de contraseña
docs: README con guía de configuración de Firebase y GitHub Pages
chore: estructura inicial del proyecto (carpetas pages, css, js, assets)
```

## ⚠️ Notas para el revisador

- Los valores de `firebase-config.js` son **placeholders**: cada entorno pega su propia
  configuración (no va en el repo por convención del equipo; la API key es pública pero se
  controlan dominios autorizados y reglas).
- Tras registrarse se cierra la sesión creada por Firebase para cumplir el criterio
  "redirigir al inicio de sesión" (comentado en `js/auth.js`).
- `dashboard.html` es una zona privada de bienvenida: base para las reservas del Sprint #2.
- No hay cambios visuales regresivos: todo el CSS es nuevo y modular.

**Merge:** squash sugerido o merge commit normal hacia `develop`. Eliminar la rama tras fusionar.
