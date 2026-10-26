# Pull Request — Sprint #3: Gestión de Reservas

**Rama:** `feature/sprint-3-gestion-reservas` → `develop`

## Resumen

Cierra el flujo principal del sistema: cualquier usuario con sesión puede **reservar un
horario disponible**, **consultar sus reservas** y **cancelarlas**, volviendo el horario a
estado disponible. La creación de reservas usa un **ID de documento determinista**
(`canchaId_fecha_horaInicio`) dentro de una **transacción de Firestore**, por lo que es
imposible que dos usuarios reserven el mismo horario simultáneamente. Las reglas de
seguridad (`firestore.rules`) se endurecieron para la colección `reservas`.

## Funcionalidades incluidas

### 1. Reservar una cancha (`pages/disponibilidad.html` + `js/reservas.js`)
- Botón **Reservar** activo en cada bloque disponible (ocupados y pasados siguen sin ser seleccionables).
- Modal propio de **resumen de confirmación**: cancha, tipo, ubicación, fecha, horario y precio (sin `confirm()`).
- Validaciones previas: cancha existe y está `activa`, fecha/hora no pasada, horario dentro de apertura–cierre, y el usuario no tiene otra reserva confirmada a la misma fecha/hora en cualquier cancha.
- Escritura con `runTransaction()`: si el doc existe `confirmada` → aborta con *"Este horario ya fue reservado"*; si no existe o está `cancelada` → escribe/sobrescribe como `confirmada`.
- Éxito: mensaje **"Reserva confirmada"**, bloque pasa a **Ocupado** sin recargar, enlace *Ver mis reservas →*.
- Si el horario fue tomado por otro: mensaje claro + refresco de bloques. Botón deshabilitado mientras procesa (anti doble clic).

### 2. Consultar mis reservas (`pages/mis-reservas.html`)
- Página protegida con sesión; opción **"Mis reservas"** en navbar y accesos rápidos en dashboard (*CONSULTAR MIS RESERVAS*, *RESERVAR HORARIO*).
- Solo reservas del usuario autenticado (`where('usuarioId','==',uid)`), con cancha (nombre/tipo/ubicación), fecha legible en español ("viernes, 20 de junio de 2025"), horario, precio y estado.
- Pestañas **Próximas / Pasadas / Canceladas**; próximas ordenadas de la más cercana a la más lejana (orden en cliente → sin índices compuestos).
- Estado vacío "Aún no tienes reservas" con botón *CONSULTAR CANCHA*; indicador de carga y manejo de errores.

### 3. Cancelar mis reservas
- Botón **CANCELAR** solo en reservas confirmadas futuras; modal *"¿Seguro que deseas cancelar tu reserva de {cancha} el {fecha} a las {hora}?"*.
- Actualiza `estado="cancelada"` + `canceladaEn` (no borra el documento); la tarjeta se mueve a **Canceladas** sin recargar, con mensaje de éxito.
- El horario vuelve a aparecer **Disponible** en disponibilidad (verificado: `generarBloques()` solo cuenta reservas `confirmada`).
- Regla opcional configurable: `CONSTANTE.config.minHorasAnticipacionCancelacion` en `js/utils.js` (por defecto `0` = desactivada; documentada en README).

### Seguridad e infraestructura
- `firestore.rules`: create solo propia y `confirmada` con campos válidos; update = admin, dueño cancelando la suya, o reutilizar horario cancelado; delete solo admin; read autenticados (necesario para marcar ocupados). **Deben volver a publicarse.**
- README: sección Sprint #3 con modelo de datos, reglas (cómo publicarlas), índices (evitados mediante orden en cliente; cómo crearlos si aparecen), nota de privacidad con alternativa `ocupaciones`, y las 7+ pruebas manuales.
- UI: tema verde/blanco, responsive, estados con color **y** texto (Confirmada verde / Finalizada neutro / Cancelada gris-rojo), sin `alert`, todo el contenido dinámico se pinta con `textContent` (anti-XSS).

## Archivos modificados

```
pages/mis-reservas.html   (nuevo)
pages/disponibilidad.html (botón Reservar activo, textos actualizados)
pages/dashboard.html      (accesos rápidos a cancha y mis reservas)
js/reservas.js            (nuevo: crearReserva, cancelarReserva, listar/UI)
js/disponibilidad.js      (iniciarReserva, refrescarBloques, modal de resumen)
js/guard.js               (enlace "Mis reservas" en navbar)
js/utils.js               (CONSTANTE.config, fechaHoraEsPasada, minutosHasta, modal con resumen)
css/styles.css            (tarjetas de reserva, pestañas, badges de estado)
firestore.rules           (reglas de reservas del Sprint #3)
README.md                 (documentación completa del sprint)
```

## Cómo probar

> Requiere: `firestore.rules` publicadas, dos cuentas de usuario normal (**A** y **B**) y una cancha activa.

1. A reserva un horario futuro → modal de resumen → *Reserva confirmada* → bloque pasa a Ocupado.
2. B (ventana incógnito) intenta el mismo horario → aparece Ocupado; forzar la transacción devuelve *"Este horario ya fue reservado"*.
3. A cancela desde *Mis reservas* → modal de confirmación → pasa a Canceladas → el horario vuelve a estar Disponible.
4. B reserva ese horario → funciona y **reutiliza el mismo documento** (un solo doc en Firebase Console).
5. A intenta reservar dos canchas a la misma hora → bloqueado con mensaje claro.
6. En *Mis reservas* de B no aparece ninguna reserva de A.
7. Horarios pasados (hoy) y fechas pasadas → no reservables.

## Checklist de criterios de aceptación

- [x] Reservo un horario disponible, veo "Reserva confirmada" y queda ocupado sin recargar
- [x] "CONSULTAR MIS RESERVAS" muestra solo mis reservas con cancha/fecha/hora/precio/estado
- [x] "CANCELAR" pide confirmación, cancela (estado + canceladaEn) y libera el horario
- [x] Dos usuarios no pueden reservar el mismo horario (ID determinista + transacción)
- [x] Las reglas de Firestore protegen las reservas de otros usuarios
- [x] Sprints #1 y #2 intactos (registro/login/perfil, CRUD canchas, disponibilidad)
- [x] README documenta reglas, índices y pruebas manuales
- [x] Sin `alert`/`confirm`, botones deshabilitados al procesar, `textContent` para datos dinámicos
- [x] Tema verde/blanco y diseño responsive conservados

## Notas para el revisor

- ⚠️ Hay que **publicar `firestore.rules`** antes de probar la reserva desde clientes reales.
- No se requieren índices compuestos nuevos (el ordenamiento se hace en cliente).
- La lectura de `reservas` queda abierta a autenticados a propósito (marcar ocupados); ver nota de privacidad y alternativa `ocupaciones` en el README.
