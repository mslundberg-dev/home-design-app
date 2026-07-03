"""Page layout constants and scale selection for floor-plan PDFs."""

from __future__ import annotations

import math

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch

# ── Page geometry ────────────────────────────────────────────────────────────

PAGE_W, PAGE_H = LETTER  # 612 × 792 pts (8.5" × 11")
MARGIN = 0.5 * inch       # 36 pts on all sides
TITLE_H = 1.25 * inch     # height reserved at bottom for title block

# Usable rectangle for the drawing itself
DRAW_X = MARGIN
DRAW_Y = MARGIN + TITLE_H
DRAW_W = PAGE_W - 2 * MARGIN
DRAW_H = PAGE_H - 2 * MARGIN - TITLE_H


# ── Scale selection ──────────────────────────────────────────────────────────

# Scale denominators to try (1 drawing-inch = N real-inches).
# Listed smallest first so we pick the largest that fits.
_IMPERIAL_SCALES = [12, 16, 24, 32, 48, 64, 96, 128, 192, 384]


def choose_scale(world_w_in: float, world_h_in: float) -> tuple[float, str]:
    """Return (scale_denominator, label) for the largest scale that fits the
    drawing area.  E.g. (48, '1/4" = 1\\'−0"').
    """
    # Add generous padding around the geometry before fitting
    pad = max(world_w_in, world_h_in) * 0.10 + 12  # at least 12" pad
    pw = world_w_in + pad
    ph = world_h_in + pad

    draw_w_in = DRAW_W / inch
    draw_h_in = DRAW_H / inch

    for denom in _IMPERIAL_SCALES:
        if (pw / denom) <= draw_w_in and (ph / denom) <= draw_h_in:
            label = _scale_label(denom)
            return float(denom), label

    # Fallback: compute minimum denom that fits
    denom = math.ceil(max(pw / draw_w_in, ph / draw_h_in))
    return float(denom), f"1\" = {denom}\\'−0\""


def _scale_label(denom: int) -> str:
    """Human-readable scale string for common architectural denominators."""
    mapping = {
        12:  "1\" = 1'−0\"",
        16:  "3/4\" = 1'−0\"",
        24:  "1/2\" = 1'−0\"",
        32:  "3/8\" = 1'−0\"",
        48:  "1/4\" = 1'−0\"",
        64:  "3/16\" = 1'−0\"",
        96:  "1/8\" = 1'−0\"",
        128: "3/32\" = 1'−0\"",
        192: "1/16\" = 1'−0\"",
        384: "1/32\" = 1'−0\"",
    }
    return mapping.get(denom, f"1\" = {denom}\"")
