#!/usr/bin/env python3
"""大数字 / KPI：支持 single / strip / dashboard 三种排版并自动选型。"""

from renderers.common_draw import draw_header_tag, text_center
from utils.render_consts import PALETTE, SAFE_H, W
from utils.render_text_utils import draw_text_block, fit_text_block
import re
from PIL import Image, ImageFilter


def _normalize_kpis(raw):
    out = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        value = str(item.get("value", "")).strip()
        label = str(item.get("label", "")).strip()
        unit = str(item.get("unit", "")).strip()
        if not title or not value:
            continue
        out.append({"title": title, "value": value, "label": label, "unit": unit})
    return out


def _to_number(text: str):
    m = re.search(r"-?\d+(?:\.\d+)?", str(text or ""))
    return float(m.group(0)) if m else None


def _apply_glass_panel(img, draw, x1, y1, x2, y2, radius=16, blur=10, tint_alpha=0.28):
    pad = 6
    blur_box = (
        max(0, x1 - pad),
        max(0, y1 - pad),
        min(W, x2 + pad),
        min(SAFE_H, y2 + pad),
    )
    glass_crop = img.crop(blur_box).filter(ImageFilter.GaussianBlur(blur))
    img.paste(glass_crop, blur_box)

    panel_box = (x1, y1, x2, y2)
    panel_crop = img.crop(panel_box)
    tint = Image.new("RGB", panel_crop.size, (20, 24, 48))
    panel_tinted = Image.blend(panel_crop, tint, tint_alpha)
    img.paste(panel_tinted, panel_box)
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=(150, 180, 255), width=1)


def _pick_layout(frame, kpis, value):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit in {"strip", "dashboard", "single"}:
        return explicit
    trend_points = frame.get("trend_points", [])
    has_trend = isinstance(trend_points, list) and len(trend_points) >= 4
    if len(kpis) >= 4 and (has_trend or frame.get("trend_title")):
        return "dashboard"
    if len(kpis) >= 4:
        return "dashboard"
    if len(kpis) >= 2:
        return "strip"
    return "single" if value else "strip"


def _draw_trend_chart(draw, x1, y1, x2, y2, points, load_font, title="趋势"):
    draw.text((x1 + 14, y1 + 10), title, font=load_font(18), fill=PALETTE["DIM"])

    px1, py1 = x1 + 16, y1 + 42
    px2, py2 = x2 - 16, y2 - 18
    for i in range(4):
        gy = py1 + (py2 - py1) * i // 3
        draw.line([(px1, gy), (px2, gy)], fill=(52, 52, 96), width=1)

    if len(points) < 2:
        return
    pmin, pmax = min(points), max(points)
    if pmax == pmin:
        pmax = pmin + 1.0
    coords = []
    for i, v in enumerate(points):
        xx = px1 + (px2 - px1) * i // (len(points) - 1)
        ratio = (v - pmin) / (pmax - pmin)
        yy = py2 - int((py2 - py1) * ratio)
        coords.append((xx, yy))
    if len(coords) >= 2:
        draw.line(coords, fill=PALETTE["CYAN"], width=3)
        ex, ey = coords[-1]
        draw.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=PALETTE["GOLD"])


def _render_kpi_strip(img, draw, kpis, load_font):
    n = len(kpis)
    panel_x1, panel_x2 = 72, W - 72
    panel_y1, panel_y2 = 206, 390
    panel_w = panel_x2 - panel_x1
    col_w = panel_w // n
    _apply_glass_panel(img, draw, panel_x1, panel_y1, panel_x2, panel_y2, radius=20, blur=10, tint_alpha=0.26)

    for i, kp in enumerate(kpis):
        x1 = panel_x1 + i * col_w
        x2 = panel_x1 + (i + 1) * col_w if i < n - 1 else panel_x2
        if i > 0:
            draw.line([(x1, panel_y1 + 24), (x1, panel_y2 - 24)], fill=(70, 70, 120), width=1)

        title_lines, tf, tlh, _ = fit_text_block(
            draw, kp["title"], x2 - x1 - 28, 38, [42, 38, 34, 30, 28], max_lines=1, line_gap=0
        )
        value_text = kp["value"] + (kp["unit"] or "")
        value_lines, vf, vlh, _ = fit_text_block(
            draw, value_text, x2 - x1 - 28, 64, [62, 58, 52, 48, 44], max_lines=1, line_gap=0
        )
        label_lines, lf, llh, _ = fit_text_block(
            draw, kp["label"], x2 - x1 - 28, 44, [24, 22, 20, 18], max_lines=1, line_gap=0
        )

        title_y = panel_y1 + 30
        label_y = panel_y2 - 50
        title_bottom = title_y + max(tlh, 28)
        label_top = label_y
        value_box = draw.textbbox((0, 0), value_lines[0] if value_lines else "", font=vf)
        value_h = max(1, value_box[3] - value_box[1])
        mid_zone_top = title_bottom + 8
        mid_zone_bottom = label_top - 8
        if mid_zone_bottom <= mid_zone_top + value_h:
            value_y = panel_y1 + 86
        else:
            value_y = mid_zone_top + (mid_zone_bottom - mid_zone_top - value_h) // 2 - value_box[1]

        draw_text_block(draw, title_lines, tf, x1 + 14, title_y, PALETTE["WHITE"], line_h=tlh, line_gap=0)
        draw_text_block(draw, value_lines, vf, x1 + 14, value_y, PALETTE["GOLD"], line_h=vlh, line_gap=0)
        if label_lines:
            draw_text_block(draw, label_lines, lf, x1 + 14, label_y, PALETTE["DIM"], line_h=llh, line_gap=0)


def _render_kpi_dashboard(img, draw, frame, kpis, load_font):
    panel_x1, panel_x2 = 58, W - 58
    panel_y1, panel_y2 = 154, 552
    _apply_glass_panel(img, draw, panel_x1, panel_y1, panel_x2, panel_y2, radius=22, blur=10, tint_alpha=0.26)

    left_x1 = panel_x1 + 18
    left_x2 = panel_x1 + int((panel_x2 - panel_x1) * 0.56)
    right_x1 = left_x2 + 16
    right_x2 = panel_x2 - 18
    top = panel_y1 + 20
    bottom = panel_y2 - 22

    draw.line([(left_x2 + 8, top), (left_x2 + 8, bottom)], fill=(70, 70, 120), width=1)

    grid_cols, grid_rows = 2, 2
    col_gap = 24
    row_gap = 18
    # 左侧四指标作为“中间紧凑组”排版，避免上下撑满导致视觉发散。
    full_h = bottom - top
    target_group_h = min(full_h, 276)
    group_top = top + (full_h - target_group_h) // 2
    left_inner_pad = col_gap
    usable_w = (left_x2 - left_x1) - left_inner_pad * 2 - col_gap
    cw = usable_w // grid_cols
    ch = (target_group_h - row_gap) // grid_rows
    for i, kp in enumerate(kpis[:4]):
        r = i // grid_cols
        c = i % grid_cols
        x1 = left_x1 + left_inner_pad + c * (cw + col_gap)
        y1 = group_top + r * (ch + row_gap)
        x2 = x1 + cw
        y2 = y1 + ch
        title_lines, tf, tlh, _ = fit_text_block(draw, kp["title"], x2 - x1 - 18, 30, [26, 24, 22], max_lines=1, line_gap=0)
        value_text = kp["value"] + (kp["unit"] or "")
        value_lines, vf, vlh, _ = fit_text_block(draw, value_text, x2 - x1 - 18, 46, [54, 50, 44, 40], max_lines=1, line_gap=0)
        label_lines, lf, llh, _ = fit_text_block(draw, kp["label"], x2 - x1 - 18, 28, [20, 18], max_lines=1, line_gap=0)

        title_y = y1 + 12
        label_y = y2 - 30
        title_bottom = title_y + max(tlh, 24)
        label_top = label_y
        value_h = max(vlh, 40)
        mid_zone_top = title_bottom + 6
        mid_zone_bottom = label_top - 6
        if mid_zone_bottom <= mid_zone_top + value_h:
            value_y = y1 + 40
        else:
            value_y = mid_zone_top + (mid_zone_bottom - mid_zone_top - value_h) // 2

        draw_text_block(draw, title_lines, tf, x1 + 10, title_y, PALETTE["WHITE"], line_h=tlh, line_gap=0)
        draw_text_block(draw, value_lines, vf, x1 + 10, value_y, PALETTE["GOLD"], line_h=vlh, line_gap=0)
        if label_lines:
            draw_text_block(draw, label_lines, lf, x1 + 10, label_y, PALETTE["DIM"], line_h=llh, line_gap=0)

    trend_points = frame.get("trend_points", [])
    pts = []
    if isinstance(trend_points, list):
        for x in trend_points:
            try:
                pts.append(float(x))
            except Exception:
                continue
    if len(pts) < 4:
        for kp in kpis[:4]:
            n = _to_number(kp.get("value", ""))
            if n is not None:
                pts.append(n)
        if len(pts) < 4:
            pts = [180, 260, 340, 520, 680, 760]
        elif len(pts) == 4:
            pts = [pts[0], pts[1], pts[2], pts[3], pts[3] * 1.1, pts[3] * 1.25]
    _draw_trend_chart(
        draw,
        right_x1,
        top,
        right_x2,
        bottom,
        pts,
        load_font,
        title=str(frame.get("trend_title", "")).strip() or "增长趋势",
    )


def _render_kpi_single(img, draw, value, unit, label, load_font):
    main = value + (unit if unit else "")
    max_w = W - 100
    chosen = 104
    f_big = load_font(chosen)
    bb = draw.textbbox((0, 0), main, font=f_big)
    while bb[2] - bb[0] > max_w and chosen > 36:
        chosen -= 4
        f_big = load_font(chosen)
        bb = draw.textbbox((0, 0), main, font=f_big)

    panel_w = min(W - 260, max(420, (bb[2] - bb[0]) + 190))
    panel_h = max(210, (bb[3] - bb[1]) + 110)
    panel_x1 = (W - panel_w) // 2
    panel_y1 = 170
    panel_x2 = panel_x1 + panel_w
    panel_y2 = panel_y1 + panel_h
    _apply_glass_panel(img, draw, panel_x1, panel_y1, panel_x2, panel_y2, radius=20, blur=10, tint_alpha=0.26)
    draw.text((panel_x1 + 20, panel_y1 + 18), "核心指标", font=load_font(18), fill=PALETTE["DIM"])

    y_block = panel_y1 + 64
    text_center(draw, main, y_block, f_big, PALETTE["GOLD"])

    if label:
        lines, font, lh, _ = fit_text_block(
            draw, label, panel_w - 72, 68, [28, 26, 24, 22], max_lines=2, line_gap=6
        )
        yy = panel_y2 - 72
        draw_text_block(draw, lines, font, panel_x1 + 36, yy, color=PALETTE["WHITE"], line_h=lh, line_gap=6)


def render_kpi(draw, img, frame, load_font):
    draw_header_tag(
        draw,
        frame.get("title", ""),
        frame.get("subtitle", ""),
        load_font=load_font,
        tag_color=PALETTE["CYAN"],
        subtitle_color=PALETTE["DIM"],
    )

    value = str(frame.get("value", "")).strip()
    unit = str(frame.get("unit", "")).strip()
    label = str(frame.get("label", "")).strip()
    footnote = str(frame.get("footnote", "")).strip()
    kpis = _normalize_kpis(frame.get("kpis", []))

    if not value and len(kpis) < 2:
        return

    layout = _pick_layout(frame, kpis, value)
    if layout == "dashboard" and len(kpis) >= 4:
        _render_kpi_dashboard(img, draw, frame, kpis, load_font)
    elif layout == "strip" and len(kpis) >= 2:
        _render_kpi_strip(img, draw, kpis[:4], load_font)
    else:
        _render_kpi_single(img, draw, value, unit, label, load_font)

    if footnote:
        fl, ff, flh, _ = fit_text_block(
            draw, footnote, W - 260, 48, [18, 16], max_lines=1, line_gap=4
        )
        fy = SAFE_H - 58
        if fl:
            bb = draw.textbbox((0, 0), fl[0], font=ff)
            fw = bb[2] - bb[0]
            fx = max(60, W - fw - 64)
            draw_text_block(draw, fl, ff, fx, fy, color=PALETTE["DIM"], line_h=flh, line_gap=4)
