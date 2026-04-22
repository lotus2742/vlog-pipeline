#!/usr/bin/env python3
"""要点清单：参考“重点清单”版式的分区行布局。"""

from renderers.common_draw import draw_header_tag
from utils.render_consts import PALETTE, SAFE_H, W
from utils.render_text_utils import draw_text_block, fit_text_block


def _normalize_items(raw):
    out = []
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, str) and x.strip():
            s = x.strip()
            out.append({"title": s, "desc": s})
        elif isinstance(x, dict):
            title = str(x.get("title", "")).strip()
            desc = str(x.get("desc", "")).strip()
            text = str(x.get("text", "")).strip()
            if title or desc:
                if not title:
                    title = desc
                if not desc:
                    desc = title
                out.append({"title": title, "desc": desc})
            elif text:
                out.append({"title": text, "desc": text})
    return out


def _as_row(item):
    if isinstance(item, dict):
        title = str(item.get("title", "")).strip()
        desc = str(item.get("desc", "")).strip()
        if title and desc:
            return title, desc
        if title:
            return title, title
        if desc:
            return desc, desc
    s = str(item or "").strip()
    return s, s


def render_bullets(draw, img, frame, load_font):
    items = _normalize_items(frame.get("items", []))
    draw_header_tag(
        draw,
        frame.get("title", ""),
        frame.get("subtitle", ""),
        load_font=load_font,
        tag_color=PALETTE["CYAN"],
        subtitle_color=PALETTE["DIM"],
    )
    if not items:
        return

    n = len(items)
    panel_x1, panel_x2 = 58, W - 58
    panel_y1, panel_y2 = 148, SAFE_H - 18
    panel_h = panel_y2 - panel_y1
    row_h = panel_h // max(1, n)
    left_col_w = 360
    icon_cx = panel_x1 + 52
    title_x = panel_x1 + 106
    divider_x = panel_x1 + left_col_w
    right_x = divider_x + 26

    draw.rectangle([panel_x1, panel_y1, panel_x2, panel_y2], outline=(95, 130, 180), width=1)

    for i in range(1, n):
        y = panel_y1 + i * row_h
        draw.line([(panel_x1 + 24, y), (panel_x2 - 24, y)], fill=(80, 102, 136), width=1)

    for i, item in enumerate(items):
        row_y1 = panel_y1 + i * row_h
        row_y2 = panel_y1 + (i + 1) * row_h
        cy = (row_y1 + row_y2) // 2

        draw.line([(divider_x, row_y1 + 18), (divider_x, row_y2 - 18)], fill=(92, 118, 160), width=1)
        accent = PALETTE["GOLD"]
        draw.ellipse([icon_cx - 22, cy - 22, icon_cx + 22, cy + 22], outline=accent, width=2)
        draw.text((icon_cx - 7, cy - 11), str(i + 1), font=load_font(22), fill=accent)

        title, desc = _as_row(item)
        t_lines, tf, tlh, _ = fit_text_block(
            draw, title, divider_x - title_x - 16, 52, [58, 52, 46, 40, 36], max_lines=1, line_gap=0
        )
        d_lines, df, dlh, _ = fit_text_block(
            draw, desc, panel_x2 - right_x - 20, row_h - 26, [30, 28, 26, 24, 22], max_lines=2, line_gap=6
        )

        if t_lines:
            t_box = draw.textbbox((0, 0), t_lines[0], font=tf)
            ty = cy - (t_box[3] - t_box[1]) // 2 - t_box[1]
            draw_text_block(draw, t_lines, tf, title_x, ty, accent, line_h=tlh, line_gap=0)

        desc_h = len(d_lines) * dlh + max(0, len(d_lines) - 1) * 6
        dy = row_y1 + (row_h - desc_h) // 2
        draw_text_block(draw, d_lines, df, right_x, dy, PALETTE["TEXT_SOFT"], line_h=dlh, line_gap=6)
