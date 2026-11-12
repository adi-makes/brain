FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.12.15 /uv /uvx /bin/

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin app
WORKDIR /app

COPY services/backend/pyproject.toml services/backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY services/backend/src ./src
RUN uv sync --frozen --no-dev \
    && chown -R app:app /app

USER app
ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "second_brain.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
