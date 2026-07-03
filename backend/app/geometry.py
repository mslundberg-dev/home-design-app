"""Pure geometry math — no DB/HTTP dependencies, fully unit-testable.

Mirrors frontend/src/canvas/geometry.ts intentionally: the client needs
zero-latency feedback while drawing, the server needs the same math to
render the PDF from persisted data. Kept in sync by the shared unit tests
(10ft x 12ft rectangle is the canonical regression case on both sides).
"""

import math


def edge_length(p1: tuple[float, float], p2: tuple[float, float]) -> float:
    """Distance between two points, in the same unit as the inputs (inches)."""
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])


def shoelace_area(vertices: list[tuple[float, float]]) -> float:
    """Area of a closed polygon in square-inches, via the shoelace formula.

    `vertices` should be the ordered polygon points (not repeating the first
    point at the end). Works for convex and simple concave polygons.
    """
    n = len(vertices)
    if n < 3:
        return 0.0
    total = 0.0
    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def square_inches_to_square_feet(area_sq_in: float) -> float:
    return area_sq_in / 144.0
