from fastapi.testclient import TestClient

from second_brain.api.app import create_app
from second_brain.errors import AppError


def test_health_ready_and_version() -> None:
    with TestClient(create_app()) as client:
        health = client.get("/health")
        ready = client.get("/ready")
        version = client.get("/api/v1")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "service": "backend"}
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert version.json()["status"] == "foundation"
    assert version.json()["version"] == "v1"


def test_not_found_is_structured() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/missing", headers={"x-request-id": "req-1"})
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["correlation_id"] == "req-1"
    assert response.headers["x-request-id"] == "req-1"


def test_validation_and_app_errors_are_structured() -> None:
    app = create_app()

    @app.get("/api/v1/limit")
    def limit(value: int) -> dict[str, int]:
        return {"value": value}

    @app.get("/api/v1/boom")
    def boom() -> None:
        raise AppError("example", "Nope", 409)

    with TestClient(app) as client:
        invalid = client.get("/api/v1/limit")
        conflict = client.get("/api/v1/boom")
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "example"


def test_unhandled_error_hides_details() -> None:
    app = create_app()

    @app.get("/api/v1/crash")
    def crash() -> None:
        raise RuntimeError("disk path /secret")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/crash")
    assert response.status_code == 500
    assert response.json()["error"]["message"] == "Internal error"
    assert "secret" not in response.text
