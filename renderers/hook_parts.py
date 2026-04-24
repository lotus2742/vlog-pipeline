#!/usr/bin/env python3
from renderers.common_draw import card, text_center
from renderers.hook_closing_parts import render_hook_closing
from renderers.hook_cover_parts import render_cover_generated_pattern
from utils.render_consts import HOOK_SPLIT_LAYOUT, HOOK_STYLE_ADAPTIVE_THRESHOLDS, PALETTE, SAFE_H, TOKENS, W
from utils.render_text_utils import draw_text_block, fit_text_block, is_redundant_text, is_weak_subtitle, script_key_lines, summarize_script


def choose_hook_style_adaptive(frame):
    explicit = str(frame.get("style", "")).strip().lower()
    if frame.get("_is_first"):
        return "split"
    if explicit == "split":
        return "spotlight"
    if explicit:
        return explicit
    title_len = len(str(frame.get("title", "")).strip())
    script_len = len(str(frame.get("script", "")).strip())
    weak_sub = is_weak_subtitle(str(frame.get("subtitle", "")).strip())
    is_edge = bool(frame.get("_is_first") or frame.get("_is_last"))
    score = {"center": 0, "split": 0, "spotlight": 0}
    if weak_sub:
        score["center"] += 2
        score["split"] -= 1
        score["spotlight"] += 1
    else:
        score["split"] += 2
        score["spotlight"] += 1
    if title_len >= HOOK_STYLE_ADAPTIVE_THRESHOLDS["title_long"] or script_len >= HOOK_STYLE_ADAPTIVE_THRESHOLDS["script_long"]:
        score["split"] += 3
        score["center"] -= 1
    elif title_len <= HOOK_STYLE_ADAPTIVE_THRESHOLDS["title_short"] and script_len <= HOOK_STYLE_ADAPTIVE_THRESHOLDS["script_short"]:
        score["center"] += 2
        score["spotlight"] += 1
    if is_edge:
        score["spotlight"] += 2
        if script_len > HOOK_STYLE_ADAPTIVE_THRESHOLDS["edge_script_long"]:
            score["split"] += 2
    return max(score, key=score.get)


def render_hook_split(draw, img, frame, load_font):
    title = frame.get("title", "")
    subtitle = frame.get("subtitle", "")
    script = frame.get("script", "")
    if frame.get("_is_first"):
        left_x1 = HOOK_SPLIT_LAYOUT["first_left_x1"]
        left_x2 = HOOK_SPLIT_LAYOUT["first_left_x2"]
        right_x1 = HOOK_SPLIT_LAYOUT["first_right_x1"]
        right_x2 = W - HOOK_SPLIT_LAYOUT["first_right_x2_inset"]
        render_cover_generated_pattern(img, right_x1, right_x2, load_font)
        title_lines, t_font, t_lh, title_total_h = fit_text_block(draw, title, left_x2 - left_x1 - HOOK_SPLIT_LAYOUT["first_title_width_pad"], HOOK_SPLIT_LAYOUT["first_title_box_h"], HOOK_SPLIT_LAYOUT["first_title_fonts"], max_lines=3, line_gap=HOOK_SPLIT_LAYOUT["first_title_line_gap"])
        ty = HOOK_SPLIT_LAYOUT["first_title_y"]
        draw_text_block(draw, title_lines, t_font, left_x1 + HOOK_SPLIT_LAYOUT["first_title_x_pad"], ty, color=PALETTE["PURPLE_L"], line_h=t_lh, line_gap=HOOK_SPLIT_LAYOUT["first_title_line_gap"])
        if subtitle:
            s_lines, s_font, s_lh, _ = fit_text_block(draw, subtitle, left_x2 - left_x1 - HOOK_SPLIT_LAYOUT["first_sub_width_pad"], HOOK_SPLIT_LAYOUT["first_sub_box_h"], HOOK_SPLIT_LAYOUT["first_sub_fonts"], max_lines=HOOK_SPLIT_LAYOUT["first_sub_max_lines"], line_gap=HOOK_SPLIT_LAYOUT["first_sub_line_gap"])
            draw_text_block(draw, s_lines, s_font, left_x1 + HOOK_SPLIT_LAYOUT["first_title_x_pad"], ty + title_total_h + HOOK_SPLIT_LAYOUT["first_sub_title_gap"], color=PALETTE["WHITE"], line_h=s_lh, line_gap=HOOK_SPLIT_LAYOUT["first_sub_line_gap"])
        return
    left_x1 = HOOK_SPLIT_LAYOUT["normal_left_x1"]
    left_x2 = HOOK_SPLIT_LAYOUT["normal_left_x2"]
    right_x1 = HOOK_SPLIT_LAYOUT["normal_right_x1"]
    right_x2 = W - HOOK_SPLIT_LAYOUT["normal_right_x2_inset"]
    card(draw, left_x1, 110, left_x2, SAFE_H - 18, fill=(17, 12, 44), outline=PALETTE["PURPLE_L"])
    card(draw, right_x1, 170, right_x2, SAFE_H - 18, fill=(10, 27, 52), outline=PALETTE["CYAN"])
    title_lines, t_font, t_lh, title_total_h = fit_text_block(draw, title, left_x2 - left_x1 - 56, 180, [60, 54, 48, 42], max_lines=3, line_gap=10)
    y = 150
    draw_text_block(draw, title_lines, t_font, left_x1 + 28, y, color=PALETTE["PURPLE_L"], line_h=t_lh, line_gap=10)
    keys = script_key_lines(script, max_lines=4, max_len=44)
    if keys:
        by = max(250, y + title_total_h + 24)
        bullet_max_h = (SAFE_H - 40) - by
        for k in keys:
            if bullet_max_h <= 24:
                break
            lines, b_font, b_lh, _ = fit_text_block(draw, f"• {k}", left_x2 - left_x1 - 56, min(80, bullet_max_h), [22, 20, 18, 16], max_lines=2, line_gap=4, ellipsize=False)
            by = draw_text_block(draw, lines, b_font, left_x1 + 28, by, color=TOKENS["color"]["muted"], line_h=b_lh, line_gap=4) + 10
            bullet_max_h = (SAFE_H - 40) - by
    right_title = "一句话重点" if frame.get("_is_first") else ("行动建议" if frame.get("_is_last") else "本页要点")
    draw.text((right_x1 + 22, 200), right_title, font=load_font(TOKENS["font"]["h2"]), fill=TOKENS["color"]["subtitle"])
    action_text = subtitle if not is_weak_subtitle(subtitle) else (keys[0] if keys else summarize_script(script, 56))
    action_lines, a_font, a_lh, _ = fit_text_block(draw, action_text, right_x2 - right_x1 - 44, 220, [30, 28, 26, 24, 22, 20, 18], max_lines=5, line_gap=8, ellipsize=False)
    draw_text_block(draw, action_lines, a_font, right_x1 + 22, 252, color=TOKENS["color"]["body"], line_h=a_lh, line_gap=8)


def render_hook_spotlight(draw, frame):
    title = frame.get("title", "")
    raw_subtitle = str(frame.get("subtitle", "")).strip()
    script_text = str(frame.get("script", "")).strip()
    subtitle = "；".join(script_key_lines(script_text, max_lines=2, max_len=36)) if is_weak_subtitle(raw_subtitle) else raw_subtitle
    if is_weak_subtitle(raw_subtitle) and not subtitle:
        subtitle = summarize_script(script_text, 64)
    title_lines, title_font, title_h, title_total_h = fit_text_block(draw, title, W - 240, 200, [72, 64, 56, 48], max_lines=3, line_gap=12)
    y = 140
    for ln in title_lines:
        text_center(draw, ln, y, title_font, PALETTE["GOLD"])
        y += title_h + 12
    if subtitle:
        box_y1 = min(max(300, 140 + title_total_h + 28), 430)
        box_y2 = min(SAFE_H - 14, box_y1 + 180)
        card(draw, 160, box_y1, W - 160, box_y2, fill=(20, 16, 40), outline=PALETTE["CYAN"])
        lines, sub_font, sub_h, _ = fit_text_block(draw, subtitle, W - 380, max(80, box_y2 - box_y1 - 30), [30, 28, 26, 24, 22, 20, 18, 16], max_lines=8, line_gap=6, ellipsize=False)
        y = box_y1 + 24
        for ln in lines:
            text_center(draw, ln, y, sub_font, PALETTE["WHITE"])
            y += sub_h + 8
    line_y = min(max(300, 140 + title_total_h + 10), SAFE_H - 90)
    draw.line([(160, line_y), (W - 160, line_y)], fill=PALETTE["CARD_B"], width=2)


def render_hook_center(draw, frame, load_font):
    title = frame.get("title", "")
    raw_subtitle = str(frame.get("subtitle", "")).strip()
    subtitle = raw_subtitle or summarize_script(frame.get("script", ""), 64)
    title_lines, title_font, title_lh, th = fit_text_block(draw, title, W - 140, 240, [72, 64, 58, 52, 46], max_lines=3, line_gap=10)
    sub_lines, sub_font, sub_lh, sub_total_h = fit_text_block(draw, subtitle, W - 140, 150, [56, 48, 42, 36, 32, 28], max_lines=3, line_gap=8) if subtitle else ([], load_font(28), 0, 0)
    title_y = 60 + (SAFE_H - 60 - (th + (28 + sub_total_h if sub_lines else 0))) // 2
    cur_y = title_y
    for i, line in enumerate(title_lines):
        bb = draw.textbbox((0, 0), line, font=title_font)
        lx = (W - (bb[2] - bb[0])) // 2
        draw.text((lx + 3, cur_y + 3), line, font=title_font, fill=(120, 40, 200))
        draw.text((lx, cur_y), line, font=title_font, fill=PALETTE["PURPLE_L"])
        cur_y += title_lh + (10 if i < len(title_lines) - 1 else 0)
    subtitle_y = title_y + th + 28
    if sub_lines:
        sy = subtitle_y
        for ln in sub_lines:
            bb = draw.textbbox((0, 0), ln, font=sub_font)
            x2 = (W - (bb[2] - bb[0])) // 2
            draw.text((x2 + 3, sy + 3), ln, font=sub_font, fill=(80, 20, 180))
            draw.text((x2, sy), ln, font=sub_font, fill=PALETTE["CYAN"])
            sy += sub_lh + 8
    line_y = subtitle_y + sub_total_h + 18
    if line_y < SAFE_H:
        draw.line([(160, line_y), (1120, line_y)], fill=PALETTE["CARD_B"], width=1)
    script_hint = summarize_script(frame.get("script", ""), 120)
    if bool(script_hint) and line_y + 42 < SAFE_H and bool(raw_subtitle) and not is_redundant_text(subtitle, script_hint):
        hint_lines, hint_font, hint_lh, _ = fit_text_block(draw, script_hint, W - 180, SAFE_H - (line_y + 20), [22, 20, 18], max_lines=2, line_gap=6)
        hy = line_y + 16
        for ln in hint_lines:
            text_center(draw, ln, hy, hint_font, PALETTE["DIM"])
            hy += hint_lh + 6
