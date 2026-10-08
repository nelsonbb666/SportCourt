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

