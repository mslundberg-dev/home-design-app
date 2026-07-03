from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


# ---- Geometry contract (stored verbatim in Floor.geometry JSONB) ----


class Point(BaseModel):
    x: float
    y: float


class Opening(BaseModel):
    id: str
    type: Literal["door", "window"]
    offset_along_edge: float
    width: float
    height: float
    swing_direction: Literal["left", "right"] | None = None


class Edge(BaseModel):
    id: str
    start_vertex_index: int
    end_vertex_index: int
    thickness: float = 6.0
    wall_type: Literal["exterior", "interior"] = "interior"
    openings: list[Opening] = []


class Room(BaseModel):
    id: str
    name: str
    vertices: list[Point]
    wall_thickness_default: float = 6.0
    edges: list[Edge] = []


class Wall(BaseModel):
    """Freestanding wall segment — not part of a closed room polygon."""

    id: str
    start: Point
    end: Point
    thickness: float = 4.5
    wall_type: Literal["exterior", "interior"] = "interior"
    openings: list[Opening] = []


class FloorGeometry(BaseModel):
    schema_version: int = 1
    north_angle_degrees: float = 0.0
    rooms: list[Room] = []
    walls: list[Wall] = []


# ---- Project ----


class ProjectCreate(BaseModel):
    name: str
    address: str | None = None
    units_preference: Literal["imperial", "metric"] = "imperial"


class ProjectUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    units_preference: Literal["imperial", "metric"] | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str | None
    units_preference: str
    created_at: datetime
    updated_at: datetime


# ---- Floor ----


class FloorCreate(BaseModel):
    name: str
    floor_index: int = 0


class FloorUpdate(BaseModel):
    name: str | None = None
    floor_index: int | None = None


class FloorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    floor_index: int
    elevation_inches: float
    geometry: FloorGeometry
    created_at: datetime
    updated_at: datetime
