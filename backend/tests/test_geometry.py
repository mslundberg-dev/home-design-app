"""
Unit tests for backend/app/geometry.py.

These are pure-math tests with no DB or HTTP dependencies — they run
anywhere (inside Docker or locally without postgres).
"""

import math

import pytest

from app.geometry import edge_length, shoelace_area, square_inches_to_square_feet


# ---------------------------------------------------------------------------
# edge_length
# ---------------------------------------------------------------------------

def test_edge_length_horizontal():
    assert edge_length((0, 0), (120, 0)) == 120.0


def test_edge_length_vertical():
    assert edge_length((0, 0), (0, 144)) == 144.0


def test_edge_length_diagonal_3_4_5():
    assert edge_length((0, 0), (3, 4)) == 5.0


def test_edge_length_diagonal_arbitrary():
    # 45° diagonal: (0,0) → (5,5); distance = 5√2
    assert math.isclose(edge_length((0, 0), (5, 5)), 5 * math.sqrt(2))


def test_edge_length_same_point():
    assert edge_length((10, 10), (10, 10)) == 0.0


def test_edge_length_negative_coords():
    # Should work with any coordinate values, not just positive ones
    assert edge_length((-3, 0), (1, 0)) == 4.0


# ---------------------------------------------------------------------------
# shoelace_area
# ---------------------------------------------------------------------------

def test_shoelace_area_10x12_room():
    # Canonical regression case: 10ft x 12ft rectangle (120in x 144in)
    vertices = [(0, 0), (120, 0), (120, 144), (0, 144)]
    area_sq_in = shoelace_area(vertices)
    assert area_sq_in == 120 * 144
    assert square_inches_to_square_feet(area_sq_in) == 120.0


def test_shoelace_area_l_shaped_room():
    # L-shape: 10ft x 12ft minus a 4ft x 4ft (48in x 48in) notch
    vertices = [
        (0, 0), (120, 0), (120, 96), (72, 96), (72, 144), (0, 144),
    ]
    area_sq_in = shoelace_area(vertices)
    expected = (120 * 144) - (48 * 48)
    assert area_sq_in == expected


def test_shoelace_area_unit_square():
    vertices = [(0, 0), (1, 0), (1, 1), (0, 1)]
    assert shoelace_area(vertices) == 1.0


def test_shoelace_area_clockwise_same_as_ccw():
    # The shoelace formula uses abs(), so winding order doesn't change area.
    ccw = [(0, 0), (12, 0), (12, 12), (0, 12)]
    cw = list(reversed(ccw))
    assert shoelace_area(ccw) == shoelace_area(cw)


def test_shoelace_area_triangle():
    # Right triangle with legs 6 and 8: area = 0.5 * 6 * 8 = 24
    vertices = [(0, 0), (6, 0), (0, 8)]
    assert shoelace_area(vertices) == 24.0


def test_shoelace_area_degenerate_less_than_3_vertices():
    assert shoelace_area([]) == 0.0
    assert shoelace_area([(0, 0)]) == 0.0
    assert shoelace_area([(0, 0), (10, 0)]) == 0.0


def test_shoelace_area_collinear_points():
    # Three collinear points enclose zero area
    vertices = [(0, 0), (5, 0), (10, 0)]
    assert shoelace_area(vertices) == 0.0


# ---------------------------------------------------------------------------
# square_inches_to_square_feet
# ---------------------------------------------------------------------------

def test_square_inches_to_square_feet_one_sqft():
    # 144 sq in == 1 sq ft
    assert square_inches_to_square_feet(144) == 1.0


def test_square_inches_to_square_feet_zero():
    assert square_inches_to_square_feet(0) == 0.0


def test_square_inches_to_square_feet_fractional():
    assert math.isclose(square_inches_to_square_feet(72), 0.5)
