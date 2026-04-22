#!/usr/bin/env python3
from renderers.common_draw import tag
from utils.render_consts import PALETTE, SAFE_H


def render_content(draw, img, frame, load_font):
    f18 = load_font(18)
    f28 = load_font(28)
    title = frame.get("title", "")
    tag(draw, 40, 25, title, f18, PALETTE["CYAN"])

    points = frame.get("points", [])
    if not points:
        return

    content_top = 85
    line_h = 56
    padding_x = 80
    for i, pt in enumerate(points):
        y = content_top + i * line_h
        if y + line_h > SAFE_H:
            break
        draw.ellipse(
            [padding_x, y + 6, padding_x + 32, y + 38],
            fill=PALETTE["CARD_B"],
            outline=PALETTE["CYAN"],
            width=1,
        )
        f16 = load_font(16)
        draw.text((padding_x + 8, y + 9), str(i + 1), font=f16, fill=PALETTE["CYAN"])
        draw.text((padding_x + 50, y + 4), pt, font=f28, fill=PALETTE["WHITE"])
