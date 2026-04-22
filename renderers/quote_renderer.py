#!/usr/bin/env python3
"""引用块：居中主引文 + 下方出处（参考演示排版结构）。"""

from renderers.common_draw import draw_header_tag
from utils.render_consts import PALETTE, SAFE_H, W
from utils.render_glass_utils import apply_glass_panel
from utils.render_text_utils import draw_text_block, fit_text_block


def render_quote(draw, img, frame, load_font):
    draw_header_tag(
        draw,
        frame.get("title", ""),
        frame.get("subtitle", ""),
        load_font=load_font,
        tag_color=PALETTE["CYAN"],
        subtitle_color=PALETTE["DIM"],
    )

    body = str(frame.get("quote", "")).strip()
    attribution = str(frame.get("attribution", "")).strip()
    if not body:
        return

    zone_top = 114
    zone_bottom = SAFE_H - 30
    panel_x1 = 86
    panel_x2 = W - 86
    panel_y1 = zone_top + 10
    panel_y2 = zone_bottom - 8

    text_x = panel_x1 + 36
    text_w = panel_x2 - panel_x1 - 72
    reserve_attr = 56 if attribution else 14
    max_body_h = panel_y2 - panel_y1 - reserve_attr - 28

    apply_glass_panel(
        img,
        draw,
        panel_x1,
        panel_y1,
        panel_x2,
        panel_y2,
        radius=18,
        blur=10,
        tint_alpha=0.28,
        pad=8,
    )

    lines, font, lh, _ = fit_text_block(
        draw, body, text_w, max_body_h, [64, 58, 52, 46, 40, 36, 32, 28], max_lines=3, line_gap=10
    )
    total_h = len(lines) * lh + max(0, len(lines) - 1) * 10
    body_top = panel_y1 + 6
    body_bottom = panel_y2 - reserve_attr - 12
    body_y = body_top + max(0, (body_bottom - body_top - total_h) // 2)
    # 光学校正：在几何居中基础上再上移，避免视觉上“偏下”。
    body_y -= 16
    draw_text_block(
        draw,
        lines,
        font,
        text_x,
        body_y,
        color=PALETTE["WHITE"],
        line_h=lh,
        line_gap=10,
        center=True,
        max_w=text_w,
    )

    if attribution:
        alines, af, alh, _ = fit_text_block(
            draw, f"— {attribution}", text_w, 52, [42, 36, 32, 28, 24, 22], max_lines=1, line_gap=0
        )
        ay = panel_y2 - 68
        if alines:
            draw_text_block(
                draw,
                alines,
                af,
                text_x,
                ay,
                color=PALETTE["DIM"],
                line_h=alh,
                line_gap=0,
                center=True,
                max_w=text_w,
            )
