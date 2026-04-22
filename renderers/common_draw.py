#!/usr/bin/env python3
from utils.render_consts import PALETTE, W


def text_center(draw, text, y, font, color=PALETTE["WHITE"]):
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (W - (bbox[2] - bbox[0])) // 2
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0))
    draw.text((x, y), text, font=font, fill=color)


def card(draw, x1, y1, x2, y2, r=12, fill=PALETTE["CARD"], outline=PALETTE["CARD_B"]):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill, outline=outline, width=1)


def tag(draw, x, y, text, font, color=PALETTE["CYAN"]):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rounded_rectangle([x, y, x + tw + 20, y + th + 10], radius=6, fill=(15, 30, 60), outline=color, width=1)
    draw.text((x + 10, y + 5), text, font=font, fill=color)
    return tw + 20


def draw_header_tag(draw, title_text, subtitle_text, load_font, tag_color=PALETTE["CYAN"], subtitle_color=PALETTE["DIM"]):
    f18 = load_font(18)
    tag_w = tag(draw, 40, 25, title_text, f18, tag_color)
    if subtitle_text:
        f_sub = load_font(22)
        draw.text((40 + tag_w + 16, 30), subtitle_text, font=f_sub, fill=subtitle_color)
