from fastapi import APIRouter

from second_brain import __version__

router = APIRouter(prefix="/api/v1", tags=["v1"])


@router.get("")
def version() -> dict[str, str]:
    return {
        "version": "v1",
        "service": "backend",
        "app_version": __version__,
        "status": "foundation",
    }
