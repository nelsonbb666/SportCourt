"""Consolidado de routers de la API v1."""
from fastapi import APIRouter

from app.api.v1.endpoints import courts, reservations, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router)
api_router.include_router(courts.router)
api_router.include_router(reservations.router)
