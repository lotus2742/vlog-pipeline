#!/usr/bin/env python3
from renderers.common_draw import card, draw_header_tag
from utils.render_consts import CARD_ACCENT_COLORS, PALETTE, SAFE_H, W
from utils.render_glass_utils import apply_glass_panel
from utils.render_text_utils import draw_text_block, fit_text_block, wrap_text_lines


def _cards_row_counts(n):
    if n == 1:
        return [1]
    if n == 2:
        return [2]
    if n == 3:
        return [3]
    if n == 4:
        return [2, 2]
    if n == 5:
        return [2, 3]
    rows = (n + 2) // 3
    base = n // rows
    rem = n % rows
    return [base + (1 if i < rem else 0) for i in range(rows)]


def _estimate_card_text_lines(draw, cards, load_font, text_w):
    total = 0
    font = load_font(20)
    for c in cards:
        title = c.get("title") or c.get("label", "")
        desc = c.get("desc", "")
        total += max(1, len(wrap_text_lines(draw, title, font, text_w)))
        if desc:
            total += len(wrap_text_lines(draw, desc, font, text_w))
    return total


def _choose_cards_style_adaptive(draw, frame, cards, load_font):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit:
        return explicit

    n = len(cards) or 1
    text_lines = _estimate_card_text_lines(draw, cards, load_font, text_w=W - 220)
    score = {"stack": 0, "grid": 0, "timeline": 0}

    # 短文案优先 stack，避免 timeline/大网格出现大片留白。
    if text_lines <= n * 3:
        score["stack"] += 3
        score["grid"] += 1
    else:
        # 长文案仍以 grid 为主；timeline 仅弱备选（间距在 _render_cards_grid 里再细调）。
        score["grid"] += 2
        score["timeline"] += 1

    if n >= 4:
        score["grid"] += 4
    elif n == 3:
        score["grid"] += 1

    if n <= 2:
        score["stack"] += 2
        score["timeline"] -= 1

    if text_lines <= n * 2:
        score["stack"] += 2

    return max(score, key=score.get)


def choose_cards_style_adaptive(draw, frame, load_font):
    """与渲染路径一致的自适应选型，供日志/调试使用。"""
    return _choose_cards_style_adaptive(draw, frame, frame.get("cards", []), load_font)


def _render_cards_grid(draw, img, cards, col, load_font, *, fixed_metrics=False):
    n = len(cards)
    row_counts = _cards_row_counts(n)
    rows = len(row_counts)
    # 根据内容密度动态调整卡片高度与间距；显式 style:grid 用固定度量，便于与自适应对照。
    text_lines = _estimate_card_text_lines(draw, cards, load_font, text_w=280)
    desc_total = sum(len(str(c.get("desc", "") or "")) for c in cards if isinstance(c, dict))
    compact = text_lines <= n * 3
    dense = text_lines >= n * 5 or desc_total >= 200

    if fixed_metrics:
        top = 100
        gap_x, gap_y = 16, 18
        min_h, max_h = 118, 182
    elif compact:
        top = 120
        gap_x, gap_y = 14, 14
        min_h, max_h = 92, 148
    elif dense:
        top = 86
        gap_x, gap_y = 15, 11
        min_h, max_h = 126, 190
    else:
        top = 95
        gap_x, gap_y = 16, 16
        min_h, max_h = 120, 180

    x1, x2 = 60, W - 60
    y2_lim = SAFE_H - 20
    ch = max(min_h, (y2_lim - top - gap_y * (rows - 1)) // max(1, rows))
    ch = min(ch, max_h)
    colors = CARD_ACCENT_COLORS
    i = 0
    for r, count in enumerate(row_counts):
        row_w = (x2 - x1) - gap_x * (count - 1)
        cw = row_w // count
        used_w = cw * count + gap_x * (count - 1)
        start_x = x1 + max(0, ((x2 - x1) - used_w) // 2)
        cy = top + r * (ch + gap_y)
        for c in range(count):
            if i >= n:
                break
            c_data = cards[i]
            cx = start_x + c * (cw + gap_x)
            c_color = col(c_data.get("color", colors[i % len(colors)]))
            apply_glass_panel(
                img,
                draw,
                cx,
                cy,
                cx + cw,
                cy + ch,
                radius=12,
                blur=9,
                tint_alpha=0.24,
                outline_color=c_color,
            )
            draw.rectangle([cx, cy, cx + cw, cy + 8], fill=c_color)
            card_title = c_data.get("title") or c_data.get("label", "")
            desc = c_data.get("desc", "")
            title_lines, title_font, title_lh, _ = fit_text_block(
                draw, card_title, cw - 32, 62, [30, 28, 26, 24, 22], max_lines=2, line_gap=4
            )
            yy = cy + 16
            yy = draw_text_block(
                draw, title_lines, title_font, cx + 16, yy, color=PALETTE["WHITE"], line_h=title_lh, line_gap=4
            )
            desc_h_avail = max(36, ch - (yy - cy) - 18)
            desc_lines, desc_font, desc_lh, _ = fit_text_block(
                draw, desc, cw - 32, desc_h_avail, [22, 20, 18, 16], max_lines=4, line_gap=5
            )
            draw_text_block(
                draw, desc_lines, desc_font, cx + 16, yy + 4, color=PALETTE["TEXT_SOFT"], line_h=desc_lh, line_gap=5
            )
            i += 1


def _render_cards_timeline(draw, cards, col, load_font):
    n = len(cards)
    line_x = 120
    draw.line([(line_x, 110), (line_x, SAFE_H - 26)], fill=PALETTE["CYAN"], width=3)
    text_lines = _estimate_card_text_lines(draw, cards, load_font, text_w=W - 290)
    compact = text_lines <= n * 3
    top, gap = (122, 10) if compact else (105, 12)
    min_h = 74 if compact else 88
    ch = max(min_h, (SAFE_H - 140 - gap * (n - 1)) // n)
    colors = CARD_ACCENT_COLORS
    for i, c_data in enumerate(cards):
        cy = top + i * (ch + gap)
        c_color = col(c_data.get("color", colors[i % len(colors)]))
        draw.ellipse([line_x - 10, cy + 16, line_x + 10, cy + 36], fill=c_color, outline=PALETTE["WHITE"], width=1)
        card(draw, 160, cy, W - 60, cy + ch, fill=PALETTE["CARD"], outline=c_color)
        card_title = c_data.get("title") or c_data.get("label", "")
        desc = c_data.get("desc", "")
        title_lines, title_font, title_lh, _ = fit_text_block(
            draw, card_title, W - 270, 42, [28, 26, 24, 22], max_lines=1, line_gap=0
        )
        y2 = cy + 10
        draw_text_block(
            draw, title_lines, title_font, 182, y2, color=PALETTE["WHITE"], line_h=title_lh, line_gap=0
        )
        desc_h = max(26, ch - 52)
        lines, desc_font, desc_lh, _ = fit_text_block(
            draw, desc, W - 270, desc_h, [20, 18, 16], max_lines=2, line_gap=4
        )
        draw_text_block(
            draw, lines, desc_font, 182, cy + 44, color=PALETTE["TEXT_SOFT"], line_h=desc_lh, line_gap=4
        )


def _render_cards_stack(draw, cards, col, load_font):
    n = len(cards)
    text_lines = _estimate_card_text_lines(draw, cards, load_font, text_w=W - 220)
    compact = text_lines <= n * 3
    content_top = 95 if compact else 72
    content_bot = SAFE_H - 16
    gap = 10 if compact else 14
    avail_h = content_bot - content_top
    card_h_fill = (avail_h - gap * (n - 1)) // n
    min_h = 78 if compact else 92
    max_h = 110 if compact else 128
    card_h = max(min_h, min(card_h_fill, max_h))
    total_cards_h = n * card_h + (n - 1) * gap
    start_y = content_top + (avail_h - total_cards_h) // 2

    colors = CARD_ACCENT_COLORS
    for i, c_data in enumerate(cards):
        c_color = col(c_data.get("color", colors[i % len(colors)]))
        cy = start_y + i * (card_h + gap)
        card(draw, 60, cy, W - 60, cy + card_h, fill=PALETTE["CARD"], outline=c_color)
        draw.rectangle([60, cy, 67, cy + card_h], fill=c_color)

        card_title = c_data.get("title") or c_data.get("label", "")
        desc = c_data.get("desc", "")
        text_x = 90
        padding = 20
        title_lines, title_font, title_lh, _ = fit_text_block(
            draw, card_title, W - 180, 44, [36, 34, 30, 28, 24], max_lines=1, line_gap=0
        )
        draw_text_block(
            draw, title_lines, title_font, text_x, cy + padding, color=PALETTE["WHITE"], line_h=title_lh, line_gap=0
        )
        if desc:
            desc_h = max(20, card_h - 66)
            desc_lines, desc_font, desc_lh, _ = fit_text_block(
                draw, desc, W - 180, desc_h, [22, 20, 18, 16], max_lines=2, line_gap=4
            )
            draw_text_block(
                draw, desc_lines, desc_font, text_x, cy + padding + 40, color=PALETTE["TEXT_SOFT"], line_h=desc_lh, line_gap=4
            )


def render_cards(draw, img, frame, load_font, col):
    # 优先内容驱动选布局；显式 style 仍可覆盖。
    cards = frame.get("cards", [])
    explicit_style = str(frame.get("style", "")).strip().lower()
    style = _choose_cards_style_adaptive(draw, frame, cards, load_font)
    draw_header_tag(
        draw,
        frame.get("title", ""),
        frame.get("subtitle", ""),
        load_font=load_font,
        tag_color=PALETTE["CYAN"],
        subtitle_color=PALETTE["DIM"],
    )
    if not cards:
        return
    if style == "grid":
        fixed_grid = explicit_style == "grid"
        _render_cards_grid(draw, img, cards, col, load_font, fixed_metrics=fixed_grid)
        return
    if style == "timeline":
        _render_cards_timeline(draw, cards, col, load_font)
        return
    _render_cards_stack(draw, cards, col, load_font)
