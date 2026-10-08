# SportCourt 🏀🎾⚽

Plataforma para reserva y gestión de canchas deportivas.

> Proyecto en fase inicial de organización. Aquí se documentará el stack final,
> funcionalidades y arquitectura una vez definamos el alcance del desarrollo.

## Estructura del repositorio

```
SportCourt/
├── backend/                # API del servidor (Python · FastAPI)
│   ├── app/
│   │   ├── api/v1/         # Enrutador versionado de la API
│   │   ├── core/           # Configuración, seguridad, CORS
│   │   ├── db/             # Conexión a BD, sesiones, migraciones
│   │   ├── endpoints/      # Endpoints de la API
│   │   ├── middleware/     # Middlewares personalizados
│   │   ├── models/         # Modelos ORM (tablas)
│   │   ├── schemas/        # Esquemas Pydantic (validación I/O)
│   │   ├── services/       # Lógica de negocio
│   │   ├── tests/          # Pruebas unitarias e integración
│   │   └── utils/          # Funciones auxiliares
│   ├── requirements.txt    # Dependencias de producción
│   ├── requirements-dev.txt# Dependencias de desarrollo
│   └── .env.example        # Variables de entorno de ejemplo
│
├── frontend/               # Aplicación web (React + Vite + TypeScript)
│   ├── src/
│   │   ├── app/            # Composición/inicialización de la app
│   │   ├── assets/         # Imágenes, iconos, fuentes
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── ui/         # Botones, inputs, cards...
│   │   │   ├── layout/     # Navbar, Sidebar, Footer...
│   │   │   └── common/     # Componentes transversales
│   │   ├── context/        # Proveedores de contexto global
│   │   ├── features/       # Módulos por funcionalidad
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── pages/          # Vistas/rutas de la aplicación
│   │   ├── services/       # Clientes HTTP hacia la API
│   │   ├── styles/         # CSS globales / temas
│   │   ├── types/          # Tipos e interfaces TS
│   │   └── utils/          # Helpers puros
│   ├── public/             # Estáticos servidos tal cual
│   └── index.html
│
├── docs/                   # ⚠️ Build estático publicado en GitHub Pages
│                           #    (SOLO index.html + assets/ + .nojekyll; NO
│                           #    guardar aquí documentación .md, o Jekyll/Pages
│                           #    la renderizará como la página del sitio)
├── scripts/                # Scripts utilitarios (setup, deploy, CI)
├── .github/workflows/      # Integración continua (si aplica)
└── docker-compose.yml      # Servicios compartidos (BD, etc.)
```

## Convenciones de carpetas

- **Separación total** entre `backend/` y `frontend/`: cada uno gestiona sus
  propias dependencias, linteo, tests y variables de entorno.
- **Comunicación** entre ambos lados únicamente a través de la API REST
  versionada (`/api/v1`).
- **Nada de código cruzado**: no importar módulos del backend en el frontend
  ni viceversa.

## Cómo empezar

### Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
# Docs interactivas: http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

## Publicación en GitHub Pages ✅

La web está publicada desde la rama `main` usando la carpeta `docs/` como origen
(Settings → Pages → Branch: `main` / folder: `/docs`). Hay dos formas de actualizarla:

**1. Automática (recomendada):** el workflow `.github/workflows/deploy.yml`
compila el frontend y publica el sitio en cada push a `main`. Requiere tener
habilitado *Pages → Source: GitHub Actions*.

**2. Manual:** compilar y copiar el resultado a `docs/`:

```bash
cd frontend
npm run build:gh-pages   # genera dist-ghpages/index.html AUTOCONTENIDO (un solo archivo)
cp dist-ghpages/index.html ../docs/index.html
touch ../docs/.nojekyll
git add docs && git commit -m "chore: update GitHub Pages build"
```

Notas:
- El build de Pages usa el plugin `vite-plugin-singlefile`: TODO el JS y CSS queda
  incrustado dentro de `docs/index.html` (un único archivo, sin carpeta `assets/`).
  Esto es necesario porque los navegadores BLOQUEAN los scripts módulo externos
  cuando se abre un archivo con `file://`; así, al descargar la carpeta y hacer
  doble clic en `index.html`, la página se ve y funciona sin servidor local.
- ⚠️ La carpeta `docs/` es la raíz pública del sitio: debe contener ÚNICAMENTE
  `index.html` y `.nojekyll`. Si hay archivos `.md` ahí, GitHub Pages los
  renderiza como página (por eso antes se veía el README en lugar de la app).
  La documentación va en `docs.md` en la raíz o en `documentation/`.
- Se usa `HashRouter`, por lo que las rutas funcionan aunque se abra el
  `index.html` directamente desde el disco (`file://`) o desde Pages sin
  configuración SPA extra.
- El diseño es RESPONSIVE: se adapta a móvil (≤640px), tablet (641–900px),
  escritorio (≥1200px) y pantallas ultra-anchas (≥1600px), con tipografías y
  espaciados fluidos (`clamp()`), cuadrículas autoajustables y menú envolvedor.
- La API no está desplegada públicamente; si más adelante se despliega el
  backend, definir la variable repo `VITE_API_URL` (p. ej.
  `https://mi-backend.onrender.com`) en Settings → Secrets and variables →
  Actions antes de compilar. Sin ella, la web funciona en modo demostración.

## Estado actual

- [x] Estructura de carpetas organizada
- [x] Backend mínimo funcional (health check en `/api/v1/health`)
- [x] Frontend mínimo (plantilla React + TS con proxy a la API)
- [ ] Definir modelo de datos (canchas, reservas, usuarios...)
- [ ] Definir stack definitivo y base de datos
- [ ] Primeras funcionalidades

---
*_Documento vivo: se actualizará conforme avance el desarrollo._*
