"""Pruebas de la historia de usuario: registro, login, logout, perfil y recuperación."""
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"
RECOVERY_URL = "/api/v1/auth/password-recovery"
RESET_URL = "/api/v1/auth/password-reset"

VALID_USER = {
    "full_name": "Ana Pérez",
    "email": "ana@example.com",
    "phone": "+57 300 1234567",
    "password": "clave1234",
}


def _register(client, **overrides):
    payload = {**VALID_USER, **overrides}
    return client.post(REGISTER_URL, json=payload)


class TestRegistrarUsuario:
    def test_registro_exitoso(self, client):
        """Escenario: Registro exitoso de un nuevo usuario."""
        resp = _register(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "ana@example.com"
        assert data["full_name"] == "Ana Pérez"
        assert "hashed_password" not in data and "password" not in data

    def test_correo_duplicado(self, client):
        _register(client)
        resp = _register(client)
        assert resp.status_code == 409
        assert "ya está registrado" in resp.json()["detail"]

    def test_contraseña_debil(self, client):
        resp = _register(client, password="sinnumeros")
        assert resp.status_code == 422

    def test_email_invalido(self, client):
        resp = _register(client, email="no-es-email")
        assert resp.status_code == 422


class TestIniciarSesion:
    def test_login_exitoso(self, client):
        """Escenario: Inicio de sesión exitoso."""
        _register(client)
        resp = client.post(LOGIN_URL, json={"email": "ana@example.com", "password": "clave1234"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["token_type"] == "bearer"
        assert data["access_token"]
        assert data["user"]["email"] == "ana@example.com"

    def test_credenciales_incorrectas(self, client):
        """Escenario: Inicio de sesión incorrecto -> mensaje de credenciales no válidas."""
        _register(client)
        resp = client.post(LOGIN_URL, json={"email": "ana@example.com", "password": "MALA"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Las credenciales no son válidas"

    def test_usuario_inexistente(self, client):
        resp = client.post(LOGIN_URL, json={"email": "nadie@example.com", "password": "x1234567"})
        assert resp.status_code == 401


class TestCerrarSesion:
    def test_logout_con_sesion_activa(self, client):
        """Escenario: Cierre de sesión exitoso."""
        _register(client)
        token = client.post(LOGIN_URL, json={
            "email": "ana@example.com", "password": "clave1234"
        }).json()["access_token"]
        resp = client.post(LOGOUT_URL, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "Sesión cerrada" in resp.json()["message"]

    def test_logout_sin_token(self, client):
        resp = client.post(LOGOUT_URL)
        assert resp.status_code == 401


class TestPerfil:
    def _auth(self, client) -> dict:
        _register(client)
        token = client.post(LOGIN_URL, json={
            "email": "ana@example.com", "password": "clave1234"
        }).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_obtener_perfil(self, client):
        headers = self._auth(client)
        resp = client.get(ME_URL, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "ana@example.com"

    def test_editar_perfil(self, client):
        headers = self._auth(client)
        resp = client.put(ME_URL, json={"full_name": "Ana P. Gómez", "phone": "300999"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Ana P. Gómez"

    def test_perfil_requiere_autenticacion(self, client):
        assert client.get(ME_URL).status_code == 401


class TestRecuperarContraseña:
    def test_recuperacion_completa(self, client):
        """Escenario: Recuperación de contraseña con correo registrado."""
        _register(client)
        # 1. Solicitar recuperación
        resp = client.post(RECOVERY_URL, json={"email": "ana@example.com"})
        assert resp.status_code == 200
        reset_token = resp.json()["debug_reset_token"]

        # 2. Establecer nueva contraseña
        resp = client.post(RESET_URL, json={"token": reset_token, "new_password": "nueva1234"})
        assert resp.status_code == 200

        # 3. La contraseña antigua ya no funciona
        resp = client.post(LOGIN_URL, json={"email": "ana@example.com", "password": "clave1234"})
        assert resp.status_code == 401

        # 4. La nueva contraseña sí funciona
        resp = client.post(LOGIN_URL, json={"email": "ana@example.com", "password": "nueva1234"})
        assert resp.status_code == 200

    def test_correo_no_registrado_no_revela_info(self, client):
        resp = client.post(RECOVERY_URL, json={"email": "desconocido@example.com"})
        assert resp.status_code == 200
        assert "debug_reset_token" not in resp.json()

    def test_token_invalido(self, client):
        resp = client.post(RESET_URL, json={"token": "basura", "new_password": "nueva1234"})
        assert resp.status_code == 400
