# Pull Request — Sprint #2: Gestión de Canchas

**Rama:** `feature/sprint-2-gestion-canchas` → `develop`
**Proyecto:** Sistema de reservas de canchas deportivas

---

## 📝 Resumen

Segundo sprint del sistema de reservas. Se añade la **gestión de canchas** (CRUD completo para administradores), la **consulta de disponibilidad por fecha** para todos los usuarios con sesión activa, y el **sistema de roles** (`usuario` / `admin`) que servirá de base para el Sprint #3 (reserva de canchas). El modelo de datos de la colección `reservas` queda definido y ya se lee para calcular horarios ocupados; el Sprint #3 solo tendrá que escribir en él.

Todo el código del Sprint #1 (registro, login, logout, perfil y recuperación de contraseña) sigue funcionando sin cambios funcionales.

## ✨ Funcionalidades incluidas

### Roles (cambio previo necesario)
- Campo `rol` en el documento de `usuarios`: `"usuario"` por defecto al registrarse.
- `guard.js`: nueva función `esAdmin()` (lee el rol desde Firestore con caché en memoria) y `protegerAdmin()` que redirige al dashboard con mensaje si un usuario normal intenta acceder a una página de administrador (incluso por URL directa).
- La navbar muestra "REGISTRAR CANCHA" solo a administradores.
- Para crear un admin: cambiar manualmente `rol` a `"admin"` en la consola de Firebase (documentado en el README).

### 1. Consultar cancha ✅
- `pages/canchas.html` (sesión obligatoria): tarjetas en grid responsive con **nombre, tipo, ubicación**, horario de atención y precio si existe.
- Filtro por tipo y búsqueda por nombre.
- Estado vacío ("Aún no hay canchas registradas") e indicador de carga.
- Botón "Ver disponibilidad" en todas las tarjetas; "MODIFICAR" y "ELIMINAR" solo para admin.

### 2. Consultar disponibilidad ✅
- `pages/disponibilidad.html?cancha=<id>`: selector de cancha + campo de fecha (no permite fechas pasadas).
- Genera bloques de **1 hora** entre `horaApertura` y `horaCierre`; consulta `reservas` con estado `confirmada` y marca los bloques ocupados.
- Diferenciación visual: disponibles en verde, ocupados en gris/rojo, con leyenda; los ocupados no son seleccionables.
- Si la fecha es hoy, los bloques que ya pasaron aparecen como no disponibles.
- Conteo tipo "6 horarios disponibles de 14".
- Botón "Reservar" deshabilitado con aviso **"Disponible en el próximo sprint"**.
- Lógica reutilizable en `js/disponibilidad.js`: `generarBloques(cancha, fecha, reservas)`.

### 3. Registrar cancha (admin) ✅
- `pages/admin-cancha-form.html`: nombre, tipo (select), ubicación, descripción, precio por hora, hora de apertura/cierre y activa.
- Validaciones: obligatorios, cierre > apertura, precio ≥ 0, **nombre no duplicado** (consulta previa + regla de uniqueness lógica).
- Guarda en `canchas` con `creadaEn`/`actualizadaEn` (timestamp), muestra éxito y la cancha aparece en el listado.

### 4. Modificar cancha (admin) ✅
- El mismo formulario reutilizado con `?id=`: carga los datos actuales, mismas validaciones (excluyendo su propio nombre en la comprobación de duplicados) y actualiza `actualizadaEn` con `set(merge)`; regreso al listado con los cambios aplicados.

### 5. Eliminar cancha (admin) ✅
- **Modal de confirmación propio** (no `confirm()` del navegador) mostrando el nombre de la cancha.
- Antes de eliminar, verifica reservas futuras confirmadas y muestra **advertencia** que bloquea la eliminación hasta que el admin confirme explícitamente cancelar/desactivar la cancha.
- Al confirmar, elimina el documento y la tarjeta desaparece **sin recargar la página** (listener en tiempo real sobre la colección).

### Seguridad
- `firestore.rules` actualizadas con funciones `estaAutenticado()` / `esAdmin()`:
  - `usuarios`: cada usuario solo lee/escribe su documento y **no puede cambiarse el rol** a sí mismo.
  - `canchas`: lectura para cualquier autenticado; escritura/borrado solo admin.
  - `reservas`: lectura autenticada; creación solo con `usuarioId == uid`; actualización/borrado por dueño o admin.
- Ocultar botones **no es seguridad**: la protección real son las reglas (explicado en el README junto con los pasos para publicarlas).
- Escape de contenido dinámico con `textContent` (prevención de XSS).

## 🧪 Cómo probar

1. Configura Firebase según el README (Auth + Firestore) y pega `firebaseConfig` en `js/firebase-config.js`. Publica `firestore.rules`.
2. Carga 3 canchas de prueba (script `assets/cargar-datos-ejemplo.js` o manualmente, instrucciones en el README).
3. **Usuario normal:** regístralo, inicia sesión → "CONSULTAR CANCHA", filtra/busca, abre disponibilidad, elige cancha y fecha → verifica bloques verdes/grises y el conteo. Intenta abrir `admin-cancha-form.html` por URL → debe redirigir al dashboard con mensaje. No debe ver "REGISTRAR CANCHA", "MODIFICAR" ni "ELIMINAR".
4. **Admin:** en la consola de Firebase cambia `rol` de tu usuario a `"admin"`, recarga → registra una cancha (prueba cierre < apertura y nombre duplicado), modifícala, elimínala (modal + advertencia de reservas futuras).
5. **Regresión Sprint #1:** registro, login/logout, edición de perfil y recuperación de contraseña deben seguir funcionando.
6. Sirve en local con Live Server o `python -m http.server` y verifica el diseño responsive.

## ✅ Checklist de criterios de aceptación

- [x] Con sesión, "CONSULTAR CANCHA" muestra las canchas con nombre, tipo y ubicación
- [x] Al elegir cancha y fecha veo horarios y distingo disponibles de ocupados (leyenda + conteo)
- [x] Fechas pasadas bloqueadas; bloques ya transcurridos de hoy marcados como no disponibles
- [x] Como admin registro una cancha y aparece en el listado
- [x] Como admin modifico una cancha, veo los datos actuales y los cambios se guardan
- [x] Como admin elimino una cancha tras confirmar (modal propio) y desaparece del listado sin recargar
- [x] Advertencia si la cancha tiene reservas futuras confirmadas
- [x] Un usuario normal no ve ni puede usar las acciones de administrador (ni por URL ni por reglas de Firestore)
- [x] Lo del Sprint #1 sigue funcionando
- [x] Botones deshabilitados mientras se procesa; mensajes en español, sin `alert`
- [x] Contenido dinámico escapado (XSS)
- [x] El README explica cómo crear un admin, cargar datos de ejemplo y publicar las reglas
- [ ] Merge a `develop` tras revisión

## 🗂️ Archivos nuevos / modificados

| Archivo | Cambio |
|---|---|
| `pages/canchas.html` | Nuevo: listado + filtros |
| `pages/disponibilidad.html` | Nuevo: horarios por cancha y fecha |
| `pages/admin-cancha-form.html` | Nuevo: registrar/modificar |
| `js/canchas.js` | Nuevo: CRUD y listado en tiempo real |
| `js/disponibilidad.js` | Nuevo: `generarBloques()` y consulta de reservas |
| `js/guard.js` | `esAdmin()`, `protegerAdmin()`, navbar condicional |
| `js/auth.js` | Guarda `rol: "usuario"` al registrarse |
| `js/utils.js` | Modal de confirmación reutilizable y helpers de fecha/hora |
| `css/styles.css` | Tarjetas, filtros, modal, bloques de horario |
| `firestore.rules` | Reglas para `usuarios` (rol), `canchas` y `reservas` |
| `README.md` | Sección del Sprint 2: roles, admin manual, datos de ejemplo, publicación de reglas |

## Commit history

```
feat(roles): rol de usuario y protección de páginas de administrador
feat(canchas): consultar listado de canchas
feat(disponibilidad): consulta de horarios por cancha y fecha
chore(firestore): reglas de seguridad para canchas y reservas
feat(canchas): eliminar cancha con modal de confirmación y advertencia de reservas futuras
docs: README del sprint 2 (roles, CRUD de canchas, disponibilidad y reglas)
```

*(Registrar y modificar cancha se incluyen en el commit del formulario `admin-cancha-form.html`, reutilizado para ambas operaciones.)*
