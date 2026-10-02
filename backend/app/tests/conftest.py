"""Fixtures y configuración de pruebas del backend."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app

# Base de datos en memoria aislada para pruebas
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db_session():
    # Importar todos los modelos para que create_all cree todas las tablas
    import app.models  # noqa: F401
    from app.services import court_service, user_service
    from app.schemas.user import UserCreate

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Seed equivalente al arranque de la API (deportes + admin),
        # usando la sesión en memoria de las pruebas.
        court_service.ensure_default_sports(session)
        if user_service.get_user_by_email(session, "admin@sportcourt.com") is None:
            admin = user_service.register_user(
                session,
                UserCreate(
                    full_name="Administrador SportCourt",
                    email="admin@sportcourt.com",
                    phone=None,
                    password="Admin1234",
                ),
            )
            admin.is_admin = True
            session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    # with_block deshabilitado: el lifespan real usaría la BD de desarrollo;
    # el seed se hace en la fixture db_session sobre la BD en memoria.
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()
