"""SportCourt API — punto de entrada FastAPI."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Desarrollo: crea las tablas que falten (producción: migraciones Alembic)
    init_db()
    # Crea el usuario administrador y los deportes base si no existen.
    from app.db.session import SessionLocal
    from app.services import court_service, user_service
    from app.schemas.user import UserCreate

    db = SessionLocal()
    try:
        court_service.ensure_default_sports(db)
        admin = user_service.get_user_by_email(db, "admin@sportcourt.com")
        if admin is None:
            admin = user_service.register_user(
                db,
                UserCreate(
                    full_name="Administrador SportCourt",
                    email="admin@sportcourt.com",
                    phone=None,
                    password="Admin1234",
                ),
            )
        if not admin.is_admin:
            admin.is_admin = True
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/v1/health", tags=["salud"])
def health_check() -> dict:
    """Verifica que la API esté operativa."""
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}
