"""Configuración central de la aplicación (se lee desde variables de entorno)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SportCourt API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        # GitHub Pages (reemplaza <usuario> si cambias de cuenta)
        "https://nelsonbb666.github.io",
    ]

    # Base de datos (SQLite por defecto para desarrollo; cambiar a PostgreSQL en producción)
    DATABASE_URL: str = "sqlite:///./sportcourt.db"

    # Seguridad / JWT
    SECRET_KEY: str = "dev-secret-key-cambia-esto-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
