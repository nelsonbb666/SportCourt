# ⚽ Reserva de Canchas

Sistema web para **reserva de canchas deportivas**. Este repositorio contiene actualmente el
**Sprint #1: Gestión de Usuarios** (registro, inicio de sesión, cierre de sesión, edición de
perfil y recuperación de contraseña). Los siguientes sprints añadirán la reserva de canchas
sobre esta misma base.

## 🧰 Stack

- **Frontend:** HTML5, CSS3 y JavaScript puro (módulos ES). Sin frameworks ni compilación.
- **Backend / Auth / BD:** Firebase (SDK modular v10+ desde CDN):
  - Firebase Authentication (correo y contraseña)
  - Cloud Firestore (perfiles en la colección `usuarios`)
- **Hosting:** GitHub Pages (sitio 100% estático).
- **Sin Node, sin npm, sin servidor propio.**

## 📁 Estructura

```
reserva-canchas/
├── index.html              Inicio con "REGISTRAR USUARIO" e "INICIAR SESIÓN"
├── pages/
│   ├── registro.html       Formulario de registro
│   ├── login.html          Inicio de sesión + enlace de recuperación
│   ├── recuperar.html      Envío de correo de recuperación
│   ├── perfil.html         Ver/Editar perfil y cambiar contraseña (privada)
│   └── dashboard.html      Zona privada de bienvenida (base para reservas)
├── css/
│   └── styles.css          Estilos (tema deportivo verde/blanco, responsive)
├── js/
│   ├── firebase-config.js  Inicialización de Firebase (pegar aquí tu configuración)
│   ├── auth.js             Registro, login, logout, recuperación
│   ├── perfil.js           Leer y editar perfil
│   ├── guard.js            Protección de páginas privadas + navbar dinámica
│   └── utils.js            Validaciones y mensajes en pantalla
├── assets/                 Imágenes/íconos
├── firestore.rules         Reglas de seguridad de Firestore
├── .gitignore
├── README.md
└── LICENSE
```

## 🔥 Configuración de Firebase (paso a paso)

1. Entra a [console.firebase.google.com](https://console.firebase.google.com/) y crea un
   proyecto (por ejemplo `reserva-canchas`). Puedes omitir Google Analytics.
2. **Authentication:**
   - Menú *Authentication → Get started → Sign-in method*.
   - Habilita el proveedor **Correo/contraseña (Email/Password)** y guarda.
3. **Firestore:**
   - Menú *Firestore Database → Create database* (elige una región cercana, inicia en modo
     de producción).
   - Pega el contenido de [`firestore.rules`](firestore.rules) en la pestaña **Rules** y
     publica. Esto garantiza que cada usuario solo puede leer/escribir su propio documento
     en la colección `usuarios`.
4. **Obtén la configuración web:**
   - *Project settings (⚙️) → Your apps → Add app (Web) →* copia el objeto `firebaseConfig`.
5. **Pega tu configuración real** en el archivo
   [`js/firebase-config.js`](js/firebase-config.js), reemplazando los *placeholders*:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...tu-clave",
     authDomain: "reserva-canchas.firebaseapp.com",
     projectId: "reserva-canchas",
     storageBucket: "reserva-canchas.appspot.com",
     messagingSenderId: "000000000000",
     appId: "1:000000000000:web:abcdef123456"
   };
   ```

6. **Dominios autorizados:** en *Authentication → Settings → Authorized domains*, agrega el
   dominio de GitHub Pages (`<usuario>.github.io`) cuando publiques el sitio.

> ⚠️ La API key de Firebase **no es un secreto**: es pública por diseño y se protege con las
> reglas de seguridad y la lista de dominios autorizados. Aun así, nunca almacenes contraseñas
> en Firestore (este proyecto no lo hace: solo nombre, teléfono, correo y fecha de creación).

## ▶️ Ejecutar en local

Opción A — **Live Server (VS Code):** instala la extensión *Live Server*, abre `index.html`
y pulsa *Go Live*.

Opción B — **Python** (desde la raíz del repo):

```bash
python -m http.server 8000
# Abre http://localhost:8000
```

> No abras el sitio con `file://` si quieres que Auth/Firestore funcionen con total normalidad;
> sirve siempre por HTTP (los navegadores restringen dominios `file://`).

## 🚀 Publicar en GitHub Pages

1. Sube el código al repositorio (rama `main`).
2. En GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main` / root → Save*.
3. Espera 1–2 minutos y abre la URL publicada (`https://<usuario>.github.io/<repo>/`).
4. Si el sitio se sirve desde una subruta, los enlaces internos ya usan rutas **relativas**,
   por lo que funcionará sin cambios. Agrega `<usuario>.github.io` a los dominios autorizados
   de Firebase (paso 6 de arriba).

## ✅ Cómo probar el Sprint #1

1. Abre el sitio → clic en **REGISTRAR USUARIO** → completa el formulario → verás el mensaje
   de confirmación y serás redirigido a **Iniciar sesión**.
2. Inicia sesión con credenciales válidas → entras al **Dashboard**. Con credenciales
   incorrectas verás *"Las credenciales no son válidas"*.
3. Usa **Cerrar sesión** en la barra superior → vuelves al inicio; si intentas abrir
   `dashboard.html` o `perfil.html` te redirige al login.
4. Con sesión activa entra a **Mi perfil** → edita nombre/teléfono → recarga → los cambios
   persisten. También puedes cambiar tu contraseña (pidiendo la actual).
5. En el login, usa **¿Olvidaste tu contraseña?** → ingresa tu correo → recibirás el enlace
   de Firebase para definir una nueva contraseña.

## 🌿 Flujo de ramas

- `main`: versión estable/publicada.
- `develop`: integración del sprint.
- `feature/sprint-1-gestion-usuarios`: desarrollo del Sprint #1 (merge a `develop` vía PR).

## 🔐 Seguridad

- **Reglas de Firestore** ([`firestore.rules`](firestore.rules)): cada usuario solo puede
  leer y escribir su propio documento en la colección `usuarios` (`request.auth.uid == uid`).
  Cualquier otra ruta queda denegada por defecto.
- **Las contraseñas nunca se guardan en Firestore**: solo viven en Firebase Authentication.
  El perfil almacena únicamente nombre, teléfono, correo y fecha de creación.
- La recuperación de contraseña usa el enlace oficial de Firebase (`sendPasswordResetEmail`)
  y siempre muestra un mensaje genérico para no revelar si un correo existe o no.
- Las páginas privadas (`dashboard.html`, `perfil.html`) están protegidas por `js/guard.js`:
  sin sesión activa redirigen al login.

## 🗺️ Roadmap

- ✅ Sprint #1: Gestión de usuarios (este entregable)
- ⏭️ Sprint #2: Catálogo de canchas y disponibilidad
- ⏭️ Sprint #3: Reservas, calendario y confirmaciones

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
