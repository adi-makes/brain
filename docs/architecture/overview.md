# Architecture overview

Second Brain is a personal productivity workspace. The product remains useful without AI. Phase 00 only establishes the repository, processes, and safeguards.

```text
browser
  └── apps/frontend          Next.js App Router
        └── /api/health

services/backend             one Python package, one image
  ├── API process            FastAPI: /health, /ready, /api/v1
  └── worker process         idle process with its own health port

hosted Supabase              external; not started by Compose
planner                      one future Python implementation
packages/planner-contracts   contract notes only
packages/schemas             shared request/response validation
```

The frontend, API, and worker are separate processes. Compose health checks call each process's readiness URL. `depends_on` is not used. A container that has started is not treated as ready.

Hosted Supabase provides PostgreSQL, Auth, and Storage. The foundation schema, row-level security, and Next.js session handling are in place. Product writes, the planner, reminder delivery, and the assistant are not. Redis and Ollama are not required. Gemini is the future primary model provider and is not wired in.

The planner will live in the Python backend. The frontend will consume its API. `packages/planner-contracts` will hold the shared contract and will not host a second engine.

Root `.env` is the only local secret file. Next.js, Python, and Compose receive it from the root launcher or Compose's root env file. CI uses GitHub Actions variables and secrets.
