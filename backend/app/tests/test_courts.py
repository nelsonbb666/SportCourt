"""Pruebas de la historia de usuario: gestión de canchas."""
from datetime import date, timedelta

SPORTS_URL = "/api/v1/courts/sports"
COURTS_URL = "/api/v1/courts"
ADMIN_EMAIL = "admin@sportcourt.com"
ADMIN_PASSWORD = "Admin1234"

VALID_COURT = {
    "name": "Cancha Central",
    "sport_id": 1,
    "location": "Calle 45 #12-34",
    "price_per_hour": 35000.0,
    "capacity": 12,
    "description": "Césped sintético",
}


def _register_and_login(client, email):
    """Usuario normal (no admin)."""
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Usuario Uno", "email": email, "password": "clave1234"},
    )
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "clave1234"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _admin_headers(client):
    """El administrador seed se crea automáticamente al arrancar la API."""
    resp = client.post(
        "/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


class TestCatalogoCanchas:
    def test_deportes_seed(self, client):
        """Al iniciar el sistema existen los deportes base."""
        resp = client.get(SPORTS_URL)
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert "Fútbol" in names and "Baloncesto" in names

    def test_lista_vacia_al_principio(self, client):
        resp = client.get(COURTS_URL)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_crear_cancha_como_admin(self, client):
        resp = client.post(COURTS_URL, json=VALID_COURT, headers=_admin_headers(client))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Cancha Central"
        assert data["is_available"] is True
        assert data["sport"]["name"] == "Fútbol"

    def test_crear_cancha_sin_token(self, client):
        resp = client.post(COURTS_URL, json=VALID_COURT)
        assert resp.status_code == 401

    def test_crear_cancha_no_admin_prohibido(self, client):
        _admin_headers(client)  # asegura que exista el admin
        resp = client.post(
            COURTS_URL,
            json=VALID_COURT,
            headers=_register_and_login(client, "otro@test.com"),
        )
        assert resp.status_code == 403

    def test_nombre_duplicado(self, client):
        h = _admin_headers(client)
        assert client.post(COURTS_URL, json=VALID_COURT, headers=h).status_code == 201
        resp = client.post(COURTS_URL, json=VALID_COURT, headers=h)
        assert resp.status_code == 409

    def test_deporte_inexistente(self, client):
        resp = client.post(
            COURTS_URL,
            json={**VALID_COURT, "sport_id": 999},
            headers=_admin_headers(client),
        )
        assert resp.status_code == 422

    def test_detalle_y_404(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        assert client.get(f"{COURTS_URL}/{court_id}").json()["id"] == court_id
        assert client.get(f"{COURTS_URL}/9999").status_code == 404

    def test_actualizar_cancha(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(
            f"{COURTS_URL}/{court_id}",
            json={"price_per_hour": 42000.0, "is_available": False},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["price_per_hour"] == 42000.0
        assert resp.json()["is_available"] is False

    def test_eliminar_cancha(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        assert client.delete(f"{COURTS_URL}/{court_id}", headers=h).status_code == 204
        assert client.get(f"{COURTS_URL}/{court_id}").status_code == 404

    def test_filtros_lista(self, client):
        h = _admin_headers(client)
        client.post(COURTS_URL, json=VALID_COURT, headers=h)
        client.post(
            COURTS_URL,
            json={**VALID_COURT, "name": "Micro Norte", "sport_id": 5},
            headers=h,
        )
        assert len(client.get(COURTS_URL).json()) == 2
        assert len(client.get(COURTS_URL, params={"sport_id": 5}).json()) == 1
        assert len(client.get(COURTS_URL, params={"search": "Central"}).json()) == 1

    def test_disponibilidad_bloques_horarios(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        resp = client.get(f"{COURTS_URL}/{court_id}/availability", params={"day": tomorrow})
        assert resp.status_code == 200
        slots = resp.json()["slots"]
        assert len(slots) == 16  # 6:00 a 22:00 en bloques de 1 hora
        assert all(s["available"] for s in slots)
