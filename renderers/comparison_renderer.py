#!/usr/bin/env python3
from renderers.common_draw import card, draw_header_tag, text_center
from utils.render_consts import PALETTE, SAFE_H, W
from utils.render_glass_utils import apply_glass_panel
from utils.render_style_utils import choose_comparison_style
from utils.render_text_utils import draw_text_block, fit_text_block, summarize_script, wrap_text_lines


def _render_comparison_table(draw, img, frame, left, right, lc, rc, load_font):
    top = 110
    label_h = 54
    x1, x2 = 70, W - 70
    mid = (x1 + x2) // 2
    insight = frame.get("insight", "")
    insight_gap = 10
    insight_h = 56 if insight else 0
    table_y2 = SAFE_H - 20 - (insight_h + insight_gap if insight else 0)

    apply_glass_panel(
        img,
        draw,
        x1,
        top,
        x2,
        table_y2,
        radius=14,
        blur=10,
        tint_alpha=0.30,
        tint_color=(18, 18, 44),
        outline_color=PALETTE["CARD_B"],
        pad=6,
    )
    draw.rectangle([x1, top, mid, top + label_h], fill=(18, 40, 30))
    draw.rectangle([mid, top, x2, top + label_h], fill=(42, 22, 22))
    ll = summarize_script(left.get("label", ""), 20)
    rl = summarize_script(right.get("label", ""), 20)
    draw.text((x1 + 20, top + 12), ll, font=load_font(26), fill=lc)
    draw.text((mid + 20, top + 12), rl, font=load_font(26), fill=rc)
    l_points = left.get("points", []) if isinstance(left.get("points", []), list) else []
    r_points = right.get("points", []) if isinstance(right.get("points", []), list) else []
    rows = max(len(l_points), len(r_points), 1)
    row_h = max(52, (table_y2 - (top + label_h)) // rows)
    for i in range(rows):
        ry1 = top + label_h + i * row_h
        ry2 = min(table_y2, ry1 + row_h)
        if i % 2 == 0:
            draw.rectangle([x1 + 1, ry1, x2 - 1, ry2], fill=(20, 16, 36))
        draw.line([(mid, ry1), (mid, ry2)], fill=PALETTE["CARD_B"], width=1)
        ltxt = f"- {l_points[i]}" if i < len(l_points) else "-"
        rtxt = f"- {r_points[i]}" if i < len(r_points) else "-"
        l_lines, l_font, l_lh, _ = fit_text_block(
            draw, ltxt, mid - x1 - 32, row_h - 14, [21, 19, 17, 15], max_lines=2, line_gap=3
        )
        r_lines, r_font, r_lh, _ = fit_text_block(
            draw, rtxt, x2 - mid - 32, row_h - 14, [21, 19, 17, 15], max_lines=2, line_gap=3
        )
        l_total_h = len(l_lines) * l_lh + max(0, len(l_lines) - 1) * 3
        r_total_h = len(r_lines) * r_lh + max(0, len(r_lines) - 1) * 3
        l_text_y = ry1 + max(6, (ry2 - ry1 - l_total_h) // 2)
        r_text_y = ry1 + max(6, (ry2 - ry1 - r_total_h) // 2)
        draw_text_block(
            draw, l_lines, l_font, x1 + 16, l_text_y, color=PALETTE["TEXT_SOFT"], line_h=l_lh, line_gap=3
        )
        draw_text_block(
            draw, r_lines, r_font, mid + 16, r_text_y, color=PALETTE["TEXT_SOFT"], line_h=r_lh, line_gap=3
        )
    if insight:
        draw.rounded_rectangle(
            [x1, table_y2 + insight_gap - 2, x2, table_y2 + insight_gap + insight_h - 6],
            radius=8,
            fill=(30, 24, 52),
            outline=(140, 120, 70),
            width=1,
        )
        ins_lines, ins_font, ins_lh, _ = fit_text_block(
            draw, f"结论：{insight}", x2 - x1 - 24, insight_h - 12, [30, 28, 26, 24, 22], max_lines=2, line_gap=2
        )
        draw_text_block(
            draw,
            ins_lines,
            ins_font,
            x1 + 12,
            table_y2 + insight_gap + 5,
            color=PALETTE["GOLD"],
            line_h=ins_lh,
            line_gap=2,
        )


def _render_comparison_vs(draw, frame, left, right, lc, rc, load_font):
    margin = 60
    vs_half = 30
    mid = W // 2
    f24 = load_font(24)
    pad = 20
    card_width = (mid - vs_half) - margin
    usable_w = max(80, card_width - 56)

    def estimate_side_required_h(data):
        points = data.get("points", [])
        if not points:
            # 只有标题时，给一个紧凑高度，避免大片留白。
            return pad + 36 + 10 + 22 + pad
        # 以较大字号先估算所需行数，再按行高估算卡片总高。
        test_font = load_font(24)
        test_line_h = int(24 * 1.45)
        wrapped = []
        for pt in points:
            wrapped.extend(wrap_text_lines(draw, f"- {pt}", test_font, usable_w))
        return pad + 36 + 10 + 16 + len(wrapped) * test_line_h + pad

    side_required_h = max(estimate_side_required_h(left), estimate_side_required_h(right))
    # 上下留一点呼吸空间；并限制在安全区内。
    card_h = max(120, side_required_h + 8)
    max_h = (SAFE_H - 16) - 72
    card_h = min(card_h, max_h)
    content_top = 72
    content_bot = SAFE_H - 16
    card_y1 = content_top + (content_bot - content_top - card_h) // 2
    card_y2 = card_y1 + card_h

    card(draw, margin, card_y1, mid - vs_half, card_y2, fill=(10, 28, 18), outline=lc)
    card(draw, mid + vs_half, card_y1, W - margin, card_y2, fill=(28, 10, 10), outline=rc)

    f28 = load_font(28)
    bb_vs = draw.textbbox((0, 0), "VS", font=f28)
    vs_x = mid - (bb_vs[2] - bb_vs[0]) // 2
    vs_y = card_y1 + (card_h - (bb_vs[3] - bb_vs[1])) // 2
    draw.text((vs_x, vs_y), "VS", font=f28, fill=PALETTE["DIM"])

    def prepare_side_layout(data, cw, usable_h):
        points = data.get("points", [])
        if not points:
            return {
                "font": load_font(18),
                "line_h": int(18 * 1.25),
                "lines": [],
                "content_h": 0,
            }
        usable_w_local = max(80, cw - 56)
        for fs in [26, 24, 22, 20, 18, 16, 14, 12]:
            font = load_font(fs)
            line_h = int(fs * 1.45)
            wrapped = []
            for pt in points:
                wrapped.extend(wrap_text_lines(draw, f"- {pt}", font, usable_w_local))
            if wrapped and len(wrapped) * line_h <= usable_h:
                return {
                    "font": font,
                    "line_h": line_h,
                    "lines": wrapped,
                    "content_h": len(wrapped) * line_h,
                }
        font = load_font(12)
        line_h = max(12, int(12 * 1.15))
        wrapped = []
        for pt in points:
            wrapped.extend(wrap_text_lines(draw, f"- {pt}", font, usable_w_local))
        return {
            "font": font,
            "line_h": line_h,
            "lines": wrapped,
            "content_h": len(wrapped) * line_h,
        }

    def draw_side(data, cx_base, cx_end, color, align_mode="top"):
        cw = cx_end - cx_base
        label = summarize_script(data.get("label", ""), 16)
        bb = draw.textbbox((0, 0), label, font=f24)
        lx = cx_base + (cw - (bb[2] - bb[0])) // 2
        draw.text((lx, card_y1 + pad), label, font=f24, fill=color)
        sep_y = card_y1 + pad + 36 + 10
        draw.line([(cx_base + 20, sep_y), (cx_end - 20, sep_y)], fill=color, width=1)
        usable_h = max(0, card_y2 - (sep_y + 16) - pad)
        side_layout = prepare_side_layout(data, cw, usable_h)
        draw_lines = side_layout["lines"]
        if not draw_lines:
            return side_layout["content_h"]

        py = sep_y + 16
        if align_mode == "center":
            extra = max(0, usable_h - side_layout["content_h"])
            py += extra // 2
        for i, line in enumerate(draw_lines):
            y = py + i * side_layout["line_h"]
            if y + side_layout["line_h"] > card_y2 - pad:
                break
            draw.text((cx_base + 28, y), line, font=side_layout["font"], fill=PALETTE["WHITE"])
        return side_layout["content_h"]

    usable_h_global = max(0, card_y2 - (card_y1 + pad + 36 + 10 + 16) - pad)
    left_h = prepare_side_layout(left, (mid - vs_half) - margin, usable_h_global)["content_h"]
    right_h = prepare_side_layout(right, (W - margin) - (mid + vs_half), usable_h_global)["content_h"]

    # 自动垂直对齐：当左右内容高度差明显时，把较短的一侧垂直居中，减少“下方空白”感。
    align_mode_left = "top"
    align_mode_right = "top"
    if abs(left_h - right_h) > 36:
        if left_h < right_h:
            align_mode_left = "center"
        else:
            align_mode_right = "center"

    draw_side(left, margin, mid - vs_half, lc, align_mode=align_mode_left)
    draw_side(right, mid + vs_half, W - margin, rc, align_mode=align_mode_right)

    insight = frame.get("insight", "")
    if insight:
        card(draw, 100, SAFE_H - 50, W - 100, SAFE_H - 5, fill=(18, 12, 30), outline=PALETTE["GOLD"])
        f18i = load_font(18)
        text_center(draw, insight, SAFE_H - 40, f18i, PALETTE["GOLD"])


def render_comparison(draw, img, frame, load_font, col):
    style = choose_comparison_style(frame)
    draw_header_tag(
        draw,
        frame.get("title", ""),
        frame.get("subtitle", ""),
        load_font=load_font,
        tag_color=PALETTE["GOLD"],
        subtitle_color=PALETTE["DIM"],
    )
    left = frame.get("left", {})
    right = frame.get("right", {})
    lc = col(left.get("color", "GREEN"))
    rc = col(right.get("color", "RED"))
    if style == "table":
        _render_comparison_table(draw, img, frame, left, right, lc, rc, load_font)
        return
    _render_comparison_vs(draw, frame, left, right, lc, rc, load_font)
