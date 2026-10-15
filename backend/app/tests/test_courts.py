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


class TestModificarCanchaHistoriaUsuario:
    """Criterios de aceptación (Gherkin) de la historia 'Modificar la información
    de una cancha'.

    Escenario: Modificación exitosa de una cancha.
    Dado que soy administrador,
    y existe una cancha registrada,
    cuando selecciono una cancha y elijo la opción "MODIFICAR",
    entonces el sistema muestra la información actual de la cancha,
    y puedo modificar sus datos,
    y al guardar, el sistema actualiza la información correctamente.
    """

    def test_escenario_completo_modificacion_exitosa(self, client):
        # DADO: soy administrador y existe una cancha registrada
        headers = _admin_headers(client)
        created = client.post(COURTS_URL, json=VALID_COURT, headers=headers).json()
        court_id = created["id"]

        # CUANDO/ENTONCES: al seleccionar la cancha para MODIFICAR, el sistema
        # muestra la información actual (detalle con todos los campos)
        detail = client.get(f"{COURTS_URL}/{court_id}")
        assert detail.status_code == 200
        shown = detail.json()
        assert shown["name"] == "Cancha Central"
        assert shown["location"] == "Calle 45 #12-34"
        assert shown["price_per_hour"] == 35000.0
        assert shown["capacity"] == 12
        assert shown["sport"]["name"] == "Fútbol"

        # Y PUEDO MODIFICAR SUS DATOS / AL GUARDAR el sistema actualiza
        modified = {
            "name": "Cancha Central Renovada",
            "location": "Carrera 50 #10-20",
            "price_per_hour": 40000.0,
            "capacity": 14,
            "description": "Césped sintético renovado 2026",
            "is_available": True,
        }
        resp = client.put(f"{COURTS_URL}/{court_id}", json=modified, headers=headers)
        assert resp.status_code == 200
        updated = resp.json()
        for key, value in modified.items():
            assert updated[key] == value
        assert updated["id"] == court_id

        # La información modificada persiste (se vuelve a consultar)
        refetched = client.get(f"{COURTS_URL}/{court_id}").json()
        assert refetched["name"] == "Cancha Central Renovada"
        assert refetched["price_per_hour"] == 40000.0

        # Y la cancha modificada sigue apareciendo en el listado con sus nuevos datos
        listing = client.get(COURTS_URL).json()
        match = [c for c in listing if c["id"] == court_id]
        assert len(match) == 1
        assert match[0]["name"] == "Cancha Central Renovada"

    def test_modificar_parcialmente(self, client):
        """MODIFICAR permite cambiar solo algunos campos; los demás se conservan."""
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(f"{COURTS_URL}/{court_id}",
                          json={"price_per_hour": 45000.0}, headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert data["price_per_hour"] == 45000.0
        assert data["name"] == VALID_COURT["name"]  # intacto
        assert data["location"] == VALID_COURT["location"]  # intacto

    def test_marcar_no_disponible(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(f"{COURTS_URL}/{court_id}",
                          json={"is_available": False}, headers=h)
        assert resp.status_code == 200
        assert resp.json()["is_available"] is False

    def test_modificar_sin_token_no_permitido(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(f"{COURTS_URL}/{court_id}", json={"name": "Otra"})
        assert resp.status_code == 401

    def test_modificar_no_admin_prohibido(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(
            f"{COURTS_URL}/{court_id}",
            json={"name": "Otra"},
            headers=_register_and_login(client, "intruso@test.com"),
        )
        assert resp.status_code == 403

    def test_modificar_cancha_inexistente(self, client):
        resp = client.put(f"{COURTS_URL}/9999", json={"name": "Fantasma"},
                          headers=_admin_headers(client))
        assert resp.status_code == 404

    def test_modificar_a_nombre_duplicado_rechazado(self, client):
        h = _admin_headers(client)
        client.post(COURTS_URL, json=VALID_COURT, headers=h)
        other = client.post(
            COURTS_URL,
            json={**VALID_COURT, "name": "Micro Norte", "sport_id": 5},
            headers=h,
        ).json()
        resp = client.put(f"{COURTS_URL}/{other['id']}",
                          json={"name": "Cancha Central", "sport_id": 1}, headers=h)
        assert resp.status_code == 409

    def test_modificar_a_deporte_inexistente(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.put(f"{COURTS_URL}/{court_id}", json={"sport_id": 999}, headers=h)
        assert resp.status_code == 422


class TestRegistrarCanchaHistoriaUsuario:
    """Criterios de aceptación (Gherkin) de la historia 'Registrar una cancha'.

    Escenario: Registro exitoso de una nueva cancha.
    Dado que soy administrador del sistema,
    cuando selecciono la opción "REGISTRAR CANCHA",
    entonces el sistema muestra un formulario para ingresar la información,
    y al guardar, el sistema registra la cancha,
    y la nueva cancha aparece en el listado de canchas.
    """

    def test_escenario_completo_registro_exitoso(self, client):
        # DADO: soy administrador del sistema (login con credenciales de admin)
        headers = _admin_headers(client)

        # CUANDO: guardo el formulario de "REGISTRAR CANCHA" con la información
        resp = client.post(
            COURTS_URL,
            json={
                "name": "Cancha La Esperanza",
                "sport_id": 2,
                "location": "Av. 68 #30-15",
                "price_per_hour": 28000.0,
                "capacity": 10,
                "description": "Cancha techada de baloncesto",
            },
            headers=headers,
        )

        # ENTONCES: el sistema registra la cancha
        assert resp.status_code == 201
        created = resp.json()
        assert created["name"] == "Cancha La Esperanza"
        assert created["sport"]["name"] == "Baloncesto"
        assert created["is_available"] is True

        # Y: la nueva cancha aparece en el listado de canchas
        listing = client.get(COURTS_URL).json()
        assert any(c["id"] == created["id"] for c in listing)
        # y también buscándola por nombre
        search = client.get(COURTS_URL, params={"search": "Esperanza"}).json()
        assert len(search) == 1 and search[0]["id"] == created["id"]

    def test_admin_autoproclamado_al_iniciar_sesion(self, client, db_session):
        """El seed puede crear al admin sin rol; el login con credenciales
        administrativas le asigna el rol automáticamente (se usa el admin
        semilla estándar sobre la base en memoria de las pruebas)."""
        from app.models.user import User

        # simular base antigua sin rol sobre la sesión en memoria de la prueba
        raw = db_session.get(User, 1)
        assert raw is not None and raw.email == ADMIN_EMAIL
        raw.is_admin = False
        db_session.commit()

        # el login con credenciales de administrador autoproclama el rol
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@sportcourt.com", "password": "Admin1234"},
        )
        assert resp.status_code == 200
        assert resp.json()["user"]["is_admin"] is True


class TestEliminarCanchaHistoriaUsuario:
    """Criterios de aceptación (Gherkin) de la historia 'Eliminar una cancha'.

    Escenario: Eliminación exitosa de una cancha.
    Dado que soy administrador,
    y existe una cancha registrada,
    cuando selecciono la cancha y elijo la opción "ELIMINAR",
    entonces el sistema solicita confirmar la eliminación,
    y al confirmar, el sistema elimina la cancha,
    y la cancha deja de aparecer en el listado.
    """

    def test_escenario_completo_eliminacion_exitosa(self, client):
        # DADO: soy administrador y existe una cancha registrada
        headers = _admin_headers(client)
        created = client.post(COURTS_URL, json=VALID_COURT, headers=headers).json()
        court_id = created["id"]
        assert any(c["id"] == court_id for c in client.get(COURTS_URL).json())

        # CUANDO/ENTONCES: el admin confirma la eliminación (el frontend muestra
        # un diálogo de confirmación; al confirmar se envía DELETE /courts/{id})
        resp = client.delete(f"{COURTS_URL}/{court_id}", headers=headers)
        assert resp.status_code == 204

        # Y: la cancha es eliminada del sistema (ya no existe)
        assert client.get(f"{COURTS_URL}/{court_id}").status_code == 404

        # Y: la cancha deja de aparecer en el listado
        listing = client.get(COURTS_URL).json()
        assert not any(c["id"] == court_id for c in listing)

    def test_confirmar_y_eliminar_deja_de_aparecer_en_busqueda(self, client):
        """Tras eliminar, la cancha tampoco aparece en búsquedas por nombre."""
        h = _admin_headers(client)
        created = client.post(
            COURTS_URL, json={**VALID_COURT, "name": "La Eliminada"}, headers=h
        ).json()
        assert client.delete(f"{COURTS_URL}/{created['id']}", headers=h).status_code == 204
        assert client.get(COURTS_URL, params={"search": "Eliminada"}).json() == []

    def test_eliminar_sin_token_no_permitido(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.delete(f"{COURTS_URL}/{court_id}")
        assert resp.status_code == 401
        # La cancha sigue existiendo (no se eliminó sin confirmación autorizada)
        assert client.get(f"{COURTS_URL}/{court_id}").status_code == 200

    def test_eliminar_no_admin_prohibido(self, client):
        h = _admin_headers(client)
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]
        resp = client.delete(
            f"{COURTS_URL}/{court_id}",
            headers=_register_and_login(client, "intruso_del@test.com"),
        )
        assert resp.status_code == 403
        assert client.get(f"{COURTS_URL}/{court_id}").status_code == 200

    def test_eliminar_cancha_inexistente(self, client):
        resp = client.delete(f"{COURTS_URL}/9999", headers=_admin_headers(client))
        assert resp.status_code == 404

    def test_no_se_puede_eliminar_con_reservas_futuras(self, client, db_session):
        """Protección: una cancha con reservas futuras confirmadas no se elimina."""
        from datetime import date, time, timedelta

        from app.models.reservation import Reservation

        h = _admin_headers(client)
        user_h = _register_and_login(client, "cliente_del@test.com")
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]

        manana = date.today() + timedelta(days=1)
        res = client.post(
            "/api/v1/reservations",
            json={
                "court_id": court_id,
                "date": manana.isoformat(),
                "start_time": time(8, 0).isoformat(),
                "end_time": time(9, 0).isoformat(),
            },
            headers=user_h,
        )
        assert res.status_code == 201

        resp = client.delete(f"{COURTS_URL}/{court_id}", headers=h)
        assert resp.status_code == 409
        assert "reservas" in resp.json()["detail"].lower()
        # La cancha sigue en el listado
        assert any(c["id"] == court_id for c in client.get(COURTS_URL).json())

    def test_si_se_puede_eliminar_con_reservas_pasadas(self, client, db_session):
        """Las reservas antiguas (pasadas/canceladas) no bloquean la eliminación."""
        from datetime import date, time, timedelta

        from app.models.reservation import Reservation

        h = _admin_headers(client)
        user_h = _register_and_login(client, "cliente_hist@test.com")
        court_id = client.post(COURTS_URL, json=VALID_COURT, headers=h).json()["id"]

        # crear cancha, reservar mañana, cancelar la reserva y luego eliminar
        res = client.post(
            "/api/v1/reservations",
            json={
                "court_id": court_id,
                "date": (date.today() + timedelta(days=1)).isoformat(),
                "start_time": time(10, 0).isoformat(),
                "end_time": time(11, 0).isoformat(),
            },
            headers=user_h,
        )
        assert res.status_code == 201
        rid = res.json()["id"]
        cancel = client.delete(f"/api/v1/reservations/{rid}", headers=user_h)
        assert cancel.status_code in (200, 204)

        resp = client.delete(f"{COURTS_URL}/{court_id}", headers=h)
        assert resp.status_code == 204
        assert client.get(f"{COURTS_URL}/{court_id}").status_code == 404
