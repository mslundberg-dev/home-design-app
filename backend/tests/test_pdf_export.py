"""Integration tests for the PDF export endpoint."""

import pytest


def test_export_pdf_returns_pdf(client, db):
    """Creating a project + floor then exporting should return a PDF."""
    proj = client.post("/api/projects", json={"name": "Test House"}).json()
    floor = client.post(
        f"/api/projects/{proj['id']}/floors",
        json={"name": "Ground Floor", "floor_index": 0},
    ).json()

    # Save some geometry first
    geometry = {
        "schema_version": 1,
        "north_angle_degrees": 0,
        "rooms": [
            {
                "id": "r1",
                "name": "Living Room",
                "vertices": [
                    {"x": 0, "y": 0},
                    {"x": 120, "y": 0},
                    {"x": 120, "y": 144},
                    {"x": 0, "y": 144},
                ],
                "wall_thickness_default": 6,
                "edges": [
                    {
                        "id": "e1",
                        "start_vertex_index": 0,
                        "end_vertex_index": 1,
                        "thickness": 6,
                        "wall_type": "exterior",
                        "openings": [
                            {
                                "id": "o1",
                                "type": "door",
                                "offset_along_edge": 42,
                                "width": 36,
                                "height": 80,
                                "swing_direction": "left",
                            }
                        ],
                    },
                    {
                        "id": "e2",
                        "start_vertex_index": 1,
                        "end_vertex_index": 2,
                        "thickness": 6,
                        "wall_type": "exterior",
                        "openings": [
                            {
                                "id": "o2",
                                "type": "window",
                                "offset_along_edge": 24,
                                "width": 36,
                                "height": 48,
                                "swing_direction": None,
                            }
                        ],
                    },
                    {
                        "id": "e3",
                        "start_vertex_index": 2,
                        "end_vertex_index": 3,
                        "thickness": 6,
                        "wall_type": "exterior",
                        "openings": [],
                    },
                    {
                        "id": "e4",
                        "start_vertex_index": 3,
                        "end_vertex_index": 0,
                        "thickness": 6,
                        "wall_type": "exterior",
                        "openings": [],
                    },
                ],
            }
        ],
        "walls": [
            {
                "id": "w1",
                "start": {"x": 60, "y": 0},
                "end": {"x": 60, "y": 144},
                "thickness": 4.5,
                "wall_type": "interior",
                "openings": [],
            }
        ],
    }
    client.put(f"/api/floors/{floor['id']}/geometry", json=geometry)

    res = client.post(f"/api/floors/{floor['id']}/export-pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    # PDF magic bytes
    assert res.content[:4] == b"%PDF"
    # Non-trivial size (compressed vector PDF, at least 1 KB)
    assert len(res.content) > 1_000


def test_export_pdf_404_for_missing_floor(client, db):
    res = client.post("/api/floors/99999/export-pdf")
    assert res.status_code == 404


def test_export_pdf_empty_geometry(client, db):
    """Export should succeed even with no rooms or walls drawn."""
    proj = client.post("/api/projects", json={"name": "Empty"}).json()
    floor = client.post(
        f"/api/projects/{proj['id']}/floors",
        json={"name": "Level 1", "floor_index": 0},
    ).json()

    res = client.post(f"/api/floors/{floor['id']}/export-pdf")
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
