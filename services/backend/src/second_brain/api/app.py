from __future__ import annotations

import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from second_brain import __version__
from second_brain.api.routes.health import router as health_router
from second_brain.api.routes.v1 import router as v1_router
from second_brain.errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from second_brain.logging import configure_logging, correlation_id_var
from second_brain.settings import get_settings

logger = logging.getLogger("second_brain.api")
SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming = request.headers.get("x-request-id", "")
        correlation_id = incoming if SAFE_REQUEST_ID.fullmatch(incoming) else uuid4().hex
        token = correlation_id_var.set(correlation_id)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)
        response.headers["x-request-id"] = correlation_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.ready = False
    logger.info("api_starting")
    app.state.ready = True
    try:
        yield
    finally:
        app.state.ready = False
        logger.info("api_stopping")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Second Brain API",
        version=__version__,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["authorization", "content-type", "x-request-id"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
    app.include_router(health_router)
    app.include_router(v1_router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "second_brain.api.app:app",
        host=settings.backend_host,
        port=settings.backend_port,
        log_level=settings.log_level.lower(),
    )
