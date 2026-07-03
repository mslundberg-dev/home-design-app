import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Floor, Project
from app.pdf.draw_geometry import render_floor_pdf
from app.schemas import FloorGeometry

router = APIRouter(tags=["export"])


@router.post("/floors/{floor_id}/export-pdf")
def export_floor_pdf(floor_id: int, db: Session = Depends(get_db)):
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(404, "Floor not found")

    project = db.get(Project, floor.project_id)
    project_name = project.name if project else "Untitled Project"

    geometry = FloorGeometry.model_validate(floor.geometry)
    buf = io.BytesIO()
    render_floor_pdf(buf, geometry, project_name, floor.name)
    buf.seek(0)

    filename = f"{project_name} - {floor.name}.pdf".replace("/", "-")
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
