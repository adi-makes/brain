import json
import threading
import urllib.error
import urllib.request

from second_brain.worker.main import WorkerState, health_body, serve_health
from second_brain.worker.surface import schedule_status


def test_surface_schedule_does_not_calculate_eligibility() -> None:
    status = schedule_status()
    assert status["function"] == "public.reconcile_auto_surface_all"
    assert status["database_connected"] is False
    assert status["interval_seconds"] == 300


def test_health_body_reports_shutdown() -> None:
    state = WorkerState()
    assert health_body(state, "/health")[0] == 200
    assert health_body(state, "/ready")[0] == 200
    state.request_shutdown()
    assert health_body(state, "/ready")[0] == 503
    assert health_body(state, "/health")[0] == 200
    assert health_body(state, "/jobs")[0] == 404


def test_health_server_and_shutdown_wait() -> None:
    state = WorkerState()
    server = serve_health(state, "127.0.0.1", 0)
    port = server.server_address[1]
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/ready") as response:
            body = json.loads(response.read().decode("utf-8"))
        assert body["status"] == "ready"

        waiter = threading.Thread(target=state.stop_event.wait, kwargs={"timeout": 2})
        waiter.start()
        state.request_shutdown()
        waiter.join(timeout=1)
        assert not waiter.is_alive()

        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/ready")
            raise AssertionError("ready should fail after shutdown")
        except urllib.error.HTTPError as exc:
            assert exc.code == 503
    finally:
        server.shutdown()
        server.server_close()
