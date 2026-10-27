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

## 📅 Sprint #3: Gestión de Reservas

Completa el flujo principal del sistema: **reservar → consultar → cancelar**.

### Nuevas páginas y archivos

| Archivo | Descripción |
|---|---|
| `pages/mis-reservas.html` | Listado de reservas del usuario con pestañas **Próximas / Pasadas / Canceladas** |
| `js/reservas.js` | `crearReserva()` (transacción anti doble-reserva), `cancelarReserva()`, listado y UI de "Mis reservas" |
| `js/disponibilidad.js` | Botón **Reservar** activo en cada bloque disponible + modal de resumen + refresco sin recargar |
| `js/utils.js` | Helpers nuevos: `fechaHoraEsPasada()`, `minutosHasta()`, `CONSTANTE.config` y modal con resumen |
| `firestore.rules` | Reglas endurecidas para la colección `reservas` (ver más abajo) |

### Modelo de datos ampliado (`reservas`)

Además de los campos del Sprint #2, cada documento incluye ahora:

```json
{
  "canchaId": "abc123",
  "canchaNombre": "Cancha Central",
  "canchaTipo": "Fútbol 5",
  "canchaUbicacion": "Av. Principal 100",
  "usuarioId": "<uid>",
  "fecha": "2026-06-20",
  "horaInicio": "18:00",
  "horaFin": "19:00",
  "precio": 15000,
  "estado": "confirmada",
  "creadaEn": "<timestamp>",
  "canceladaEn": null
}
```

`canchaNombre`, `canchaTipo`, `canchaUbicacion` y `precio` son **copias al momento de
reservar** (así "Mis reservas" no necesita consultas extra); `canceladaEn` es timestamp
solo al cancelar.

El **ID del documento es determinista**: `canchaId_fecha_horaInicio`
(ej. `abc123_2026-06-20_18:00`). La escritura se hace con `runTransaction()`:

1. Lee ese ID; si existe con `estado == "confirmada"` → aborta con **"Este horario ya fue reservado"**.
2. Si no existe o está `cancelada` → lo escribe como `confirmada` (reutiliza el documento, sin duplicados).

Así dos usuarios **no pueden reservar el mismo horario**, aunque hagan clic a la vez.

### Validaciones antes de reservar

- La cancha debe existir y estar `activa`.
- La fecha/hora no puede ser pasada.
- El horario debe estar dentro de `horaApertura`–`horaCierre` de la cancha.
- El usuario no puede tener otra reserva confirmada **a la misma fecha y hora** (en cualquier cancha).
- El botón queda deshabilitado mientras se procesa (anti doble clic).

### Cancelación

- Botón **CANCELAR** solo en reservas próximas/confirmadas, con modal de confirmación propio.
- Se actualiza `estado` a `"cancelada"` y se registra `canceladaEn` (el documento NO se borra, conserva historial).
- Al volver a consultar disponibilidad, el horario aparece **disponible** (porque `generarBloques()` solo cuenta las reservas `confirmada`).
- **Regla opcional de anticipación**: en `js/utils.js`,
  `CONSTANTE.config.minHorasAnticipacionCancelacion` — por defecto `0` (desactivada).
  Ponla p. ej. en `24` para exigir un día de anticipación al cancelar.

### 🔐 Reglas de Firestore para `reservas` (Sprint #3)

⚠️ **Debes volver a publicar las reglas** en Firebase Console → Firestore Database →
Rules → *Publish* (o `firebase deploy --only firestore:rules`); el archivo
`firestore.rules` de este repositorio queda así:

- **read**: cualquier usuario autenticado (necesario para marcar horarios ocupados).
- **create**: solo con `usuarioId == uid propio` y `estado == "confirmada"`, con campos obligatorios validados.
- **update**: admin siempre; o el dueño para **cancelar la propia**, o para **reutilizar un horario ya cancelado** escribiéndose como nueva reserva confirmada.
- **delete**: solo admin.

Un atacante que manipule el cliente no podrá crear reservas suplantando otro `usuarioId`,
escribir estados inválidos, modificar/cancelar reservas ajenas ni borrar documentos.
Recordar: ocultar botones en la UI **no** es seguridad; la protección real son estas reglas.

### 🗂️ Índices de Firestore

**No se requieren índices compuestos nuevos en este sprint**: todas las consultas usan
solo filtros `where` de igualdad (`usuarioId`, `fecha`, `estado`) y el ordenamiento de las
próximas (de la más cercana a la más lejana) se hace **en el cliente**, precisamente para
evitar índices.

Si más adelante combinas `where` + `orderBy` sobre campos distintos (p. ej.
`where("usuarioId","==",uid)` + `orderBy("fecha")`), al primer error Firestore imprimirá
en la consola del navegador un enlace directo tipo
`https://console.firebase.google.com/...?creationUri=...`; ábrelo y acepta para crear el
índice compuesto sugerido (`usuarioId` ascending + `fecha` ascending). También puedes
crearlo a mano en Firebase Console → Firestore Database → **Índices** → *Crear índice*.

### 🔒 Nota de privacidad

Para pintar los bloques ocupados, `disponibilidad.html` lee las reservas de todos los
usuarios autenticados (cualquiera con sesión podría ver qué UID reservó cada horario).
Si más adelante quieres ocultar **quién** reservó, mueve la marca de ocupación a una
colección separada `ocupaciones` con solo `{canchaId, fecha, horaInicio}` (lectura libre
para autenticados) y restringe la lectura de `reservas` al dueño y al admin.

### ✅ Cómo probar el Sprint #3 (pruebas manuales)

Necesitas **dos cuentas de usuario normal** (A y B) y una cancha activa creada por el admin.

1. **Usuario A** entra a *Consultar cancha → Ver disponibilidad*, elige una fecha futura,
   pulsa **Reservar** en un bloque verde → modal de resumen (cancha, tipo, ubicación,
   fecha, horario, precio) → **CONFIRMAR RESERVA** → mensaje *"✅ Reserva confirmada"*, el
   bloque pasa a **Ocupado** sin recargar y aparece el enlace *Ver mis reservas →*.
2. **Usuario B** (ventana incógnito u otro navegador) consulta la misma cancha/fecha → el
   bloque aparece **Ocupado**; si fuerza la reserva desde la consola, la transacción
   responde *"Este horario ya fue reservado"*. ✔️ Dos usuarios no reservan el mismo horario.
3. **Usuario A** va a *Mis reservas* → ve su reserva en **Próximas** (verde *Confirmada*)
   con cancha, tipo, ubicación, fecha legible en español, horario y precio → pulsa
   **CANCELAR** → modal *"¿Seguro que deseas cancelar tu reserva de ...?"* → confirma →
   la tarjeta se mueve a **Canceladas** sin recargar, con mensaje de éxito.
4. En *Disponibilidad*, vuelve a consultar esa fecha → el horario aparece **Disponible**. ✔️
5. **Usuario B** reserva ese mismo horario → funciona y reutiliza el documento (en Firebase
   Console sigue habiendo **un solo doc** con ese ID, ahora con el uid de B). ✔️
6. **Usuario A** intenta reservar dos canchas distintas a la misma hora del mismo día →
   recibe *"Ya tienes una reserva confirmada el ... No puedes reservar dos canchas a la
   misma hora."* ✔️
7. En *Mis reservas* de B no aparece ninguna reserva de A (consulta filtrada por
   `usuarioId`; las reglas además impiden escribir como otro usuario). ✔️
8. Bloques de hoy cuya hora ya pasó aparecen *No disponible*; intentar reservar una fecha
   pasada se rechaza. ✔️
9. Sin publicar las reglas nuevas, reservar falla con *"No tienes permisos..."* →
   publícalas. Un usuario normal no puede borrar reservas (`delete` solo admin). ✔️

## 🛡️ Sprint #4: Administración de Reservas

Panel del administrador para controlar todas las reservas del sistema y gestionar las cuentas de usuario.

### Nuevas páginas y archivos

- `pages/admin-reservas.html` + `js/admin-reservas.js`: listado de **todas las reservas** con filtros (rango de fechas, cancha, estado, búsqueda por nombre/correo), contadores (total, confirmadas, canceladas, de hoy), orden invertible, "Cargar más", cancelación por el admin con motivo y **exportación a CSV**.
- `pages/admin-usuarios.html` + `js/admin-usuarios.js`: listado de usuarios con búsqueda y filtros por rol/estado, panel de detalle con sus reservas, y acciones de **activar/desactivar** y **cambiar rol** con modal de confirmación.
- `js/reservas.js`: `cancelarReservaComoAdmin()` (registra `canceladaPor` y `motivoCancelacion`).
- `js/utils.js`: helper de exportación CSV (BOM UTF-8 para Excel y protección anti inyección de fórmulas).

### Campo `activo` en `usuarios`

- El registro crea siempre `activo: true`. Los usuarios antiguos sin el campo se consideran **activos** (compatibilidad); para desactivar manualmente, agrega en Firestore el booleano `activo = false` al documento.
- **Login:** si `activo === false`, se cierra la sesión de inmediato con el mensaje *"Tu cuenta está desactivada. Contacta al administrador"*.
- **`guard.js`:** una sesión ya abierta de un usuario inactivo se cierra y redirige al login con el mismo mensaje.
- **Reglas:** un usuario inactivo no puede crear reservas (`usuarioActivo()`).

### Protecciones obligatorias del admin

- Un administrador **no puede desactivarse ni quitarse el rol a sí mismo**.
- Debe quedar **siempre al menos un administrador activo** (la acción se bloquea si sería el último).

### ⚠️ Limitación técnica (sin backend)

Desde el navegador **no se puede eliminar ni deshabilitar cuentas de Firebase Authentication de otros usuarios** (requiere Admin SDK o Cloud Functions). Por eso la gestión de cuentas se implementa sobre Firestore con el campo `activo`. Si más adelante se necesita eliminación real, se haría con una Cloud Function que use `admin.auth().deleteUser(uid)`.

### 🔐 Publicar las reglas (obligatorio)

`firestore.rules` incluye ahora `usuarioActivo()`, lectura de perfiles por admin, actualización restringida de `rol`/`activo` y bloqueo de reservas a inactivos. Copia el archivo completo en Firebase Console → Firestore → Reglas → **Publicar**.

### ✅ Cómo probar el Sprint #4 (pruebas manuales)

1. Admin abre **"Reservas"** y ve usuario, cancha, fecha y hora de todas las reservas. ✔
2. Los filtros por fecha, cancha, estado y usuario devuelven resultados correctos. ✔
3. Admin cancela la reserva de otro usuario → el horario vuelve a estar disponible. ✔
4. Usuario normal intenta abrir `admin-reservas.html` o `admin-usuarios.html` por URL → es redirigido al dashboard. ✔
5. Admin abre **"Usuarios"**, ve la lista y el detalle con las reservas de un usuario. ✔
6. Admin desactiva a un usuario → ese usuario no puede iniciar sesión (ni seguir usando una sesión abierta). ✔
7. Admin reactiva al usuario → vuelve a ingresar. ✔
8. Admin cambia el rol de un usuario → ese usuario ve (o deja de ver) las opciones de administración. ✔
9. Admin intenta desactivarse o quitarse el rol a sí mismo → se bloquea. ✔
10. Un usuario normal intenta cambiar su propio `rol` o `activo` desde la consola del navegador → las reglas lo rechazan. ✔

## 📊 Sprint #5: Panel de Control y Reportes

El administrador ahora tiene una visión general del sistema, **sin librerías de gráficos ni colecciones nuevas**: todo se calcula leyendo `reservas`, `canchas` y `usuarios`. Las reglas de Firestore del Sprint #4 ya permiten esas lecturas al admin (`firestore.rules` no cambió en este sprint).

### Nuevas páginas (solo admin)

| Página | Contenido |
|---|---|
| `pages/admin-panel.html` | Indicadores + ingresos por periodo |
| `pages/admin-reportes.html` | Generar reporte por rango, exportar CSV e imprimir |

Nuevos enlaces en la navbar visibles solo para admin: **"Panel de control"** y **"Reportes"**. El dashboard del admin incluye "PANEL DE CONTROL" como acceso principal.

### 1. Panel de indicadores

Cinco tarjetas: reservas de **hoy**, de la **semana** (lunes a domingo), del **mes** (todas solo con estado `confirmada`), **canchas activas** (`activa == true`) y **usuarios registrados** (con cuántos están activos). Botón **Actualizar** que vuelve a consultar y sello "Actualizado a las HH:mm". Cada consulta es independiente (`Promise.allSettled`): si una falla, las demás tarjetas siguen mostrando su dato.

- Los contadores de canchas usan `getCountFromServer` (no descarga todos los documentos).
- Los cálculos viven en `js/reportes.js` (funciones puras reutilizables); la página solo pinta.

### 2. Ingresos por periodo

Selector **Hoy / Esta semana / Este mes / Rango personalizado** (dos fechas con validación desde ≤ hasta). Muestra el total en moneda colombiana (`Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })` → `$ 120.000`) y tabla de **desglose por cancha** (nombre, reservas confirmadas, ingresos) ordenada de mayor a menor, con fila TOTAL. Nota visible: *"Las reservas canceladas no se incluyen."* Estado vacío: *"No hay ingresos en este periodo."*

**Regla de ingresos:** solo suman las reservas `confirmada`; si `precio` no existe o no es número cuenta como 0; las `cancelada` nunca suman.

### 3. Reporte por rango (exportar e imprimir)

Formulario desde/hasta (obligatorios, desde ≤ hasta, máximo 366 días) → botón **GENERAR REPORTE**:
- **Resumen**: total, confirmadas, canceladas e ingresos.
- **Detalle**: fecha, hora inicio-fin, cancha, usuario (nombre + correo cruzando `usuarioId` con la colección `usuarios` cargada una sola vez en un mapa; si no existe → "Usuario no disponible"), precio y estado. Ordenado por fecha y hora.
- **Exportar CSV**: reutiliza `utils.exportarCSV` (BOM UTF-8 para Excel, escape de comillas, prefijo `'` anti-inyección de fórmulas). Archivo: `reporte-reservas_DESDE_a_HASTA.csv`, con las filas del resumen al inicio.
- **Imprimir**: `window.print()` + `@media print` en `styles.css` que oculta navbar, filtros y botones y deja solo título, rango, resumen y tabla.
- Rango sin reservas → mensaje **"No hay datos para ese periodo"** y botones de exportar/imprimir deshabilitados.

### ⏰ Zona horaria (decisión importante)

Las fechas de `reservas` son strings `"YYYY-MM-DD"` locales. En `utils.js` se añadieron `fechaAISO`, `sumarDiasISO`, `inicioSemanaISO`, `finSemanaISO`, `inicioMesISO` y `finMesISO`, construidos con `getFullYear/getMonth/getDate` en **hora local**. **No se usa `toISOString()`** porque convierte a UTC y en Colombia (UTC-5) devolvería el día equivocado: una reserva creada a las 11 p. m. contaría para el día siguiente. Semana definida de lunes a domingo.

Las consultas por rango usan `where('fecha','>=',desde)` + `where('fecha','<=',hasta)` sobre **un único campo** (los strings ISO son ordenable lexicográficamente) → **no requiere índice compuesto**. El estado se filtra en el cliente.

### 🔍 Pruebas manuales del Sprint #5

1. Crear reservas en distintas fechas (hoy, esta semana, este mes) y verificar que los tres contadores coinciden con lo esperado. ✔
2. Cancelar una reserva y comprobar que deja de contarse en los indicadores y en los ingresos. ✔
3. Verificar que "Canchas activas" excluye las canchas con `activa == false`. ✔
4. Ingresos de "Hoy", "Semana", "Mes" y rango personalizado coinciden con la suma manual de los precios de las reservas confirmadas. ✔
5. El desglose por cancha suma exactamente el total. ✔
6. Rango con "desde" posterior a "hasta" → muestra error de validación. ✔
7. Generar reporte con datos → el resumen coincide con el detalle; el CSV abre bien en Excel con acentos. ✔
8. Generar reporte de un rango sin reservas → mensaje "No hay datos para ese periodo" y botones deshabilitados. ✔
9. Imprimir → la vista de impresión muestra solo el reporte. ✔
10. Un usuario normal abre `admin-panel.html` o `admin-reportes.html` por URL → es redirigido. ✔
11. Reservar a las 11 p. m. y comprobar que cuenta para el día correcto (prueba del problema de zona horaria). ✔

## 🗺️ Roadmap

- ✅ Sprint #1: Gestión de usuarios
- ✅ Sprint #2: Gestión de canchas, roles y disponibilidad
- ✅ Sprint #3: Gestión de reservas: reservar, consultar y cancelar
- ✅ Sprint #4: Administración de reservas y gestión de usuarios (panel de admin)
- ✅ Sprint #5: Panel de control y reportes (indicadores, ingresos, CSV e impresión)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
