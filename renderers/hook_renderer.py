#!/usr/bin/env python3
from renderers.common_draw import card, tag, text_center
from utils.render_consts import PALETTE, SAFE_H, TOKENS, W
from utils.render_glass_utils import apply_glass_panel
from utils.render_text_utils import (
    draw_text_block,
    fit_text_block,
    is_redundant_text,
    is_weak_subtitle,
    script_key_lines,
    summarize_script,
)
from PIL import Image, ImageDraw


def _build_closing_points(frame):
    subtitle = str(frame.get("subtitle", "")).strip()
    script = str(frame.get("script", "")).strip()
    points = script_key_lines(script, max_lines=4, max_len=18)
    if len(points) < 3 and subtitle:
        parts = [p.strip(" ，。；;、") for p in subtitle.replace("；", "，").split("，") if p.strip(" ，。；;、")]
        for p in parts:
            if p not in points:
                points.append(p)
            if len(points) >= 4:
                break
    if not points:
        points = ["目标达成情况", "关键成果展示", "问题与改进", "下一步计划"]
    return points[:4]


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


def _pick_cover_illustration(frame):
    text = (
        f"{frame.get('title', '')} {frame.get('subtitle', '')} {frame.get('script', '')}"
    ).lower()
    keyword_map = {
        "trend": ("增长", "趋势", "数据", "指标", "转化", "留存"),
        "flow": ("流程", "步骤", "执行", "协作", "推进", "上线"),
        "stack": ("架构", "系统", "文档", "技术", "模块", "平台"),
    }
    for name, kws in keyword_map.items():
        if any(k in text for k in kws):
            return name

    # 无明显关键词时做稳定轮换（同文案同模板，避免每次随机抖动）。
    seed_text = str(frame.get("title", "")) + str(frame.get("script", ""))
    idx = sum(ord(ch) for ch in seed_text) % 3
    return ("trend", "flow", "stack")[idx]


def _render_cover_illustration(img, frame, right_x1, right_x2, load_font):
    style = _pick_cover_illustration(frame)
    overlay = Image.new("RGBA", (W, SAFE_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    # 透明度上调（更“背景化”）：低 alpha + 低对比边框。
    fill_back = (38, 70, 130, 42)
    fill_mid = (56, 98, 168, 48)
    fill_front = (76, 124, 198, 54)
    line_soft = (138, 182, 255, 60)
    line_dim = (96, 128, 198, 50)
    accent = (100, 220, 255, 96)
    accent_dot = (255, 209, 0, 104)

    cx1, cy1, cx2, cy2 = right_x1 + 36, 192, right_x2 - 36, SAFE_H - 70
    od.rounded_rectangle([cx1 + 34, cy1 + 18, cx2 - 8, cy2 + 10], radius=12, fill=fill_back, outline=line_dim, width=1)
    od.rounded_rectangle([cx1 + 14, cy1, cx2 - 28, cy2 - 8], radius=12, fill=fill_mid, outline=line_soft, width=1)
    od.rounded_rectangle([cx1, cy1 + 24, cx2 - 44, cy2 + 18], radius=12, fill=fill_front, outline=line_dim, width=1)

    if style == "trend":
        chart_x1, chart_y1 = cx1 + 22, cy1 + 86
        chart_x2, chart_y2 = cx2 - 88, cy2 - 26
        od.rectangle([chart_x1, chart_y1, chart_x2, chart_y2], outline=line_soft, width=1)
        for i in range(4):
            gy = chart_y1 + (chart_y2 - chart_y1) * i // 3
            od.line([(chart_x1 + 8, gy), (chart_x2 - 8, gy)], fill=line_dim, width=1)
        pts = [
            (chart_x1 + 12, chart_y2 - 18),
            (chart_x1 + 56, chart_y2 - 36),
            (chart_x1 + 94, chart_y2 - 32),
            (chart_x1 + 142, chart_y2 - 72),
            (chart_x1 + 186, chart_y2 - 112),
        ]
        od.line(pts, fill=accent, width=3)
        ex, ey = pts[-1]
        od.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=accent_dot)
    elif style == "flow":
        # 电脑外形
        lx1, ly1, lx2, ly2 = cx1 + 24, cy1 + 76, cx2 - 72, cy2 - 24
        od.rounded_rectangle([lx1, ly1, lx2, ly2], radius=12, fill=(68, 110, 184, 92), outline=line_soft, width=1)
        sx1, sy1, sx2, sy2 = lx1 + 16, ly1 + 18, lx2 - 16, ly2 - 28
        od.rectangle([sx1, sy1, sx2, sy2], outline=line_soft, width=1)
        # 底座
        bx1, by1, bx2, by2 = lx1 + 42, ly2 - 10, lx2 - 42, ly2 + 12
        od.rounded_rectangle([bx1, by1, bx2, by2], radius=6, fill=(70, 106, 168, 86), outline=line_dim, width=1)
        # 屏幕内流程节点
        nx = [sx1 + 12, sx1 + 82, sx1 + 152, sx1 + 222]
        ny = [sy1 + 24, sy1 + 56, sy1 + 36, sy1 + 70]
        for i in range(4):
            od.rounded_rectangle([nx[i], ny[i], nx[i] + 56, ny[i] + 30], radius=7, fill=(76, 122, 198, 106), outline=line_soft, width=1)
            if i < 3:
                od.line([(nx[i] + 56, ny[i] + 15), (nx[i + 1], ny[i + 1] + 15)], fill=accent, width=2)
        od.ellipse([nx[-1] + 46, ny[-1] + 8, nx[-1] + 62, ny[-1] + 24], fill=accent_dot)
    else:  # stack / 架构
        # 电脑外形
        lx1, ly1, lx2, ly2 = cx1 + 24, cy1 + 76, cx2 - 72, cy2 - 24
        od.rounded_rectangle([lx1, ly1, lx2, ly2], radius=12, fill=(68, 110, 184, 92), outline=line_soft, width=1)
        sx1, sy1, sx2, sy2 = lx1 + 16, ly1 + 18, lx2 - 16, ly2 - 28
        od.rectangle([sx1, sy1, sx2, sy2], outline=line_soft, width=1)
        bx1, by1, bx2, by2 = lx1 + 42, ly2 - 10, lx2 - 42, ly2 + 12
        od.rounded_rectangle([bx1, by1, bx2, by2], radius=6, fill=(70, 106, 168, 86), outline=line_dim, width=1)
        # 屏幕内模块架构图
        a = (sx1 + 20, sy1 + 26, sx1 + 108, sy1 + 66)
        b = (sx1 + 20, sy1 + 92, sx1 + 108, sy1 + 132)
        c = (sx1 + 152, sy1 + 60, sx1 + 244, sy1 + 100)
        for box in (a, b, c):
            od.rounded_rectangle(box, radius=8, fill=(76, 122, 198, 106), outline=line_soft, width=1)
        # 连线
        od.line([(a[2], (a[1] + a[3]) // 2), (c[0], (c[1] + c[3]) // 2)], fill=accent, width=2)
        od.line([(b[2], (b[1] + b[3]) // 2), (c[0], (c[1] + c[3]) // 2)], fill=accent, width=2)
        od.ellipse([c[2] - 10, (c[1] + c[3]) // 2 - 4, c[2] - 2, (c[1] + c[3]) // 2 + 4], fill=accent_dot)

    od.rounded_rectangle([right_x1 + 18, 164, right_x1 + 86, 230], radius=10, fill=(52, 94, 166, 48), outline=line_soft, width=1)
    od.text((right_x1 + 44, 186), "*", font=load_font(22), fill=accent)

    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(overlay)
    img.paste(img_rgba.convert("RGB"))


def _render_hook_split(draw, img, frame, load_font):
    title = frame.get("title", "")
    subtitle = frame.get("subtitle", "")
    script = frame.get("script", "")

    # 首帧封面模式：左文案精简 + 右侧插画区，避免开场信息过载。
    if frame.get("_is_first"):
        left_x1, left_x2 = 70, 760
        right_x1, right_x2 = 800, W - 70

        title_lines, t_font, t_lh, _ = fit_text_block(
            draw, title, left_x2 - left_x1 - 72, 220, [72, 66, 58, 52, 46], max_lines=3, line_gap=10
        )
        ty = 220
        draw_text_block(
            draw, title_lines, t_font, left_x1 + 36, ty, color=PALETTE["PURPLE_L"], line_h=t_lh, line_gap=10
        )
        if subtitle:
            s_lines, s_font, s_lh, _ = fit_text_block(
                draw, subtitle, left_x2 - left_x1 - 72, 96, [34, 30, 28, 24], max_lines=2, line_gap=8
            )
            draw_text_block(
                draw,
                s_lines,
                s_font,
                left_x1 + 36,
                ty + 180,
                color=PALETTE["WHITE"],
                line_h=s_lh,
                line_gap=8,
            )

        # 右侧“封面插画”占位：多层文档 + 图表图块，强调视觉记忆点。
        _render_cover_illustration(img, frame, right_x1, right_x2, load_font)
        return

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


def _render_hook_closing(draw, img, frame, load_font):
    """收尾页专用排版：标题 + 中部总结条目 + 底部感谢区。"""
    title = str(frame.get("title", "")).strip() or "总结"
    points = _build_closing_points(frame)
    left_footer = str(frame.get("closing_left", "")).strip() or "感谢观看"
    right_footer = str(frame.get("closing_right", "")).strip() or "下一步执行"

    title_lines, t_font, t_lh, _ = fit_text_block(
        draw, title, W - 260, 118, [64, 58, 52, 46, 40], max_lines=2, line_gap=8
    )
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
    row_h = max(60, min(86, (bottom_reserved - top - row_gap * (row_count - 1)) // row_count))

    def _draw_row_icon(cx, cy, idx):
        draw.ellipse([cx - 23, cy - 23, cx + 23, cy + 23], outline=(154, 190, 255), width=2, fill=(240, 246, 255))
        c = (20, 88, 194)
        if idx == 0:  # 对勾
            draw.line([(cx - 8, cy + 1), (cx - 2, cy + 8), (cx + 11, cy - 9)], fill=c, width=3)
        elif idx == 1:  # 奖杯简笔
            draw.arc([cx - 9, cy - 13, cx + 9, cy + 4], start=0, end=180, fill=c, width=2)
            draw.line([(cx - 9, cy - 4), (cx - 12, cy - 1)], fill=c, width=2)
            draw.line([(cx + 9, cy - 4), (cx + 12, cy - 1)], fill=c, width=2)
            draw.line([(cx, cy + 4), (cx, cy + 10)], fill=c, width=2)
            draw.line([(cx - 5, cy + 10), (cx + 5, cy + 10)], fill=c, width=2)
        elif idx == 2:  # 齿轮简化
            draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=c, width=2)
            draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=c)
            draw.line([(cx, cy - 11), (cx, cy - 8)], fill=c, width=2)
            draw.line([(cx, cy + 8), (cx, cy + 11)], fill=c, width=2)
            draw.line([(cx - 11, cy), (cx - 8, cy)], fill=c, width=2)
            draw.line([(cx + 8, cy), (cx + 11, cy)], fill=c, width=2)
        else:  # 握手简化
            draw.line([(cx - 10, cy + 3), (cx - 2, cy - 4), (cx + 2, cy - 1), (cx + 10, cy - 8)], fill=c, width=2)
            draw.line([(cx - 9, cy + 8), (cx - 1, cy + 1)], fill=c, width=2)

    for i, p in enumerate(points):
        y1 = top + i * (row_h + row_gap)
        y2 = y1 + row_h
        apply_glass_panel(
            img,
            draw,
            list_x1,
            y1,
            list_x2,
            y2,
            radius=14,
            blur=10,
            tint_alpha=0.26,
            tint_color=(20, 42, 92),
            outline_color=(140, 186, 255),
            pad=6,
        )

        bullet_r = 5
        by = y1 + row_h // 2
        draw.ellipse([list_x1 + 18 - bullet_r, by - bullet_r, list_x1 + 18 + bullet_r, by + bullet_r], fill=PALETTE["WHITE"])

        lines, p_font, p_lh, _ = fit_text_block(
            draw,
            p,
            list_x2 - list_x1 - 116,
            row_h - 16,
            [40, 36, 32, 28, 24, 22],
            max_lines=2,
            line_gap=4,
        )
        text_total_h = len(lines) * p_lh + max(0, len(lines) - 1) * 4
        py = y1 + (row_h - text_total_h) // 2
        for ln in lines:
            draw.text((list_x1 + 38, py), ln, font=p_font, fill=PALETTE["WHITE"])
            py += p_lh + 4

        icon_cx = list_x2 - 40
        icon_cy = by
        _draw_row_icon(icon_cx, icon_cy, i)

    draw.rectangle([0, fy1, W, SAFE_H], fill=(16, 32, 78))
    tab_x2 = 248
    lf_lines, lf_font, lf_lh, lf_total_h = fit_text_block(
        draw, left_footer, tab_x2 - 26, footer_h - 12, [40, 34, 30, 26, 22], max_lines=2, line_gap=2
    )
    lfy = fy1 + (footer_h - lf_total_h) // 2
    for ln in lf_lines:
        draw.text((28, lfy), ln, font=lf_font, fill=PALETTE["WHITE"])
        lfy += lf_lh + 2

    draw.line([(286, fy1 + footer_h // 2), (W - 240, fy1 + footer_h // 2)], fill=PALETTE["CARD_B"], width=2)
    rf_lines, rf_font, rf_lh, rf_total_h = fit_text_block(
        draw, right_footer, 220, footer_h - 12, [40, 34, 30, 26, 22], max_lines=2, line_gap=2
    )
    rfy = fy1 + (footer_h - rf_total_h) // 2
    for ln in rf_lines:
        rb = draw.textbbox((0, 0), ln, font=rf_font)
        rw = rb[2] - rb[0]
        draw.text((W - 34 - rw, rfy), ln, font=rf_font, fill=TOKENS["color"]["title"])
        rfy += rf_lh + 2


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

    if frame.get("_is_last"):
        _render_hook_closing(draw, img, frame, load_font)
        return

    if style == "split":
        _render_hook_split(draw, img, frame, load_font)
        return
    if style == "spotlight":
        _render_hook_spotlight(draw, frame)
        return
    _render_hook_center(draw, frame, load_font)
