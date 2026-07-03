# Home Design App

A personal home renovation planning tool: draw rooms and walls to exact
real-world scale, place doors and windows with precise dimensions, and
export a labeled PDF floor plan accurate enough to hand to a contractor.

## Stack

- **Frontend**: React + Vite + TypeScript, `react-konva` for the 2D canvas
  editor, Zustand for state (port 5174 on host, mapped from container 5173)
- **Backend**: FastAPI + SQLAlchemy + Alembic + Pydantic (port 8001 on host)
- **DB**: PostgreSQL, geometry stored as JSONB per floor (port 5433 on host)
- **PDF export**: `reportlab`, rendered server-side from persisted geometry

No authentication in v1 — this is a single-user, localhost-only tool. All
Docker ports are bound to `127.0.0.1`. If you ever need to reach this from
another device (e.g. your phone on the home network), put a reverse proxy
with HTTP Basic Auth in front rather than adding application-level auth.

## Development

```
docker compose up
```

- Frontend: http://localhost:5174
- Backend: http://localhost:8001 (health check: `/api/health`)
- Backend hot-reloads via `uvicorn --reload`.
- **Vite HMR does not work reliably in Docker on Windows** — if frontend
  changes don't show up, run `docker compose restart frontend`.

### Running migrations

```
docker compose exec backend alembic upgrade head
```

### Running backend tests

```
docker compose exec backend pytest
```

## Data model

Each `Floor` stores its entire geometry (rooms, freestanding walls, door/window
openings) as one JSONB document rather than normalizing every wall into its
own table. `Project` and `Floor` are the only normalized tables — see
`backend/app/schemas.py` for the `FloorGeometry` contract, which is the
source of truth for the shape of that document.

A `Room` is a closed polygon of vertices; each edge is a wall segment that
can host door/window `Opening`s. Freestanding `Wall` segments handle interior
partitions that don't enclose a room. All lengths are stored as float inches.

## Roadmap

v1 focuses on precise 2D floor plans and PDF export (see the milestone list
below). 3D rendered visualization of renovations is an intentional
post-v1 phase — the data model (per-edge wall thickness, floor elevation,
ordered polygon vertices) is designed so that doesn't require a schema
change later.

- [x] M0 — Scaffold & boot
- [x] M1 — Draw & edit rooms with snapping + live dimension/area labels
- [ ] M2 — Doors/windows + freestanding walls
- [ ] M3 — Persistence (save/load projects via the backend)
- [ ] M4 — PDF export
