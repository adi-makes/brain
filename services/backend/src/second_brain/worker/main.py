from __future__ import annotations

import logging
import signal
import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from second_brain.logging import configure_logging
from second_brain.settings import get_settings
from second_brain.worker.surface import schedule_status

logger = logging.getLogger("second_brain.worker")


@dataclass
class WorkerState:
    stopping: bool = False
    stop_event: threading.Event = field(default_factory=threading.Event)

    def request_shutdown(self) -> None:
        self.stopping = True
        self.stop_event.set()


def health_body(state: WorkerState, path: str) -> tuple[int, bytes]:
    if path not in {"/health", "/ready"}:
        return 404, b'{"status":"not_found","service":"worker"}'
    if path == "/ready" and state.stopping:
        return 503, b'{"status":"not_ready","service":"worker"}'
    if path == "/ready":
        return 200, b'{"status":"ready","service":"worker"}'
    return 200, b'{"status":"ok","service":"worker"}'


def make_handler(state: WorkerState) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            status, body = health_body(state, self.path.split("?", 1)[0])
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            logger.info("worker_http %s", self.path)

    return Handler


def serve_health(state: WorkerState, host: str, port: int) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), make_handler(state))
    thread = threading.Thread(target=server.serve_forever, name="worker-health", daemon=True)
    thread.start()
    return server


def install_signal_handlers(state: WorkerState) -> None:
    def handle(signum: int, _frame: object) -> None:
        logger.info("worker_signal signal=%s", signum)
        state.request_shutdown()

    signal.signal(signal.SIGTERM, handle)
    signal.signal(signal.SIGINT, handle)


def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    state = WorkerState()
    install_signal_handlers(state)
    server = serve_health(state, settings.backend_host, settings.worker_health_port)
    logger.info("worker_starting port=%s", settings.worker_health_port)
    logger.info("surface_reconciliation %s", schedule_status())
    try:
        state.stop_event.wait()
    finally:
        state.stopping = True
        logger.info("worker_stopping")
        server.shutdown()
        server.server_close()
        logger.info("worker_stopped")
