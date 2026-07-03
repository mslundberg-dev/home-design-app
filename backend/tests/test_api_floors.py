"""
Integration tests for floor CRUD and geometry round-trip endpoints.

Requires postgres — run inside the Docker container:
    docker compose exec backend pytest tests/test_api_floors.py
"""

import pytest

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

GEOMETRY_10X12 = {
    "schema_version": 1,
    "north_angle_degrees": 0.0,
    "rooms": [
        {
            "id": "room-1",
            "name": "Living Room",
            "vertices": [
                {"x": 0, "y": 0},
                {"x": 120, "y": 0},
                {"x": 120, "y": 144},
                {"x": 0, "y": 144},
            ],
            "wall_thickness_default": 6.0,
            "edges": [
                {
                    "id": "edge-0",
                    "start_vertex_index": 0,
                    "end_vertex_index": 1,
                    "thickness": 6.0,
                    "wall_type": "exterior",
                    "openings": [],
                },
                {
                    "id": "edge-1",
                    "start_vertex_index": 1,
                    "end_vertex_index": 2,
                    "thickness": 6.0,
                    "wall_type": "exterior",
                    "openings": [],
                },
                {
                    "id": "edge-2",
                    "start_vertex_index": 2,
                    "end_vertex_index": 3,
                    "thickness": 6.0,
                    "wall_type": "exterior",
                    "openings": [],
                },
                {
                    "id": "edge-3",
                    "start_vertex_index": 3,
                    "end_vertex_index": 0,
                    "thickness": 6.0,
                    "wall_type": "exterior",
                    "openings": [],
                },
            ],
        }
    ],
    "walls": [],
}


@pytest.fixture()
def project(client):
    """A freshly-created project, returned as a dict."""
    return client.post("/api/projects", json={"name": "Test Project"}).json()


@pytest.fixture()
def floor(client, project):
    """A freshly-created floor on the test project."""
    return client.post(
        f"/api/projects/{project['id']}/floors",
        json={"name": "Ground Floor", "floor_index": 0},
    ).json()


# ---------------------------------------------------------------------------
# Floor list
# ---------------------------------------------------------------------------

def test_list_floors_empty(client, project):
    r = client.get(f"/api/projects/{project['id']}/floors")
    assert r.status_code == 200
    assert r.json() == []


def test_list_floors_unknown_project(client):
    r = client.get("/api/projects/999999/floors")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Floor create
# ---------------------------------------------------------------------------

def test_create_floor(client, project):
    r = client.post(
        f"/api/projects/{project['id']}/floors",
        json={"name": "Ground Floor", "floor_index": 0},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Ground Floor"
    assert data["floor_index"] == 0
    assert data["project_id"] == project["id"]
    # New floors get empty geometry with schema_version set
    assert data["geometry"]["schema_version"] == 1
    assert data["geometry"]["rooms"] == []
    assert data["geometry"]["walls"] == []


def test_create_floor_unknown_project(client):
    r = client.post(
        "/api/projects/999999/floors",
        json={"name": "Orphan Floor", "floor_index": 0},
    )
    assert r.status_code == 404


def test_create_multiple_floors_ordered(client, project):
    client.post(f"/api/projects/{project['id']}/floors", json={"name": "Ground", "floor_index": 0})
    client.post(f"/api/projects/{project['id']}/floors", json={"name": "Upper", "floor_index": 1})
    floors = client.get(f"/api/projects/{project['id']}/floors").json()
    assert len(floors) == 2
    assert floors[0]["floor_index"] == 0
    assert floors[1]["floor_index"] == 1


# ---------------------------------------------------------------------------
# Floor get
# ---------------------------------------------------------------------------

def test_get_floor(client, floor):
    r = client.get(f"/api/floors/{floor['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == floor["id"]


def test_get_floor_not_found(client):
    r = client.get("/api/floors/999999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Floor update (metadata)
# ---------------------------------------------------------------------------

def test_update_floor_name(client, floor):
    r = client.patch(f"/api/floors/{floor['id']}", json={"name": "Renamed Floor"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed Floor"


def test_update_floor_not_found(client):
    r = client.patch("/api/floors/999999", json={"name": "X"})
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Geometry save + round-trip (the core PUT /geometry endpoint)
# ---------------------------------------------------------------------------

def test_save_floor_geometry(client, floor):
    r = client.put(f"/api/floors/{floor['id']}/geometry", json=GEOMETRY_10X12)
    assert r.status_code == 200
    saved = r.json()["geometry"]
    assert saved["schema_version"] == 1
    assert len(saved["rooms"]) == 1
    assert saved["rooms"][0]["name"] == "Living Room"
    assert len(saved["rooms"][0]["vertices"]) == 4


def test_geometry_round_trip(client, floor):
    """PUT then GET must return byte-for-byte equivalent geometry."""
    client.put(f"/api/floors/{floor['id']}/geometry", json=GEOMETRY_10X12)
    reloaded = client.get(f"/api/floors/{floor['id']}").json()["geometry"]
    assert reloaded["rooms"][0]["vertices"] == GEOMETRY_10X12["rooms"][0]["vertices"]
    assert reloaded["rooms"][0]["edges"][0]["wall_type"] == "exterior"


def test_geometry_round_trip_with_freestanding_wall(client, floor):
    geometry = {
        **GEOMETRY_10X12,
        "walls": [
            {
                "id": "wall-1",
                "start": {"x": 30, "y": 0},
                "end": {"x": 30, "y": 144},
                "thickness": 4.5,
                "wall_type": "interior",
                "openings": [],
            }
        ],
    }
    client.put(f"/api/floors/{floor['id']}/geometry", json=geometry)
    reloaded = client.get(f"/api/floors/{floor['id']}").json()["geometry"]
    assert len(reloaded["walls"]) == 1
    assert reloaded["walls"][0]["thickness"] == 4.5


def test_save_geometry_not_found(client):
    r = client.put("/api/floors/999999/geometry", json=GEOMETRY_10X12)
    assert r.status_code == 404


def test_geometry_overwrite(client, floor):
    """Saving geometry twice must replace the previous version, not append."""
    client.put(f"/api/floors/{floor['id']}/geometry", json=GEOMETRY_10X12)
    empty = {"schema_version": 1, "north_angle_degrees": 0.0, "rooms": [], "walls": []}
    client.put(f"/api/floors/{floor['id']}/geometry", json=empty)
    reloaded = client.get(f"/api/floors/{floor['id']}").json()["geometry"]
    assert reloaded["rooms"] == []


# ---------------------------------------------------------------------------
# Floor delete
# ---------------------------------------------------------------------------

def test_delete_floor(client, floor):
    r = client.delete(f"/api/floors/{floor['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/floors/{floor['id']}").status_code == 404


def test_delete_floor_not_found(client):
    r = client.delete("/api/floors/999999")
    assert r.status_code == 404


def test_delete_project_cascades_floors(client, project, floor):
    """Deleting a project must also delete its floors (FK cascade)."""
    client.delete(f"/api/projects/{project['id']}")
    assert client.get(f"/api/floors/{floor['id']}").status_code == 404
