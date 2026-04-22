#!/usr/bin/env python3
from renderers.common_draw import card, tag, text_center
from utils.render_consts import PALETTE, SAFE_H, TOKENS, W
from utils.render_text_utils import (
    draw_text_block,
    fit_text_block,
    is_redundant_text,
    is_weak_subtitle,
    script_key_lines,
    summarize_script,
)


def choose_hook_style_adaptive(frame):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit:
        return explicit

    # 基于内容密度打分，替代纯阈值判断，减少固定模板僵化。
    title_len = len(str(frame.get("title", "")).strip())
    script_len = len(str(frame.get("script", "")).strip())
    subtitle = str(frame.get("subtitle", "")).strip()
    weak_sub = is_weak_subtitle(subtitle)
    is_edge = bool(frame.get("_is_first") or frame.get("_is_last"))

    score = {"center": 0, "split": 0, "spotlight": 0}
    if weak_sub:
        score["center"] += 2
        score["split"] -= 1
        score["spotlight"] += 1
    else:
        score["split"] += 2
        score["spotlight"] += 1

    if title_len >= 18 or script_len >= 120:
        score["split"] += 3
        score["center"] -= 1
    elif title_len <= 10 and script_len <= 70:
        score["center"] += 2
        score["spotlight"] += 1

    if is_edge:
        score["spotlight"] += 2
        if script_len > 100:
            score["split"] += 2

    return max(score, key=score.get)


def _render_hook_split(draw, frame, load_font):
    title = frame.get("title", "")
    subtitle = frame.get("subtitle", "")
    script = frame.get("script", "")
    left_x1, left_x2 = 70, 810
    right_x1, right_x2 = 840, W - 70
    card(draw, left_x1, 110, left_x2, SAFE_H - 18, fill=(17, 12, 44), outline=PALETTE["PURPLE_L"])
    card(draw, right_x1, 170, right_x2, SAFE_H - 18, fill=(10, 27, 52), outline=PALETTE["CYAN"])

    title_lines, t_font, t_lh, title_total_h = fit_text_block(
        draw, title, left_x2 - left_x1 - 56, 180, [60, 54, 48, 42], max_lines=3, line_gap=10
    )
    y = 150
    draw_text_block(draw, title_lines, t_font, left_x1 + 28, y, color=PALETTE["PURPLE_L"], line_h=t_lh, line_gap=10)

    keys = script_key_lines(script, max_lines=4, max_len=44)
    if keys:
        # 按标题真实高度推导要点起始位，避免标题短时下方大留白。
        by = max(250, y + title_total_h + 24)
        bullet_max_h = (SAFE_H - 40) - by
        for k in keys:
            line = f"• {k}"
            if bullet_max_h <= 24:
                break
            lines, b_font, b_lh, _ = fit_text_block(
                draw,
                line,
                left_x2 - left_x1 - 56,
                min(80, bullet_max_h),
                [22, 20, 18, 16],
                max_lines=2,
                line_gap=4,
                ellipsize=False,
            )
            by = draw_text_block(
                draw, lines, b_font, left_x1 + 28, by, color=TOKENS["color"]["muted"], line_h=b_lh, line_gap=4
            ) + 10
            bullet_max_h = (SAFE_H - 40) - by

    right_title = "一句话重点" if frame.get("_is_first") else ("行动建议" if frame.get("_is_last") else "本页要点")
    draw.text((right_x1 + 22, 200), right_title, font=load_font(TOKENS["font"]["h2"]), fill=TOKENS["color"]["subtitle"])
    action_text = subtitle
    if is_weak_subtitle(action_text):
        action_text = keys[0] if keys else summarize_script(script, 56)
    action_lines, a_font, a_lh, _ = fit_text_block(
        draw,
        action_text,
        right_x2 - right_x1 - 44,
        220,
        [30, 28, 26, 24, 22, 20, 18],
        max_lines=5,
        line_gap=8,
        ellipsize=False,
    )
    draw_text_block(
        draw, action_lines, a_font, right_x1 + 22, 252, color=TOKENS["color"]["body"], line_h=a_lh, line_gap=8
    )


def _render_hook_spotlight(draw, frame):
    title = frame.get("title", "")
    raw_subtitle = str(frame.get("subtitle", "")).strip()
    script_text = str(frame.get("script", "")).strip()
    if is_weak_subtitle(raw_subtitle):
        key_lines = script_key_lines(script_text, max_lines=2, max_len=36)
        subtitle = "；".join(key_lines) if key_lines else summarize_script(script_text, 64)
    else:
        subtitle = raw_subtitle
    title_lines, title_font, title_h, title_total_h = fit_text_block(
        draw, title, W - 240, 200, [72, 64, 56, 48], max_lines=3, line_gap=12
    )
    y = 140
    for ln in title_lines:
        text_center(draw, ln, y, title_font, PALETTE["GOLD"])
        y += title_h + 12
    if subtitle:
        # 根据标题占用高度动态计算副标题卡片区域，减少空白和挤压。
        box_y1 = min(max(300, 140 + title_total_h + 28), 430)
        box_y2 = min(SAFE_H - 14, box_y1 + 180)
        card(draw, 160, box_y1, W - 160, box_y2, fill=(20, 16, 40), outline=PALETTE["CYAN"])
        lines, sub_font, sub_h, _ = fit_text_block(
            draw,
            subtitle,
            W - 380,
            max(80, box_y2 - box_y1 - 30),
            [30, 28, 26, 24, 22, 20, 18, 16],
            max_lines=8,
            line_gap=6,
            ellipsize=False,
        )
        y = box_y1 + 24
        for ln in lines:
            text_center(draw, ln, y, sub_font, PALETTE["WHITE"])
            y += sub_h + 8
    line_y = min(max(300, 140 + title_total_h + 10), SAFE_H - 90)
    draw.line([(160, line_y), (W - 160, line_y)], fill=PALETTE["CARD_B"], width=2)


def _render_hook_center(draw, frame, load_font):
    title = frame.get("title", "")
    raw_subtitle = str(frame.get("subtitle", "")).strip()
    subtitle = raw_subtitle or summarize_script(frame.get("script", ""), 64)
    gap = 28
    line_spacing = 10
    decor_gap = 18

    title_lines, title_font, title_lh, th = fit_text_block(
        draw, title, W - 140, 240, [72, 64, 58, 52, 46], max_lines=3, line_gap=line_spacing
    )
    sub_lines, sub_font, sub_lh, sub_total_h = fit_text_block(
        draw, subtitle, W - 140, 150, [56, 48, 42, 36, 32, 28], max_lines=3, line_gap=8
    ) if subtitle else ([], load_font(28), 0, 0)

    total_h = th + (gap + sub_total_h if sub_lines else 0)
    avail_top = 60
    avail_bot = SAFE_H
    title_y = avail_top + (avail_bot - avail_top - total_h) // 2

    cur_y = title_y
    for i, line in enumerate(title_lines):
        bb = draw.textbbox((0, 0), line, font=title_font)
        lw = bb[2] - bb[0]
        lx = (W - lw) // 2
        draw.text((lx + 3, cur_y + 3), line, font=title_font, fill=(120, 40, 200))
        draw.text((lx, cur_y), line, font=title_font, fill=PALETTE["PURPLE_L"])
        cur_y += title_lh + (line_spacing if i < len(title_lines) - 1 else 0)

    subtitle_y = title_y + th + gap
    if sub_lines:
        sy = subtitle_y
        for ln in sub_lines:
            bb = draw.textbbox((0, 0), ln, font=sub_font)
            sw = bb[2] - bb[0]
            x2 = (W - sw) // 2
            draw.text((x2 + 3, sy + 3), ln, font=sub_font, fill=(80, 20, 180))
            draw.text((x2, sy), ln, font=sub_font, fill=PALETTE["CYAN"])
            sy += sub_lh + 8

    line_y = subtitle_y + sub_total_h + decor_gap
    if line_y < SAFE_H:
        draw.line([(160, line_y), (1120, line_y)], fill=PALETTE["CARD_B"], width=1)
    script_hint = summarize_script(frame.get("script", ""), 120)
    should_draw_hint = bool(script_hint) and line_y + 42 < SAFE_H
    if not raw_subtitle:
        should_draw_hint = False
    elif is_redundant_text(subtitle, script_hint):
        should_draw_hint = False

    if should_draw_hint:
        hint_lines, hint_font, hint_lh, _ = fit_text_block(
            draw, script_hint, W - 180, SAFE_H - (line_y + 20), [22, 20, 18], max_lines=2, line_gap=6
        )
        hy = line_y + 16
        for ln in hint_lines:
            text_center(draw, ln, hy, hint_font, PALETTE["DIM"])
            hy += hint_lh + 6


def render_hook(draw, img, frame, load_font):
    # 优先使用内容驱动选型；若后续需要回滚，可切回 choose_hook_style。
    style = choose_hook_style_adaptive(frame)
    f14 = load_font(14)
    tags = list(frame.get("tags", []))
    if not tags:
        if frame.get("_is_first"):
            tags = ["开场", "先说结论"]
        elif frame.get("_is_last"):
            tags = ["收尾", "行动建议"]
    tx = 40
    for t in tags:
        tx += tag(draw, tx, 28, t, f14) + 12

    if style == "split":
        _render_hook_split(draw, frame, load_font)
        return
    if style == "spotlight":
        _render_hook_spotlight(draw, frame)
        return
    _render_hook_center(draw, frame, load_font)
