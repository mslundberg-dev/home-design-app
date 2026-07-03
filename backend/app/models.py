from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

DEFAULT_GEOMETRY = {
    "schema_version": 1,
    "north_angle_degrees": 0.0,
    "rooms": [],
    "walls": [],
}


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    address: Mapped[str | None]
    units_preference: Mapped[str] = mapped_column(default="imperial")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    floors: Mapped[list["Floor"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Floor.floor_index"
    )


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str]
    floor_index: Mapped[int] = mapped_column(default=0)
    # Placeholder for a future 3D floor-stacking feature — unused by v1 UI.
    elevation_inches: Mapped[float] = mapped_column(default=0.0)
    geometry: Mapped[dict] = mapped_column(JSONB, default=lambda: dict(DEFAULT_GEOMETRY))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="floors")
