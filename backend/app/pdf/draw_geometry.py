"""Render FloorGeometry onto a reportlab Canvas at the chosen scale."""

from __future__ import annotations

import math
from datetime import date

from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas

from app.pdf.layout import (
    DRAW_H, DRAW_W, DRAW_X, DRAW_Y,
    MARGIN, PAGE_H, PAGE_W, TITLE_H,
    choose_scale,
)
from app.pdf.symbols import (
    draw_door_arc, draw_north_arrow, draw_scale_bar, draw_window_glyph,
)
from app.schemas import FloorGeometry


def _feet_inches_label(inches: float) -> str:
    """Format an inch measurement as ft'-in" for dimension labels."""
    total = round(inches * 16) / 16  # round to nearest 1/16"
    ft = int(total // 12)
    rem = total - ft * 12
    if rem == 0:
        return f"{ft}'-0\""
    # Format fractional part
    whole = int(rem)
    frac = rem - whole
    if frac < 0.01:
        inch_str = f"{whole}\""
    else:
        # Express as fraction
        numer = round(frac * 16)
        denom = 16
        from math import gcd
        g = gcd(numer, denom)
        inch_str = f"{whole} {numer//g}/{denom//g}\""
    return f"{ft}'-{inch_str}"


class GeometryRenderer:
    def __init__(
        self,
        c: Canvas,
        geometry: FloorGeometry,
        project_name: str,
        floor_name: str,
    ) -> None:
        self.c = c
        self.g = geometry
        self.project_name = project_name
        self.floor_name = floor_name

        # Compute world bounding box
        all_pts = [
            pt
            for room in geometry.rooms
            for pt in room.vertices
        ] + [
            wall.start for wall in geometry.walls
        ] + [
            wall.end for wall in geometry.walls
        ]

        if not all_pts:
            self.world_min = (0.0, 0.0)
            self.world_max = (120.0, 120.0)
        else:
            xs = [p.x for p in all_pts]
            ys = [p.y for p in all_pts]
            self.world_min = (min(xs), min(ys))
            self.world_max = (max(xs), max(ys))

        world_w = max(self.world_max[0] - self.world_min[0], 12.0)
        world_h = max(self.world_max[1] - self.world_min[1], 12.0)
        self.scale_denom, self.scale_label = choose_scale(world_w, world_h)

        # Center the drawing in the available area
        draw_w_pts = (world_w / self.scale_denom) * inch
        draw_h_pts = (world_h / self.scale_denom) * inch
        self.origin_x = DRAW_X + (DRAW_W - draw_w_pts) / 2
        self.origin_y = DRAW_Y + (DRAW_H - draw_h_pts) / 2

    def world_to_pts(self, wx: float, wy: float) -> tuple[float, float]:
        """Convert world inches to PDF points. Note: canvas y-up matches
        our world y-down convention, so we flip y."""
        px = self.origin_x + ((wx - self.world_min[0]) / self.scale_denom) * inch
        # Flip y: world y increases downward, PDF y increases upward
        world_h = self.world_max[1] - self.world_min[1]
        py = self.origin_y + ((world_h - (wy - self.world_min[1])) / self.scale_denom) * inch
        return px, py

    def render(self) -> None:
        self._draw_rooms()
        self._draw_freestanding_walls()
        self._draw_title_block()
        self._draw_north_arrow_and_scale_bar()

    # ── Rooms ────────────────────────────────────────────────────────────────

    def _draw_rooms(self) -> None:
        for room in self.g.rooms:
            if len(room.vertices) < 3:
                continue
            pts = [self.world_to_pts(v.x, v.y) for v in room.vertices]

            # Room fill
            self.c.setFillColor(colors.Color(0.91, 0.95, 1.0))
            self.c.setStrokeColor(colors.black)
            self.c.setLineWidth(1.0)
            path = self.c.beginPath()
            path.moveTo(*pts[0])
            for p in pts[1:]:
                path.lineTo(*p)
            path.close()
            self.c.drawPath(path, fill=1, stroke=0)

            # Per-edge: solid wall segments + openings + dimension labels
            for edge in room.edges:
                v1 = room.vertices[edge.start_vertex_index]
                v2 = room.vertices[edge.end_vertex_index]
                self._draw_edge(v1.x, v1.y, v2.x, v2.y, edge.openings)

            # Room label at centroid
            if len(room.vertices) >= 3:
                cx = sum(v.x for v in room.vertices) / len(room.vertices)
                cy = sum(v.y for v in room.vertices) / len(room.vertices)
                pcx, pcy = self.world_to_pts(cx, cy)
                self.c.setFillColor(colors.black)
                self.c.setFont("Helvetica-Bold", 7)
                self.c.drawCentredString(pcx, pcy + 4, room.name)
                # Area
                area_sqft = _shoelace_sqft(room.vertices)
                self.c.setFont("Helvetica", 6)
                self.c.drawCentredString(pcx, pcy - 4, f"{area_sqft:.0f} sq ft")

    def _draw_edge(self, x1, y1, x2, y2, openings) -> None:
        edge_len = math.hypot(x2 - x1, y2 - y1)
        if edge_len < 0.5:
            return

        # Sort openings by offset
        sorted_openings = sorted(openings, key=lambda o: o.offset_along_edge)

        # Draw solid wall segments (gaps at openings)
        segments = _solid_segments(edge_len, sorted_openings)
        self.c.setStrokeColor(colors.black)
        self.c.setLineWidth(1.5)
        self.c.setLineCap(2)  # square cap
        ux = (x2 - x1) / edge_len
        uy = (y2 - y1) / edge_len

        for a, b in segments:
            ax, ay = x1 + ux * a, y1 + uy * a
            bx, by = x1 + ux * b, y1 + uy * b
            p1 = self.world_to_pts(ax, ay)
            p2 = self.world_to_pts(bx, by)
            self.c.setStrokeColor(colors.black)
            self.c.setLineWidth(1.5)
            self.c.line(*p1, *p2)

        # Opening glyphs
        for opening in sorted_openings:
            oa = opening.offset_along_edge
            ob = oa + opening.width
            op1 = self.world_to_pts(x1 + ux * oa, y1 + uy * oa)
            op2 = self.world_to_pts(x1 + ux * ob, y1 + uy * ob)
            if opening.type == "door":
                draw_door_arc(self.c, *op1, *op2, opening.swing_direction or "left")
            else:
                draw_window_glyph(self.c, *op1, *op2)

        # Dimension label (midpoint, offset outward)
        mid_wx = (x1 + x2) / 2
        mid_wy = (y1 + y2) / 2
        pmid = self.world_to_pts(mid_wx, mid_wy)
        # Outward normal in PDF space: left normal of walking direction
        # In PDF y-up: walking (ux, -uy) in screen → PDF is (ux, -uy) flipped = (ux, uy)
        # Perpendicular left in PDF = (-uy_pdf, ux_pdf). We just offset 8pts perpendicular.
        # Simpler: offset along PDF normal
        pdf_ux = (self.world_to_pts(x2, y2)[0] - self.world_to_pts(x1, y1)[0])
        pdf_uy = (self.world_to_pts(x2, y2)[1] - self.world_to_pts(x1, y1)[1])
        pdf_len = math.hypot(pdf_ux, pdf_uy) or 1
        pdf_ux /= pdf_len
        pdf_uy /= pdf_len
        # Left normal in PDF
        nlx, nly = -pdf_uy, pdf_ux
        offset = 10  # pts
        lx = pmid[0] + nlx * offset
        ly = pmid[1] + nly * offset
        self.c.setFont("Helvetica", 5.5)
        self.c.setFillColor(colors.Color(0.2, 0.2, 0.2))
        # Rotate label to align with edge
        angle = math.degrees(math.atan2(pdf_uy, pdf_ux))
        self.c.saveState()
        self.c.translate(lx, ly)
        self.c.rotate(angle)
        self.c.drawCentredString(0, 0, _feet_inches_label(edge_len))
        self.c.restoreState()

    # ── Freestanding walls ───────────────────────────────────────────────────

    def _draw_freestanding_walls(self) -> None:
        for wall in self.g.walls:
            x1, y1 = wall.start.x, wall.start.y
            x2, y2 = wall.end.x, wall.end.y
            self._draw_edge(x1, y1, x2, y2, wall.openings)

    # ── Title block ──────────────────────────────────────────────────────────

    def _draw_title_block(self) -> None:
        c = self.c
        bx = MARGIN
        by = MARGIN
        bw = PAGE_W - 2 * MARGIN
        bh = TITLE_H

        c.setStrokeColor(colors.black)
        c.setLineWidth(0.75)
        c.rect(bx, by, bw, bh, fill=0, stroke=1)

        # Vertical divider at 60% from left (info) | 40% (scale+date)
        div_x = bx + bw * 0.60
        c.line(div_x, by, div_x, by + bh)

        # Left section: project + floor name
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(bx + 8, by + bh - 20, self.project_name)
        c.setFont("Helvetica", 9)
        c.drawString(bx + 8, by + bh - 34, self.floor_name)

        # Right section: scale + date
        rx = div_x + 8
        c.setFont("Helvetica-Bold", 7)
        c.drawString(rx, by + bh - 16, "SCALE")
        c.setFont("Helvetica", 8)
        c.drawString(rx, by + bh - 27, self.scale_label)

        c.setFont("Helvetica-Bold", 7)
        c.drawString(rx, by + bh - 45, "DATE")
        c.setFont("Helvetica", 8)
        c.drawString(rx, by + bh - 56, date.today().strftime("%B %d, %Y"))

    # ── North arrow + scale bar ──────────────────────────────────────────────

    def _draw_north_arrow_and_scale_bar(self) -> None:
        # Place in lower-right corner of drawing area
        arrow_cx = PAGE_W - MARGIN - 0.4 * inch
        arrow_cy = MARGIN + TITLE_H + 0.5 * inch
        draw_north_arrow(self.c, arrow_cx, arrow_cy, size=0.3 * inch)

        bar_x = MARGIN + 4
        bar_y = MARGIN + TITLE_H + 0.25 * inch
        draw_scale_bar(self.c, bar_x, bar_y, self.scale_denom, bar_feet=10)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _solid_segments(
    wall_len: float,
    openings: list,
) -> list[tuple[float, float]]:
    segments: list[tuple[float, float]] = []
    pos = 0.0
    for o in openings:
        start = max(0.0, o.offset_along_edge)
        end = min(wall_len, o.offset_along_edge + o.width)
        if end <= start:
            continue
        if start > pos:
            segments.append((pos, start))
        pos = end
    if pos < wall_len:
        segments.append((pos, wall_len))
    return segments


def _shoelace_sqft(vertices) -> float:
    n = len(vertices)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i].x * vertices[j].y
        area -= vertices[j].x * vertices[i].y
    return abs(area) / 2 / 144  # sq in → sq ft


def render_floor_pdf(
    output_buffer,
    geometry: FloorGeometry,
    project_name: str,
    floor_name: str,
) -> None:
    """Render `geometry` to `output_buffer` as a PDF."""
    c = Canvas(output_buffer, pagesize=(PAGE_W, PAGE_H))
    renderer = GeometryRenderer(c, geometry, project_name, floor_name)
    renderer.render()
    c.save()
