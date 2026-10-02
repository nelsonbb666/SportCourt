"""Pruebas de la historia de usuario: reserva de canchas."""
from datetime import date, timedelta

COURTS_URL = "/api/v1/courts"
RESERVATIONS_URL = "/api/v1/reservations"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"


ADMIN_EMAIL = "admin@sportcourt.com"
ADMIN_PASSWORD = "Admin1234"


def _login(client, email, password="clave1234"):
    if email == "admin":
        email = ADMIN_EMAIL
        password = ADMIN_PASSWORD
    else:
        client.post(
            REGISTER_URL,
            json={"full_name": "Reservador", "email": email, "password": password},
        )
    resp = client.post(LOGIN_URL, json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _tomorrow() -> str:
    return (date.today() + timedelta(days=1)).isoformat()


def _court_id(client, headers):
    payload = {
        "name": "Cancha Test",
        "sport_id": 1,
        "location": "Cra 10 #20-30",
        "price_per_hour": 30000.0,
        "capacity": 10,
    }
    resp = client.post(COURTS_URL, json=payload, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


class TestReservaCanchas:
    def test_reserva_exitosa(self, client):
        """Escenario: el usuario selecciona cancha, día y hora → reserva confirmada."""
        h = _login(client, "admin")  # id=1 admin
        court_id = _court_id(client, h)
        user_h = _login(client, "usuario@test.com")
        resp = client.post(
            RESERVATIONS_URL,
            json={
                "court_id": court_id,
                "date": _tomorrow(),
                "start_time": "10:00",
                "end_time": "12:00",
            },
            headers=user_h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "confirmed"
        assert data["total_price"] == 60000.0  # 2h × 30000
        assert data["court"]["name"] == "Cancha Test"

    def test_reserva_requiere_autenticacion(self, client):
        resp = client.post(
            RESERVATIONS_URL,
            json={"court_id": 1, "date": _tomorrow(), "start_time": "10:00", "end_time": "11:00"},
        )
        assert resp.status_code == 401

    def test_franja_choca_con_otra_reserva(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u1 = _login(client, "uno@test.com")
        u2 = _login(client, "dos@test.com")
        body = {"court_id": court_id, "date": _tomorrow(), "start_time": "10:00", "end_time": "12:00"}
        assert client.post(RESERVATIONS_URL, json=body, headers=u1).status_code == 201
        # solapada 11:00–13:00
        resp = client.post(
            RESERVATIONS_URL,
            json={**body, "start_time": "11:00", "end_time": "13:00"},
            headers=u2,
        )
        assert resp.status_code == 409
        assert "ya está reservada" in resp.json()["detail"]

    def test_no_se_puede_reservar_pasado(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        resp = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": yesterday, "start_time": "10:00", "end_time": "11:00"},
            headers=h,
        )
        assert resp.status_code == 422

    def test_horario_fuera_de_operacion(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        resp = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "23:00", "end_time": "24:00"},
            headers=h,
        )
        # 24:00 no es hora válida; y aunque lo fuera está fuera de operación
        assert resp.status_code == 422

    def test_fin_menor_que_inicio(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        resp = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "15:00", "end_time": "14:00"},
            headers=h,
        )
        assert resp.status_code == 422

    def test_cancha_no_disponible(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        client.put(f"{COURTS_URL}/{court_id}", json={"is_available": False}, headers=h)
        resp = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "10:00", "end_time": "11:00"},
            headers=h,
        )
        assert resp.status_code == 404

    def test_mis_reservas(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u = _login(client, "cliente@test.com")
        client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "08:00", "end_time": "09:00"},
            headers=u,
        )
        mine = client.get(f"{RESERVATIONS_URL}/me", headers=u).json()
        assert len(mine) == 1
        # otro usuario no ve sus reservas
        other = _login(client, "otro@test.com")
        assert client.get(f"{RESERVATIONS_URL}/me", headers=other).json() == []

    def test_modificar_reserva(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u = _login(client, "editor@test.com")
        res = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "08:00", "end_time": "09:00"},
            headers=u,
        ).json()
        resp = client.put(
            f"{RESERVATIONS_URL}/{res['id']}",
            json={"start_time": "14:00", "end_time": "16:00"},
            headers=u,
        )
        assert resp.status_code == 200
        assert resp.json()["total_price"] == 60000.0

    def test_cancelar_reserva(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u = _login(client, "cancelador@test.com")
        res = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "09:00", "end_time": "10:00"},
            headers=u,
        ).json()
        resp = client.delete(f"{RESERVATIONS_URL}/{res['id']}", headers=u)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
        # segunda cancelación → 400
        assert client.delete(f"{RESERVATIONS_URL}/{res['id']}", headers=u).status_code == 400
        # la franja vuelve a quedar libre para otro usuario
        other = _login(client, "posterior@test.com")
        resp2 = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "09:00", "end_time": "10:00"},
            headers=other,
        )
        assert resp2.status_code == 201

    def test_no_se_ven_reservas_ajenas(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u1 = _login(client, "dueno@test.com")
        res = client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "07:00", "end_time": "08:00"},
            headers=u1,
        ).json()
        u2 = _login(client, "espión@test.com")
        assert client.get(f"{RESERVATIONS_URL}/{res['id']}", headers=u2).status_code == 404
        assert client.delete(f"{RESERVATIONS_URL}/{res['id']}", headers=u2).status_code == 404

    def test_disponibilidad_refleja_reservas(self, client):
        h = _login(client, "admin")
        court_id = _court_id(client, h)
        u = _login(client, "slot@test.com")
        client.post(
            RESERVATIONS_URL,
            json={"court_id": court_id, "date": _tomorrow(), "start_time": "10:00", "end_time": "12:00"},
            headers=u,
        )
        slots = client.get(
            f"{COURTS_URL}/{court_id}/availability", params={"day": _tomorrow()}
        ).json()["slots"]
        occupied = [s for s in slots if not s["available"]]
        assert len(occupied) == 2  # 10-11 y 11-12
