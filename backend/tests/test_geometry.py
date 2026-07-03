from app.geometry import edge_length, shoelace_area, square_inches_to_square_feet


def test_edge_length_horizontal():
    assert edge_length((0, 0), (120, 0)) == 120.0


def test_edge_length_diagonal():
    assert edge_length((0, 0), (3, 4)) == 5.0


def test_shoelace_area_10x12_room():
    # 10ft x 12ft rectangle, coordinates in inches: 120in x 144in
    vertices = [(0, 0), (120, 0), (120, 144), (0, 144)]
    area_sq_in = shoelace_area(vertices)
    assert area_sq_in == 120 * 144
    assert square_inches_to_square_feet(area_sq_in) == 120.0


def test_shoelace_area_l_shaped_room():
    # L-shape: 10ft x 12ft minus a 4ft x 4ft notch cut from one corner
    vertices = [
        (0, 0), (120, 0), (120, 96), (72, 96), (72, 144), (0, 144),
    ]
    area_sq_in = shoelace_area(vertices)
    expected = (120 * 144) - (48 * 48)
    assert area_sq_in == expected
