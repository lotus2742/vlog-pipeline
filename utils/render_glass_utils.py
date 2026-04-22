#!/usr/bin/env python3
"""毛玻璃容器渲染公共工具。"""

from PIL import Image, ImageFilter


def apply_glass_panel(
    img,
    draw,
    x1,
    y1,
    x2,
    y2,
    *,
    radius=16,
    blur=10,
    tint_alpha=0.28,
    tint_color=(20, 24, 48),
    outline_color=(150, 180, 255),
    pad=6,
):
    w, h = img.size
    blur_box = (
        max(0, x1 - pad),
        max(0, y1 - pad),
        min(w, x2 + pad),
        min(h, y2 + pad),
    )
    glass_crop = img.crop(blur_box).filter(ImageFilter.GaussianBlur(blur))
    img.paste(glass_crop, blur_box)

    panel_box = (x1, y1, x2, y2)
    panel_crop = img.crop(panel_box)
    tint = Image.new("RGB", panel_crop.size, tint_color)
    panel_tinted = Image.blend(panel_crop, tint, tint_alpha)
    img.paste(panel_tinted, panel_box)
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=outline_color, width=1)
