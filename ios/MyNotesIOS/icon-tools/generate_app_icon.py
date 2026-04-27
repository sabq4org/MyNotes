#!/usr/bin/env python3
"""
Generate AppIcon PNGs for MyNotesIOS that match the web's brand identity:
indigo brand-600 (#4F46E5) background with a white "NotebookPen" lucide icon
centered, matching the in-app logo used by AuthLayout and AppHeader.

Usage: python3 generate_app_icon.py
Outputs into ../MyNotesIOS/Assets.xcassets/AppIcon.appiconset/
"""

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent.parent / "MyNotesIOS" / "Assets.xcassets" / "AppIcon.appiconset"

BRAND_TOP = (0x63, 0x66, 0xF1)      # brand-500
BRAND_BOTTOM = (0x43, 0x38, 0xCA)   # brand-700
ACCENT = (0xC7, 0xD2, 0xFE)         # brand-200, faint highlight
WHITE = (255, 255, 255)


def vertical_gradient(size: int) -> Image.Image:
    """Solid radial-ish indigo gradient, lighter top-right, darker bottom-left."""
    img = Image.new("RGB", (size, size), BRAND_TOP)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (y / (size - 1)) * 0.7 + (1 - x / (size - 1)) * 0.3
            r = round(BRAND_TOP[0] * (1 - t) + BRAND_BOTTOM[0] * t)
            g = round(BRAND_TOP[1] * (1 - t) + BRAND_BOTTOM[1] * t)
            b = round(BRAND_TOP[2] * (1 - t) + BRAND_BOTTOM[2] * t)
            px[x, y] = (r, g, b)
    return img


def soft_circle(img: Image.Image, cx, cy, r, color, alpha):
    """Add a soft (gaussian-ish) translucent circle for atmospheric depth."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    steps = 30
    for i in range(steps, 0, -1):
        a = int(alpha * (i / steps) ** 2)
        rr = int(r * (i / steps))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*color, a))
    img.alpha_composite(overlay)


def rounded_rect(d: ImageDraw.ImageDraw, x1, y1, x2, y2, radius, **kwargs):
    d.rounded_rectangle([x1, y1, x2, y2], radius=radius, **kwargs)


def draw_notebook_pen(img: Image.Image, size: int):
    """
    Draw a stylised NotebookPen glyph at the centre of `img`. Geometry chosen to
    match lucide-react's NotebookPen at strokeWidth ~2.2 but scaled to a 1024
    canvas. Strokes are rendered as filled rounded rectangles / pills so they
    look crisp at every export size.
    """
    d = ImageDraw.Draw(img, "RGBA")

    # Working area for the glyph: 56% of icon, centred.
    glyph = int(size * 0.56)
    cx, cy = size / 2, size / 2
    x0 = cx - glyph / 2
    y0 = cy - glyph / 2

    # Stroke thickness
    stroke = max(2, int(glyph * 0.075))
    radius = stroke // 2

    # Notebook body (rounded rectangle outline)
    nb_left = x0 + glyph * 0.18
    nb_top = y0 + glyph * 0.04
    nb_right = x0 + glyph * 0.94
    nb_bottom = y0 + glyph * 0.96

    # Outline path: drawn as a rounded rectangle with thick stroke and the
    # top-right corner trimmed to make room for the pen.
    rounded_rect(
        d,
        nb_left, nb_top, nb_right, nb_bottom,
        radius=int(glyph * 0.10),
        outline=WHITE,
        width=stroke,
    )

    # Spine perforations on the left edge (binding holes) — four short
    # horizontal pills.
    spine_x = x0 + glyph * 0.02
    pill_len = glyph * 0.16
    for i, t in enumerate([0.20, 0.40, 0.60, 0.80]):
        py = y0 + glyph * t
        d.rounded_rectangle(
            [spine_x, py - radius, spine_x + pill_len, py + radius],
            radius=radius,
            fill=WHITE,
        )

    # Pen overlapping top-right (a slim rotated rounded rectangle with a tip).
    # We approximate by drawing a polygon outline + a small triangle for the nib.
    import math as _m

    pen_cx = nb_right + glyph * 0.04
    pen_cy = nb_top - glyph * 0.04
    pen_w = glyph * 0.18
    pen_h = glyph * 0.45
    angle = _m.radians(-45)

    # Pen body corners (before rotation), centred at origin
    hw, hh = pen_w / 2, pen_h / 2
    corners = [(-hw, -hh), (hw, -hh), (hw, hh - pen_w * 0.5), (0, hh), (-hw, hh - pen_w * 0.5)]

    def rot(p):
        x, y = p
        return (
            pen_cx + x * _m.cos(angle) - y * _m.sin(angle),
            pen_cy + x * _m.sin(angle) + y * _m.cos(angle),
        )

    pen_path = [rot(p) for p in corners]
    d.polygon(pen_path, fill=BRAND_BOTTOM, outline=WHITE)
    # Stroke the polygon manually for thickness
    for i in range(len(pen_path)):
        a = pen_path[i]
        b = pen_path[(i + 1) % len(pen_path)]
        d.line([a, b], fill=WHITE, width=stroke, joint="curve")

    # Ink reservoir line near the top of the pen
    ink_a = rot((-hw * 0.6, -hh + pen_w * 0.45))
    ink_b = rot((hw * 0.6, -hh + pen_w * 0.45))
    d.line([ink_a, ink_b], fill=WHITE, width=max(2, stroke - 2))


def render(size: int) -> Image.Image:
    img = vertical_gradient(size).convert("RGBA")
    # Atmospheric highlight (top-left lighter blob, bottom-right deeper)
    soft_circle(img, int(size * 0.25), int(size * 0.20), int(size * 0.55), ACCENT, alpha=70)
    soft_circle(img, int(size * 0.85), int(size * 0.85), int(size * 0.45), BRAND_BOTTOM, alpha=120)
    draw_notebook_pen(img, size)
    return img.convert("RGB")


REQUIRED = [
    ("AppIcon-20.png", 20),
    ("AppIcon-29.png", 29),
    ("AppIcon-40.png", 40),
    ("AppIcon-58.png", 58),
    ("AppIcon-60.png", 60),
    ("AppIcon-76.png", 76),
    ("AppIcon-80.png", 80),
    ("AppIcon-87.png", 87),
    ("AppIcon-120.png", 120),
    ("AppIcon-152.png", 152),
    ("AppIcon-167.png", 167),
    ("AppIcon-180.png", 180),
    ("AppIcon-1024.png", 1024),
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    master = render(1024)
    for name, sz in REQUIRED:
        if sz == 1024:
            master.save(OUT_DIR / name, format="PNG", optimize=True)
        else:
            resized = master.resize((sz, sz), Image.LANCZOS)
            resized.save(OUT_DIR / name, format="PNG", optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main()
