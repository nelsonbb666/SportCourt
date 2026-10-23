# ⚽ Reserva de Canchas

Sistema web para **reserva de canchas deportivas**. Este repositorio contiene el
**Sprint #1: Gestión de Usuarios** (registro, login, perfil, recuperación de contraseña) y el
**Sprint #2: Gestión de Canchas** (roles de administrador, CRUD de canchas y consulta de
disponibilidad por fecha). El Sprint #3 añadirá la reserva de horarios sobre el modelo de
datos `reservas` ya definido aquí.

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
│   ├── dashboard.html      Zona privada de bienvenida + acceso a canchas
│   ├── canchas.html        CONSULTAR CANCHA: listado con filtros (privada)
│   ├── disponibilidad.html Horarios por cancha y fecha (privada)
│   └── admin-cancha-form.html  REGISTRAR/MODIFICAR cancha (solo admin)
├── css/
│   └── styles.css          Estilos (tema deportivo verde/blanco, responsive)
├── js/
│   ├── firebase-config.js  Inicialización de Firebase (pegar aquí tu configuración)
│   ├── auth.js             Registro, login, logout, recuperación
│   ├── perfil.js           Leer y editar perfil
│   ├── guard.js            Protección de páginas + navbar + esAdmin()
│   ├── canchas.js          Listado, registro, modificación y eliminación de canchas
│   ├── disponibilidad.js   generarBloques() + consulta de reservas del día
│   └── utils.js            Validaciones, mensajes, modal de confirmación y helpers de fecha/hora
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


## 🏟️ Sprint #2: Gestión de Canchas

### Roles de usuario

Cada documento de `usuarios` ahora incluye el campo `rol`:

- `"usuario"` → asignado automáticamente al registrarse (ver `js/auth.js`). Puede consultar
  canchas y disponibilidad.
- `"admin"` → puede además registrar, modificar y eliminar canchas.

**Cómo crear un administrador:** Firebase Console → *Firestore Database* → colección
`usuarios` → documento del usuario → editar el campo `rol` y cambiar su valor de `usuario`
a `admin` → guardar. (No existe autoascenso: las reglas impiden que un usuario se cambie
el rol a sí mismo.)

La protección de páginas de administrador funciona en dos capas:

1. **Cliente:** `js/guard.js` exporta `esAdmin()` (lee el rol desde Firestore), protege las
   páginas con `<body data-page="admin">` (redirige al dashboard con mensaje si no eres
   admin) y muestra en la navbar las opciones de administración solo a administradores.
2. **Servidor (la seguridad real):** las reglas de `firestore.rules` exigen `esAdmin()` para
   escribir en `canchas`. Ocultar botones **no es seguridad**: aunque alguien edite el DOM o
   escriba contra la API directamente, Firestore rechazará la operación.

### Modelo de datos (Firestore)

```
canchas/{idAuto}
  nombre: string (único de forma lógica, validado en el formulario)
  tipo: "Fútbol 5" | "Fútbol 7" | "Fútbol 11" | "Baloncesto" | "Tenis" | "Voleibol" | "Pádel" | ...
  ubicacion: string
  descripcion: string (opcional)
  precioHora: number | null (opcional)
  horaApertura: "HH:mm"   ej. "08:00"
  horaCierre: "HH:mm"     ej. "22:00"
  activa: boolean (por defecto true)
  creadaEn / actualizadaEn: timestamp

reservas/{idAuto}    ← definido en este sprint; el Sprint #3 escribirá aquí
  canchaId: string (id del documento en "canchas")
  usuarioId: string (UID del autor)
  fecha: "YYYY-MM-DD"
  horaInicio / horaFin: "HH:mm"
  estado: "confirmada" | "cancelada"
  creadaEn: timestamp
```

La disponibilidad se calcula con `generarBloques(cancha, fecha, reservas)`
(`js/disponibilidad.js`): genera bloques de **1 hora** entre apertura y cierre, marca como
`ocupado` cualquier bloque que intersecte una reserva confirmada del día, y como `pasado`
los bloques de hoy cuya hora de inicio ya pasó. Fechas pasadas: bloqueadas en el formulario
y validadas en código. El botón **Reservar** aparece deshabilitado con el aviso
*"Reservar (Sprint #3)"*.

### Publicar las reglas de Firestore (obligatorio tras este sprint)

1. Firebase Console → *Firestore Database → Rules*.
2. Reemplaza todo el contenido por el de [`firestore.rules`](firestore.rules) y pulsa
   **Publish**.
3. Alternativa con Firebase CLI: `firebase deploy --only firestore:rules`.

Sin este paso, las consultas a `canchas`/`reservas` fallarán con *permission-denied*
(el sitio lo indica con un mensaje en pantalla).

### Datos de ejemplo (3 canchas)

Con una cuenta **admin** con sesión activa, abre cualquier página del sitio, ve a la consola
del navegador (F12) y ejecuta:

```js
import("./assets/cargar-datos-ejemplo.js")
```

El script crea "La Estrella" (Fútbol 5), "El Coliseo" (Baloncesto) y "Racket Park" (Tenis).
Si ya existen documentos en `canchas`, no duplica nada. (También puedes crearlas a mano con
el botón **REGISTRAR CANCHA**.)

### ✅ Cómo probar el Sprint #2

**Como usuario normal:**
1. Regístrate/inicia sesión → la navbar muestra **CONSULTAR CANCHA** (sin opciones de admin).
2. Abre `pages/canchas.html` → tarjetas con nombre, tipo, ubicación, horario y precio;
   prueba el filtro por tipo y la búsqueda por nombre. Sin canchas verás *"Aún no hay
   canchas registradas"*.
3. Clic en **Ver disponibilidad** → elige cancha y fecha → verás los bloques de 1 hora en
   verde (disponible), gris (ocupado) y rojo (ya pasó hoy), con leyenda y conteo
   *"X horarios disponibles de Y"*. Intenta elegir ayer: no se permite.
4. Si escribes en la barra de direcciones `pages/admin-cancha-form.html`, serás redirigido
   al dashboard con el mensaje *"No tienes permisos de administrador..."*; e incluso si
   manipulas el DOM, Firestore rechazará la escritura (reglas).

**Como administrador (cambia `rol` a `"admin"` en Firebase Console primero):**
1. La navbar agrega **REGISTRAR CANCHA**; deja vacíos nombre/tipo/ubicación/horarios →
   errores en español; pon cierre ≤ apertura → error; precio negativo → error; repite un
   nombre existente → error de duplicado.
2. Guarda una cancha válida → mensaje de éxito y aparece en el listado.
3. **MODIFICAR** en la tarjeta → el mismo formulario carga los datos actuales → cámbialos →
   guarda → el listado refleja los cambios y se actualiza `actualizadaEn`.
4. **ELIMINAR** → modal de confirmación propio con el nombre de la cancha (prueba Cancelar y
   Escape); confirma → desaparece sin recargar y ves el mensaje de éxito. Si la cancha tiene
   reservas futuras confirmadas, el modal muestra una advertencia previa.

## 🗺️ Roadmap

- ✅ Sprint #1: Gestión de usuarios (este entregable)
- ✅ Sprint #2: Gestión de canchas, roles y disponibilidad (este entregable)
- ⏭️ Sprint #3: Reservas, calendario y confirmaciones (escribe en la colección `reservas` ya definida)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
