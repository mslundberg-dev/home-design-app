"""
Integration tests for /api/projects CRUD endpoints.

Requires postgres — run inside the Docker container:
    docker compose exec backend pytest tests/test_api_projects.py
"""


def test_list_projects_empty(client):
    r = client.get("/api/projects")
    assert r.status_code == 200
    assert r.json() == []


def test_create_project_minimal(client):
    r = client.post("/api/projects", json={"name": "Kitchen Reno"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Kitchen Reno"
    assert data["address"] is None
    assert data["units_preference"] == "imperial"
    assert "id" in data
    assert "created_at" in data


def test_create_project_with_address(client):
    r = client.post(
        "/api/projects",
        json={"name": "Basement", "address": "123 Main St", "units_preference": "metric"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["address"] == "123 Main St"
    assert data["units_preference"] == "metric"


def test_list_projects_returns_created(client):
    client.post("/api/projects", json={"name": "A"})
    client.post("/api/projects", json={"name": "B"})
    r = client.get("/api/projects")
    assert r.status_code == 200
    names = [p["name"] for p in r.json()]
    assert "A" in names
    assert "B" in names


def test_get_project(client):
    created = client.post("/api/projects", json={"name": "Office"}).json()
    r = client.get(f"/api/projects/{created['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "Office"


def test_get_project_not_found(client):
    r = client.get("/api/projects/999999")
    assert r.status_code == 404


def test_update_project_name(client):
    created = client.post("/api/projects", json={"name": "Old Name"}).json()
    r = client.patch(f"/api/projects/{created['id']}", json={"name": "New Name"})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


def test_update_project_partial(client):
    created = client.post(
        "/api/projects",
        json={"name": "Test", "address": "456 Oak Ave"},
    ).json()
    # Only update the name; address should remain unchanged
    r = client.patch(f"/api/projects/{created['id']}", json={"name": "Updated"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Updated"
    assert body["address"] == "456 Oak Ave"


def test_update_project_not_found(client):
    r = client.patch("/api/projects/999999", json={"name": "X"})
    assert r.status_code == 404


def test_delete_project(client):
    created = client.post("/api/projects", json={"name": "Temp"}).json()
    r = client.delete(f"/api/projects/{created['id']}")
    assert r.status_code == 204
    # Confirm it's gone
    assert client.get(f"/api/projects/{created['id']}").status_code == 404


def test_delete_project_not_found(client):
    r = client.delete("/api/projects/999999")
    assert r.status_code == 404


def test_delete_project_removed_from_list(client):
    created = client.post("/api/projects", json={"name": "Gone"}).json()
    client.delete(f"/api/projects/{created['id']}")
    names = [p["name"] for p in client.get("/api/projects").json()]
    assert "Gone" not in names
