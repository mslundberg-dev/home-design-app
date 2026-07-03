# Home Design App

A personal home renovation planning tool: draw rooms and walls to exact
real-world scale, place doors and windows with precise dimensions, and
export a labeled PDF floor plan accurate enough to hand to a contractor.

## Stack

- **Frontend**: React + Vite + TypeScript, `react-konva` for the 2D canvas
  editor, Zustand for state (port 5174 on host, mapped from container 5173)
- **Backend**: FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic (port 8001 on host)
- **DB**: PostgreSQL 16, geometry stored as JSONB per floor (port 5433 on host)
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

### Running tests

**Backend** (pure-unit + API integration — requires postgres, run inside Docker):
```
docker compose exec backend pytest
```

**Frontend** (pure-unit tests for math/store/formatting — no browser needed):
```
cd frontend && npm test
```
Or in watch mode during development: `npm run test:watch`

## Architecture

### Key decisions

- **Canvas**: `react-konva` (Konva.js) — mature React wrapper for precise 2D
  shape editing with per-shape hit-testing and dragging.
- **State**: Zustand, split into `floorStore` (geometry, undo/redo, dirty flag)
  and `uiStore` (ephemeral: active tool, zoom/pan, snap toggles). Drag
  interactions use `applyLive` (no undo history) per frame, with
  `beginCheckpoint`/`commitCheckpoint` to push one undo entry per completed
  gesture.
- **Units**: all lengths stored as float inches internally. Display values
  round to the nearest 1/16" to avoid floating-point artifacts in labels. UI
  will toggle imperial (ft'-in") vs metric.
- **Geometry**: a `Room` is a closed polygon of ordered vertices; each edge is
  a wall segment (thickness, type) that hosts `Opening`s (doors/windows) at an
  offset + width + height. Freestanding `Wall` segments handle interior
  partitions that don't enclose a room. Room area computed via the shoelace
  formula. This avoids needing a general planar-graph room-detection algorithm.
- **Storage**: two normalized Postgres tables — `projects` and `floors`. Each
  floor's full geometry (rooms + walls + openings) lives in one JSONB column.
  A `schema_version` int inside the JSON allows future data migrations without
  an Alembic schema change. No cross-wall SQL querying needed.
- **PDF export**: server-side `reportlab` renders directly from persisted JSONB
  — crisp vector output, not a screenshot. Includes title block, scale bar,
  north arrow, and dimension text.
- **Sync**: "Save" PUTs the whole geometry blob; no granular per-wall CRUD.
- **Styling**: plain CSS (no Tailwind) — the UI is canvas + toolbars, not
  enough chrome to justify the setup.

### Canvas coordinate system

`BASE_PIXELS_PER_INCH = 4` at zoom 1.0. All world coordinates are in inches.
`scale.ts` is the single source of truth for `worldToScreen` / `screenToWorld`
conversions. Zoom anchors around the cursor position using
`computeZoomAroundPoint`, which computes the pan offset needed to keep the
world point under the cursor stationary after a zoom change.

Snapping: grid snap (default 6" grid) and 15° angle snap are both implemented
in `snapping.ts` and applied during draw and drag. The Konva node is
explicitly repositioned to the snapped coordinate each drag frame via
`e.target.position(snappedScreen)` to prevent the circle from drifting from
the world point.

### Data model (FloorGeometry JSONB contract)

Defined in `backend/app/schemas.py` — source of truth for the shape of the
document stored in the `floors.geometry` column.

```
FloorGeometry
  schema_version: int          # bump when shape changes; migrate in Python, not Alembic
  north_angle_degrees: float
  rooms: [{
    id, name,
    vertices: [{x, y}],        # ordered polygon corners, inches from origin
    wall_thickness_default: float,
    edges: [{
      id,
      start_vertex_index, end_vertex_index,
      thickness: float,
      wall_type: "exterior" | "interior",
      openings: [Opening]
    }]
  }]
  walls: [{                    # freestanding interior partitions
    id, start: {x,y}, end: {x,y},
    thickness: float,
    wall_type: "exterior" | "interior",
    openings: [Opening]
  }]

Opening: {
  id,
  type: "door" | "window",
  offset_along_edge: float,    # inches from start vertex along edge
  width: float, height: float,
  swing_direction: "left" | "right" | null
}
```

`Floor` also carries `elevation_inches` (float, default 0) and `floor_index`
— unused by v1 UI but present so a future 3D floor-stacking feature requires
no schema migration.

### Folder structure

```
home-design-app/
├── docker-compose.yml              # db + backend + frontend, all 127.0.0.1-bound
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/           # table-shape migrations only, never geometry columns
│   ├── tests/
│   │   ├── test_geometry.py        # shoelace area / wall length unit tests
│   │   ├── test_floors.py          # save/load round-trip integration test
│   │   └── test_pdf_export.py
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, routers
│       ├── config.py               # pydantic-settings Settings
│       ├── database.py             # engine / session / Base
│       ├── models.py               # Project, Floor (JSONB geometry column)
│       ├── schemas.py              # FloorGeometry contract + all sub-types
│       ├── geometry.py             # pure functions: shoelace_area, edge_length
│       ├── routers/
│       │   ├── projects.py         # CRUD  /api/projects
│       │   ├── floors.py           # CRUD + PUT geometry  /api/floors
│       │   └── export.py           # POST /api/floors/{id}/export-pdf
│       └── pdf/
│           ├── layout.py           # page setup, title block, scale computation
│           ├── draw_geometry.py    # FloorGeometry → reportlab canvas + dimension lines
│           └── symbols.py          # north arrow, scale bar, door-swing arc, window glyph
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts              # dev proxy /api → backend:8000
    └── src/
        ├── App.tsx                 # routing: project list → detail → floor editor
        ├── api.ts                  # fetch wrappers for projects / floors / export
        ├── types.ts                # TS types mirroring backend schemas
        ├── pages/
        │   ├── ProjectListPage.tsx
        │   ├── ProjectDetailPage.tsx
        │   └── FloorEditorPage.tsx
        ├── canvas/
        │   ├── FloorCanvas.tsx     # Konva Stage/Layer, pan/zoom, tool event wiring
        │   ├── scale.ts            # pixels-per-inch ↔ world-inches (single source of truth)
        │   ├── snapping.ts         # grid snap + 15° angle snap math
        │   ├── fitView.ts          # computeFitZoomAndPan — auto-fit after room commit
        │   ├── geometry.ts         # client-side shoelace/edge-length for live labels
        │   ├── Grid.tsx
        │   ├── RoomShape.tsx       # room polygon + vertex/edge drag handles
        │   ├── WallShape.tsx       # freestanding wall segment
        │   ├── OpeningShape.tsx    # door swing arc / window double-line glyph
        │   ├── DimensionLabel.tsx  # white-backed label with ft'-in" text
        │   └── tools/
        │       ├── drawRoom.ts     # click-to-place-vertex + close-polygon logic
        │       ├── DrawWallTool.ts
        │       ├── PlaceOpeningTool.ts
        │       └── SelectTool.ts
        ├── store/
        │   ├── floorStore.ts       # rooms/walls/openings, undo/redo, dirty flag
        │   └── uiStore.ts          # activeTool, zoom/pan, snap toggles, unit display
        ├── units/
        │   └── format.ts           # inchesToFeetInches / inchesToCm + parsers
        └── components/
            ├── Toolbar.tsx         # tool buttons, snap toggles, undo/redo, zoom controls
            ├── UnitToggle.tsx
            ├── PropertiesPanel.tsx # typed exact-dimension input for selected element
            └── ExportButton.tsx
```

## Packages

**Backend**: `fastapi`, `sqlalchemy` (2.0 typed `Mapped` style), `alembic`,
`psycopg2-binary`, `pydantic` + `pydantic-settings`, `reportlab`, `pytest`,
`httpx`. No Celery, Redis, or JWT — not needed for a single local user.

**Frontend**: `react`, `react-dom`, `react-konva` + `konva`, `zustand`,
`react-router-dom`, `typescript`, `vite`. Client IDs via native
`crypto.randomUUID()`. Snapping math and PDF symbols are hand-written rather
than pulled from dependencies.

## Roadmap

v1 focuses on precise 2D floor plans and PDF export. 3D rendered visualization
is an intentional post-v1 phase — the data model (per-edge wall thickness,
`elevation_inches`, ordered polygon vertices) is designed so that adding a
three.js viewer later requires no schema change.

### Milestones

| # | Milestone | Scope | Status |
|---|---|---|---|
| M0 | Scaffold & boot | Repo skeleton, `docker compose up` → db + backend + frontend, Alembic migration for `projects`/`floors`, `/api/health` | ✅ Done |
| M1 | Draw & edit rooms | Konva canvas, `DrawRoomTool` (click vertices, close polygon), snap-to-grid + snap-to-15°, live dimension labels per edge + room area, `SelectTool` drag-to-move vertex and wall, undo/redo, zoom controls | ✅ Done |
| M2 | Doors/windows + freestanding walls | `DrawWallTool`, `PlaceOpeningTool` with typed width via `PropertiesPanel`, door-swing arc glyph, window double-line glyph, opening offset validation against host wall length | ⬜ Next |
| M3 | Persistence | `ProjectListPage` / `ProjectDetailPage`, editor loads geometry on mount, Save button PUTs whole geometry blob, dirty-flag warning on navigate-away | ⬜ Planned |
| M4 | PDF export | `export.py` + `pdf/` rendering: title block (name, date, scale), to-scale rooms/walls, dimension + area text, north arrow, scale bar | ⬜ Planned |

### Demo criteria

- **M0**: `docker compose up` succeeds; `curl localhost:8001/api/health` → 200;
  frontend loads and fetches health through Vite proxy.
- **M1**: Draw a 10 ft × 12 ft rectangle with snap on; edge labels read
  "10'-0"" / "12'-0""; center label reads "120 sq ft"; dragging a corner or
  wall segment updates labels live; undo/redo works per gesture.
- **M2**: Place a 3'-0" door on a wall at a specific offset; door swing arc
  renders at the correct position; draw a freestanding interior partition;
  opening offset + width validates against the host wall length.
- **M3**: Create project → floor → draw room → Save → refresh browser →
  exact geometry reloads.
- **M4**: Export the M1 10'×12' room; PDF is vector (no pixelation at zoom);
  printed dimensions match what was drawn; scale bar is accurate against a
  ruler at the stated scale.

### Post-v1 stretch

After M4: a design review confirming the schema (`elevation_inches`,
`floor_index`, per-edge thickness, ordered polygon vertices) is sufficient for
a future three.js viewer to extrude walls and stack floors — before writing
any 3D code.
