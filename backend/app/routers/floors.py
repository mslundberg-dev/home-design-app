from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DEFAULT_GEOMETRY, Floor, Project
from app.schemas import FloorCreate, FloorGeometry, FloorRead, FloorUpdate

router = APIRouter(tags=["floors"])


@router.get("/projects/{project_id}/floors", response_model=list[FloorRead])
def list_floors(project_id: int, db: Session = Depends(get_db)):
    if db.get(Project, project_id) is None:
        raise HTTPException(404, "Project not found")
    return db.query(Floor).filter(Floor.project_id == project_id).order_by(Floor.floor_index).all()


@router.post("/projects/{project_id}/floors", response_model=FloorRead, status_code=201)
def create_floor(project_id: int, payload: FloorCreate, db: Session = Depends(get_db)):
    if db.get(Project, project_id) is None:
        raise HTTPException(404, "Project not found")
    floor = Floor(project_id=project_id, geometry=dict(DEFAULT_GEOMETRY), **payload.model_dump())
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return floor


@router.get("/floors/{floor_id}", response_model=FloorRead)
def get_floor(floor_id: int, db: Session = Depends(get_db)):
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(404, "Floor not found")
    return floor


@router.patch("/floors/{floor_id}", response_model=FloorRead)
def update_floor(floor_id: int, payload: FloorUpdate, db: Session = Depends(get_db)):
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(404, "Floor not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(floor, field, value)
    db.commit()
    db.refresh(floor)
    return floor


@router.put("/floors/{floor_id}/geometry", response_model=FloorRead)
def save_floor_geometry(floor_id: int, payload: FloorGeometry, db: Session = Depends(get_db)):
    """Whole-document save — the canvas holds the full geometry client-side
    and PUTs it here in one shot rather than granular per-wall CRUD calls."""
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(404, "Floor not found")
    floor.geometry = payload.model_dump()
    db.commit()
    db.refresh(floor)
    return floor


@router.delete("/floors/{floor_id}", status_code=204)
def delete_floor(floor_id: int, db: Session = Depends(get_db)):
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(404, "Floor not found")
    db.delete(floor)
    db.commit()
