"""Symbols drawn on the floor plan: north arrow, scale bar, door arc, window glyph."""

from __future__ import annotations

import math

from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas


def draw_north_arrow(c: Canvas, cx: float, cy: float, size: float) -> None:
    """Simple north arrow: a filled triangle pointing up with 'N' label."""
    half = size / 2
    # Arrow outline (unfilled half left, filled half right)
    c.setStrokeColor(colors.black)
    c.setFillColor(colors.black)
    c.setLineWidth(0.5)
    # Full arrow outline
    path = c.beginPath()
    path.moveTo(cx, cy + size)       # tip
    path.lineTo(cx - half / 2, cy)   # bottom-left
    path.lineTo(cx + half / 2, cy)   # bottom-right
    path.close()
    c.drawPath(path, fill=1, stroke=1)
    # 'N' label below
    c.setFont("Helvetica-Bold", size * 0.55)
    c.setFillColor(colors.black)
    c.drawCentredString(cx, cy - size * 0.5, "N")


def draw_scale_bar(
    c: Canvas,
    x: float,
    y: float,
    scale_denom: float,
    bar_feet: int = 10,
) -> None:
    """Horizontal scale bar spanning `bar_feet` real feet."""
    from reportlab.lib.units import inch

    # Length of bar in points
    bar_pts = (bar_feet * 12 / scale_denom) * inch
    tick_h = 4  # pts

    c.setStrokeColor(colors.black)
    c.setFillColor(colors.black)
    c.setLineWidth(0.75)

    # Main baseline
    c.line(x, y, x + bar_pts, y)

    # Tick marks and labels at 0, bar_feet/2, bar_feet
    divisions = [0, bar_feet // 2, bar_feet]
    for ft in divisions:
        tx = x + (ft * 12 / scale_denom) * inch
        c.line(tx, y, tx, y + tick_h)
        c.setFont("Helvetica", 5.5)
        label = "0'" if ft == 0 else f"{ft}'"
        c.drawCentredString(tx, y + tick_h + 1.5, label)


def draw_door_arc(
    c: Canvas,
    x1: float, y1: float,
    x2: float, y2: float,
    swing: str,  # 'left' | 'right'
) -> None:
    """Door swing glyph: hinge line + quarter-circle arc."""
    dx = x2 - x1
    dy = y2 - y1
    r = math.hypot(dx, dy)
    if r < 0.5:
        return

    ux, uy = dx / r, dy / r
    # Normals in PDF space (y-up): left = (-uy, ux), right = (uy, -ux)
    if swing == "left":
        nx, ny = -uy, ux
    else:
        nx, ny = uy, -ux

    # Door panel end point
    ex = x1 + nx * r
    ey = y1 + ny * r

    c.setLineWidth(0.5)
    c.setStrokeColor(colors.black)

    # Hinge line
    c.line(x1, y1, ex, ey)

    # Arc from panel end to latch point — drawn as a Bezier approximation
    # using reportlab's arc helper (needs bounding box + start/extent angles)
    wall_angle_deg = math.degrees(math.atan2(dy, dx))
    if swing == "left":
        start_angle = wall_angle_deg + 90
    else:
        start_angle = wall_angle_deg - 90

    bbox_x = x1 - r
    bbox_y = y1 - r
    c.arc(bbox_x, bbox_y, x1 + r, y1 + r, startAng=start_angle, extent=-90 if swing == "left" else 90)


def draw_window_glyph(
    c: Canvas,
    x1: float, y1: float,
    x2: float, y2: float,
    offset_pts: float = 3.0,
) -> None:
    """Window glyph: two sash lines + jamb lines at each end."""
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length < 0.5:
        return

    ux, uy = dx / length, dy / length
    # Left/right normals in PDF y-up space
    lx, ly = -uy, ux
    rx, ry = uy, -ux

    s = offset_pts
    c.setLineWidth(0.5)
    c.setStrokeColor(colors.black)

    # Sash line — left side
    c.line(x1 + lx * s, y1 + ly * s, x2 + lx * s, y2 + ly * s)
    # Sash line — right side
    c.line(x1 + rx * s, y1 + ry * s, x2 + rx * s, y2 + ry * s)
    # Jamb at start
    c.line(x1 + lx * s, y1 + ly * s, x1 + rx * s, y1 + ry * s)
    # Jamb at end
    c.line(x2 + lx * s, y2 + ly * s, x2 + rx * s, y2 + ry * s)
