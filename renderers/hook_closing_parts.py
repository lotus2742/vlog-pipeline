#!/usr/bin/env python3
from renderers.common_draw import text_center
from utils.render_consts import HOOK_CLOSING_DEFAULT_POINTS, PALETTE, SAFE_H, TOKENS, W
from utils.render_glass_utils import apply_glass_panel
from utils.render_text_utils import fit_text_block, script_key_lines


def _normalize_closing_list(raw):
    out = []
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
        elif isinstance(x, dict):
            txt = str(x.get("text", "")).strip()
            if txt:
                out.append(txt)
    return out


def _shorten_closing_point(text: str, max_len: int = 18):
    s = str(text or "").strip()
    if not s:
        return ""
    for sep in ("。", "；", "，", ":", "："):
        idx = s.find(sep)
        if 4 <= idx <= max_len + 6:
            s = s[:idx].strip()
            break
    s = s.strip("。；，,:： ")
    if len(s) > max_len:
        s = s[:max_len].rstrip("。；，,:： ")
    return s


def _build_closing_points(frame):
    custom = _normalize_closing_list(frame.get("list", []))
    if custom:
        pts = []
        for c in custom:
            p = _shorten_closing_point(c, max_len=18)
            if p and p not in pts:
                pts.append(p)
            if len(pts) >= 3:
                break
        if pts:
            return pts
    subtitle = str(frame.get("subtitle", "")).strip()
    script = str(frame.get("script", "")).strip()
    points = script_key_lines(script, max_lines=5, max_len=30)
    points = [_shorten_closing_point(p, max_len=18) for p in points]
    points = [p for p in points if p]
    if len(points) < 2 and subtitle:
        parts = [p.strip(" ，。；;、") for p in subtitle.replace("；", "，").split("，") if p.strip(" ，。；;、")]
        for p in parts:
            sp = _shorten_closing_point(p, max_len=18)
            if sp and sp not in points:
                points.append(sp)
            if len(points) >= 3:
                break
    if not points:
        points = list(HOOK_CLOSING_DEFAULT_POINTS)
    return points[:3]


def render_hook_closing(draw, img, frame, load_font):
    title = str(frame.get("title", "")).strip() or "总结"
    points = _build_closing_points(frame)
    left_footer = str(frame.get("closing_left", "")).strip() or "感谢观看"
    right_footer = str(frame.get("closing_right", "")).strip()
    title_lines, t_font, t_lh, _ = fit_text_block(draw, title, W - 260, 118, [64, 58, 52, 46, 40], max_lines=2, line_gap=8)
    ty = 66
    for ln in title_lines:
        text_center(draw, ln, ty, t_font, TOKENS["color"]["title"])
        ty += t_lh + 8
    top_rule_y = ty + 8
    draw.line([(120, top_rule_y), (W - 120, top_rule_y)], fill=PALETTE["CARD_B"], width=2)
    list_x1, list_x2 = 340, W - 340
    top = top_rule_y + 24
    footer_h = 72
    fy1 = SAFE_H - footer_h
    bottom_reserved = fy1 - 24
    row_gap = 14
    row_count = max(1, len(points))
    row_h = max(72, min(94, (bottom_reserved - top - row_gap * (row_count - 1)) // row_count))

    def _draw_row_icon(cx, cy, idx):
        draw.ellipse([cx - 23, cy - 23, cx + 23, cy + 23], outline=(154, 190, 255), width=2, fill=(240, 246, 255))
        c = (20, 88, 194)
        if idx == 0:
            draw.line([(cx - 8, cy + 1), (cx - 2, cy + 8), (cx + 11, cy - 9)], fill=c, width=3)
        elif idx == 1:
            draw.arc([cx - 9, cy - 13, cx + 9, cy + 4], start=0, end=180, fill=c, width=2)
            draw.line([(cx - 9, cy - 4), (cx - 12, cy - 1)], fill=c, width=2)
            draw.line([(cx + 9, cy - 4), (cx + 12, cy - 1)], fill=c, width=2)
            draw.line([(cx, cy + 4), (cx, cy + 10)], fill=c, width=2)
            draw.line([(cx - 5, cy + 10), (cx + 5, cy + 10)], fill=c, width=2)
        elif idx == 2:
            draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=c, width=2)
            draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=c)
            draw.line([(cx, cy - 11), (cx, cy - 8)], fill=c, width=2)
            draw.line([(cx, cy + 8), (cx, cy + 11)], fill=c, width=2)
            draw.line([(cx - 11, cy), (cx - 8, cy)], fill=c, width=2)
            draw.line([(cx + 8, cy), (cx + 11, cy)], fill=c, width=2)
        else:
            draw.line([(cx - 10, cy + 3), (cx - 2, cy - 4), (cx + 2, cy - 1), (cx + 10, cy - 8)], fill=c, width=2)
            draw.line([(cx - 9, cy + 8), (cx - 1, cy + 1)], fill=c, width=2)

    for i, p in enumerate(points):
        y1 = top + i * (row_h + row_gap)
        y2 = y1 + row_h
        apply_glass_panel(img, draw, list_x1, y1, list_x2, y2, radius=14, blur=10, tint_alpha=0.26, tint_color=(20, 42, 92), outline_color=(140, 186, 255), pad=6)
        bullet_r = 5
        by = y1 + row_h // 2
        draw.ellipse([list_x1 + 18 - bullet_r, by - bullet_r, list_x1 + 18 + bullet_r, by + bullet_r], fill=PALETTE["WHITE"])
        lines, p_font, p_lh, _ = fit_text_block(draw, p, list_x2 - list_x1 - 116, row_h - 12, [34, 30, 28, 26, 24, 22, 20, 18, 16], max_lines=1, line_gap=4)
        text_total_h = len(lines) * p_lh
        py = y1 + (row_h - text_total_h) // 2
        for ln in lines:
            draw.text((list_x1 + 38, py), ln, font=p_font, fill=PALETTE["WHITE"])
            py += p_lh
        _draw_row_icon(list_x2 - 40, by, i)

    apply_glass_panel(img, draw, 0, fy1, W, SAFE_H, radius=0, blur=10, tint_alpha=0.24, tint_color=(18, 36, 86), outline_color=(88, 126, 188), outline_width=0, pad=0)
    tab_x2 = 248

    def _draw_heart(cx, cy, size, color):
        r = max(2, size // 4)
        draw.ellipse([cx - r - r, cy - r, cx - r, cy + r], fill=color)
        draw.ellipse([cx, cy - r, cx + r, cy + r], fill=color)
        draw.polygon([(cx - 2 * r, cy), (cx + 2 * r, cy), (cx, cy + 3 * r)], fill=color)

    if not right_footer:
        lf_lines, lf_font, lf_lh, _ = fit_text_block(draw, left_footer, W - 260, footer_h - 12, [46, 40, 34, 30, 26], max_lines=1, line_gap=0)
        center_text = lf_lines[0] if lf_lines else left_footer
        bb = draw.textbbox((0, 0), center_text, font=lf_font)
        text_w = bb[2] - bb[0]
        heart_size = 22
        gap = 16
        group_w = heart_size + gap + text_w + gap + heart_size
        gx = (W - group_w) // 2
        gy = fy1 + footer_h // 2 - 5
        gold = PALETTE["GOLD"]
        _draw_heart(gx + heart_size // 2, gy, heart_size, gold)
        draw.text((gx + heart_size + gap, fy1 + (footer_h - lf_lh) // 2), center_text, font=lf_font, fill=PALETTE["WHITE"])
        _draw_heart(gx + heart_size + gap + text_w + gap + heart_size // 2, gy, heart_size, gold)
    else:
        lf_lines, lf_font, lf_lh, lf_total_h = fit_text_block(draw, left_footer, tab_x2 - 26, footer_h - 12, [40, 34, 30, 26, 22], max_lines=2, line_gap=2)
        lfy = fy1 + (footer_h - lf_total_h) // 2
        first_line_w = 0
        for ln in lf_lines:
            if first_line_w == 0:
                bb = draw.textbbox((0, 0), ln, font=lf_font)
                first_line_w = bb[2] - bb[0]
            draw.text((28, lfy), ln, font=lf_font, fill=PALETTE["WHITE"])
            lfy += lf_lh + 2
        if first_line_w > 0:
            heart_y = fy1 + footer_h // 2 - 4
            gold = PALETTE["GOLD"]
            _draw_heart(14, heart_y, 20, gold)
            _draw_heart(min(tab_x2 - 12, 28 + first_line_w + 22), heart_y, 20, gold)
    if right_footer:
        draw.line([(286, fy1 + footer_h // 2), (W - 240, fy1 + footer_h // 2)], fill=PALETTE["CARD_B"], width=2)
        rf_lines, rf_font, rf_lh, rf_total_h = fit_text_block(draw, right_footer, 220, footer_h - 12, [40, 34, 30, 26, 22], max_lines=2, line_gap=2)
        rfy = fy1 + (footer_h - rf_total_h) // 2
        for ln in rf_lines:
            rb = draw.textbbox((0, 0), ln, font=rf_font)
            rw = rb[2] - rb[0]
            draw.text((W - 34 - rw, rfy), ln, font=rf_font, fill=TOKENS["color"]["title"])
            rfy += rf_lh + 2
