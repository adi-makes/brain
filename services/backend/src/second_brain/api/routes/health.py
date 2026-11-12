from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}


@router.get("/ready")
def ready(request: Request) -> JSONResponse:
    if getattr(request.app.state, "ready", False):
        return JSONResponse({"status": "ready", "service": "backend"})
    return JSONResponse(
        {"status": "not_ready", "service": "backend"},
        status_code=503,
    )
