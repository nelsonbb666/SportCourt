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
├── docs/                   # Documentación del proyecto
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

## Estado actual

- [x] Estructura de carpetas organizada
- [x] Backend mínimo funcional (health check en `/api/v1/health`)
- [x] Frontend mínimo (plantilla React + TS con proxy a la API)
- [ ] Definir modelo de datos (canchas, reservas, usuarios...)
- [ ] Definir stack definitivo y base de datos
- [ ] Primeras funcionalidades

---
*_Documento vivo: se actualizará conforme avance el desarrollo._*
