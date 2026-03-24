# UNGUEALHEALTH — Prototype monorepo

Structure:

- `frontend/` — static frontend (HTML/JS/CSS)
- `backend/` — PHP API (minimal prototype)
- `ia/` — Python FastAPI inference stub
- `docs/` — project documentation (BLOC A/B/C created)

Quick start (dev):

1. Start services with Docker Compose:

```bash
docker-compose up --build
```

2. Frontend: http://localhost:3000
3. Backend API: http://localhost:8000 (endpoints under /api)
4. IA: http://localhost:8001/predict
