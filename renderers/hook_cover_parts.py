#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter

from utils.render_consts import (
    HOOK_COVER_CODE_COLORS,
    HOOK_COVER_CODE_LAYOUT,
    HOOK_COVER_ILLUSTRATION_COLORS,
    HOOK_COVER_KEYWORD_MAP,
    HOOK_COVER_PATTERN_COLORS,
    HOOK_COVER_PATTERN_LAYOUT,
    SAFE_H,
    W,
)
from utils.render_text_utils import wrap_line_to_width


def pick_cover_illustration(frame):
    text = f"{frame.get('title', '')} {frame.get('subtitle', '')} {frame.get('script', '')}".lower()
    for name, kws in HOOK_COVER_KEYWORD_MAP.items():
        if any(k in text for k in kws):
            return name
    seed_text = str(frame.get("title", "")) + str(frame.get("script", ""))
    idx = sum(ord(ch) for ch in seed_text) % 3
    return ("trend", "flow", "stack")[idx]


def render_cover_generated_pattern(img, right_x1, right_x2, load_font):
    overlay = Image.new("RGBA", (W, SAFE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    x1, y1 = right_x1 - HOOK_COVER_PATTERN_LAYOUT["panel_outset_x"], HOOK_COVER_PATTERN_LAYOUT["panel_top"]
    x2, y2 = right_x2 + HOOK_COVER_PATTERN_LAYOUT["panel_outset_x"], SAFE_H - HOOK_COVER_PATTERN_LAYOUT["panel_bottom"]
    w, h = x2 - x1, y2 - y1
    d.rounded_rectangle([x1, y1, x2, y2], radius=HOOK_COVER_PATTERN_LAYOUT["panel_radius"], fill=HOOK_COVER_PATTERN_COLORS["panel_fill"], outline=HOOK_COVER_PATTERN_COLORS["panel_outline"], width=HOOK_COVER_PATTERN_LAYOUT["panel_outline_width"])
    d.rounded_rectangle([x1 + HOOK_COVER_PATTERN_LAYOUT["inner_inset"], y1 + HOOK_COVER_PATTERN_LAYOUT["inner_inset"], x2 - HOOK_COVER_PATTERN_LAYOUT["inner_inset"], y2 - HOOK_COVER_PATTERN_LAYOUT["inner_inset"]], radius=HOOK_COVER_PATTERN_LAYOUT["inner_radius"], outline=HOOK_COVER_PATTERN_COLORS["panel_inner_outline"], width=HOOK_COVER_PATTERN_LAYOUT["inner_outline_width"])
    bar_y2 = y1 + HOOK_COVER_PATTERN_LAYOUT["bar_height"]
    d.rounded_rectangle([x1 + HOOK_COVER_PATTERN_LAYOUT["bar_inset_x"], y1 + HOOK_COVER_PATTERN_LAYOUT["bar_inset_top"], x2 - HOOK_COVER_PATTERN_LAYOUT["bar_inset_x"], bar_y2], radius=HOOK_COVER_PATTERN_LAYOUT["bar_radius"], fill=HOOK_COVER_PATTERN_COLORS["bar_fill"], outline=HOOK_COVER_PATTERN_COLORS["bar_outline"], width=HOOK_COVER_PATTERN_LAYOUT["bar_outline_width"])
    d.text((x1 + HOOK_COVER_PATTERN_LAYOUT["bar_title_x"], y1 + HOOK_COVER_PATTERN_LAYOUT["bar_title_y"]), "TECH DOC FLOW", font=load_font(HOOK_COVER_PATTERN_LAYOUT["bar_title_font"]), fill=HOOK_COVER_PATTERN_COLORS["bar_title"])
    dot_left = HOOK_COVER_PATTERN_LAYOUT["status_dot_left"]
    dot_step = HOOK_COVER_PATTERN_LAYOUT["status_dot_spacing"]
    dot_top = HOOK_COVER_PATTERN_LAYOUT["status_dot_top"]
    dot_size = HOOK_COVER_PATTERN_LAYOUT["status_dot_size"]
    d.ellipse([x2 - dot_left, y1 + dot_top, x2 - dot_left + dot_size, y1 + dot_top + dot_size], fill=HOOK_COVER_PATTERN_COLORS["dot_red"])
    d.ellipse([x2 - (dot_left - dot_step), y1 + dot_top, x2 - (dot_left - dot_step) + dot_size, y1 + dot_top + dot_size], fill=HOOK_COVER_PATTERN_COLORS["dot_yellow"])
    d.ellipse([x2 - (dot_left - 2 * dot_step), y1 + dot_top, x2 - (dot_left - 2 * dot_step) + dot_size, y1 + dot_top + dot_size], fill=HOOK_COVER_PATTERN_COLORS["dot_green"])
    cx1 = x1 + HOOK_COVER_PATTERN_LAYOUT["left_col_inset"]
    cx2 = x1 + int(w * HOOK_COVER_PATTERN_LAYOUT["left_col_ratio"])
    rows = HOOK_COVER_PATTERN_LAYOUT["flow_rows"]
    gap = HOOK_COVER_PATTERN_LAYOUT["flow_gap"]
    card_h = int((h - HOOK_COVER_PATTERN_LAYOUT["flow_reserved_h"] - gap * (rows - 1)) / rows)
    start_y = bar_y2 + HOOK_COVER_PATTERN_LAYOUT["flow_start_y_offset"]
    card_colors = [HOOK_COVER_PATTERN_COLORS["flow_card_1"], HOOK_COVER_PATTERN_COLORS["flow_card_2"], HOOK_COVER_PATTERN_COLORS["flow_card_3"]]
    for i in range(rows):
        ay1 = start_y + i * (card_h + gap)
        ay2 = ay1 + card_h
        d.rounded_rectangle([cx1, ay1, cx2, ay2], radius=HOOK_COVER_PATTERN_LAYOUT["flow_card_radius"], fill=card_colors[i], outline=HOOK_COVER_PATTERN_COLORS["flow_card_outline"], width=HOOK_COVER_PATTERN_LAYOUT["flow_card_outline_width"])
        d.text((cx1 + HOOK_COVER_PATTERN_LAYOUT["flow_step_x"], ay1 + HOOK_COVER_PATTERN_LAYOUT["flow_step_y"]), f"Step {i+1}", font=load_font(HOOK_COVER_PATTERN_LAYOUT["flow_step_font"]), fill=HOOK_COVER_PATTERN_COLORS["flow_step_text"])
        d.line([(cx1 + HOOK_COVER_PATTERN_LAYOUT["flow_step_x"], ay1 + HOOK_COVER_PATTERN_LAYOUT["flow_sep_y"]), (cx2 - HOOK_COVER_PATTERN_LAYOUT["flow_step_x"], ay1 + HOOK_COVER_PATTERN_LAYOUT["flow_sep_y"])], fill=HOOK_COVER_PATTERN_COLORS["flow_sep"], width=1)
        d.text((cx1 + HOOK_COVER_PATTERN_LAYOUT["flow_step_x"], ay1 + HOOK_COVER_PATTERN_LAYOUT["flow_subtext_y"]), "输入 -> 处理", font=load_font(HOOK_COVER_PATTERN_LAYOUT["flow_subtext_font"]), fill=HOOK_COVER_PATTERN_COLORS["flow_subtext"])
        if i < rows - 1:
            m = (cx1 + cx2) // 2
            d.line([(m, ay2 + HOOK_COVER_PATTERN_LAYOUT["flow_arrow_start_y"]), (m, ay2 + gap - HOOK_COVER_PATTERN_LAYOUT["flow_arrow_end_y"])], fill=HOOK_COVER_PATTERN_COLORS["flow_arrow"], width=2)
            half_w = HOOK_COVER_PATTERN_LAYOUT["flow_arrow_half_w"]
            d.polygon([(m - half_w, ay2 + gap - (HOOK_COVER_PATTERN_LAYOUT["flow_arrow_end_y"] + 2)), (m + half_w, ay2 + gap - (HOOK_COVER_PATTERN_LAYOUT["flow_arrow_end_y"] + 2)), (m, ay2 + gap - HOOK_COVER_PATTERN_LAYOUT["flow_arrow_tip_y"])], fill=HOOK_COVER_PATTERN_COLORS["flow_arrow"])
    rx1 = cx2 + HOOK_COVER_PATTERN_LAYOUT["right_col_gap"]
    rx2 = x2 - HOOK_COVER_PATTERN_LAYOUT["right_col_inset"]
    chart_y1 = bar_y2 + HOOK_COVER_PATTERN_LAYOUT["chart_top_offset"]
    chart_y2 = y1 + int(h * HOOK_COVER_PATTERN_LAYOUT["chart_h_ratio"])
    d.rounded_rectangle([rx1, chart_y1, rx2, chart_y2], radius=HOOK_COVER_PATTERN_LAYOUT["chart_radius"], fill=HOOK_COVER_PATTERN_COLORS["chart_panel_fill"], outline=HOOK_COVER_PATTERN_COLORS["chart_panel_outline"], width=1)
    for i in range(HOOK_COVER_PATTERN_LAYOUT["chart_grid_lines"]):
        gy = chart_y1 + (chart_y2 - chart_y1) * i // 3
        inset = HOOK_COVER_PATTERN_LAYOUT["chart_grid_inset"]
        d.line([(rx1 + inset, gy), (rx2 - inset, gy)], fill=HOOK_COVER_PATTERN_COLORS["chart_grid"], width=1)
    pts = [(rx1 + dx, chart_y2 + dy) for dx, dy in HOOK_COVER_PATTERN_LAYOUT["trend_points"]]
    d.line(pts, fill=HOOK_COVER_PATTERN_COLORS["chart_line"], width=HOOK_COVER_PATTERN_LAYOUT["trend_line_width"])
    ex, ey = pts[-1]
    trend_r = HOOK_COVER_PATTERN_LAYOUT["trend_point_r"]
    d.ellipse([ex - trend_r, ey - trend_r, ex + trend_r, ey + trend_r], fill=HOOK_COVER_PATTERN_COLORS["chart_point"])
    k1y1 = chart_y2 + HOOK_COVER_PATTERN_LAYOUT["kpi_block_top_gap"]
    k1y2 = k1y1 + HOOK_COVER_PATTERN_LAYOUT["kpi_block_h"]
    k2y1 = k1y2 + HOOK_COVER_PATTERN_LAYOUT["kpi_block_gap"]
    k2y2 = k2y1 + HOOK_COVER_PATTERN_LAYOUT["kpi_block_h"]
    d.rounded_rectangle([rx1, k1y1, rx2, k1y2], radius=HOOK_COVER_PATTERN_LAYOUT["kpi_radius"], fill=HOOK_COVER_PATTERN_COLORS["kpi_fill"], outline=HOOK_COVER_PATTERN_COLORS["kpi_outline"], width=HOOK_COVER_PATTERN_LAYOUT["kpi_outline_width"])
    d.rounded_rectangle([rx1, k2y1, rx2, k2y2], radius=HOOK_COVER_PATTERN_LAYOUT["kpi_radius"], fill=HOOK_COVER_PATTERN_COLORS["kpi_fill"], outline=HOOK_COVER_PATTERN_COLORS["kpi_outline"], width=HOOK_COVER_PATTERN_LAYOUT["kpi_outline_width"])
    d.text((rx1 + HOOK_COVER_PATTERN_LAYOUT["kpi_text_x"], k1y1 + HOOK_COVER_PATTERN_LAYOUT["kpi_text_y"]), "Recall  0.87", font=load_font(HOOK_COVER_PATTERN_LAYOUT["kpi_font"]), fill=HOOK_COVER_PATTERN_COLORS["kpi_text"])
    d.text((rx1 + HOOK_COVER_PATTERN_LAYOUT["kpi_text_x"], k2y1 + HOOK_COVER_PATTERN_LAYOUT["kpi_text_y"]), "Latency 120ms", font=load_font(HOOK_COVER_PATTERN_LAYOUT["kpi_font"]), fill=HOOK_COVER_PATTERN_COLORS["kpi_text"])
    overlay = overlay.filter(ImageFilter.GaussianBlur(HOOK_COVER_PATTERN_LAYOUT["blur_radius"]))
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(overlay)
    img.paste(img_rgba.convert("RGB"))


def build_cover_code_lines(frame, style: str):
    raw = frame.get("cover_code", [])
    if isinstance(raw, list):
        lines = [str(x).rstrip() for x in raw if str(x).strip()]
        if lines:
            return lines[:7]
    if style == "trend":
        return ["metrics = [hit_rate, cite_rate, latency]", "if hit_rate < 0.8:", "    tune_chunking()", "    tune_topk()"]
    if style == "flow":
        return ["query_vec = embed(question)", "docs = vectordb.search(query_vec, top_k=3)", "prompt = build_prompt(docs, question)", "answer = llm.generate(prompt)"]
    return ["chunks = splitter.split_text(doc)", "collection.add(documents=chunks, ids=ids)", "results = collection.query(query_texts=[q])", "return results['documents'][0]"]


def render_cover_code_overlay(img, frame, right_x1, right_x2, load_font):
    style = pick_cover_illustration(frame)
    code_lines = build_cover_code_lines(frame, style)
    if not code_lines:
        return
    overlay = Image.new("RGBA", (W, SAFE_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx1, cy1, cx2, cy2 = (
        right_x1 + HOOK_COVER_CODE_LAYOUT["frame_inset_left"],
        HOOK_COVER_CODE_LAYOUT["frame_top"],
        right_x2 - HOOK_COVER_CODE_LAYOUT["frame_inset_right"],
        SAFE_H - HOOK_COVER_CODE_LAYOUT["frame_bottom"],
    )
    px1 = cx1 + HOOK_COVER_CODE_LAYOUT["panel_inset_left"]
    px2 = cx2 - HOOK_COVER_CODE_LAYOUT["panel_inset_right"]
    py1 = cy1 + HOOK_COVER_CODE_LAYOUT["panel_inset_top"]
    py2 = cy2 - HOOK_COVER_CODE_LAYOUT["panel_inset_bottom"]
    od.text((px1 + HOOK_COVER_CODE_LAYOUT["label_x_offset"], py1), "rag_flow.py", font=load_font(15), fill=HOOK_COVER_CODE_COLORS["file_label"])
    content_top = py1 + HOOK_COVER_CODE_LAYOUT["content_top_offset"]
    content_bottom = py2
    max_text_w = max(HOOK_COVER_CODE_LAYOUT["max_text_width_min"], px2 - (px1 + HOOK_COVER_CODE_LAYOUT["line_num_gutter"]) - HOOK_COVER_CODE_LAYOUT["max_text_width_right_padding"])
    available_h = max(HOOK_COVER_CODE_LAYOUT["available_height_min"], content_bottom - content_top)
    code_font = load_font(15)
    wrapped = []
    for line in code_lines[:12]:
        segs = wrap_line_to_width(od, line, code_font, max_text_w, max_segments=3)
        wrapped.extend(segs if segs else [""])
    if not wrapped:
        return
    wrapped = wrapped[: min(HOOK_COVER_CODE_LAYOUT["target_lines_max"], len(wrapped))]
    line_h = max(HOOK_COVER_CODE_LAYOUT["line_height_min"], min(HOOK_COVER_CODE_LAYOUT["line_height_max"], available_h // max(1, len(wrapped))))
    y = content_top
    num_color = HOOK_COVER_CODE_COLORS["line_num"]
    base_color = HOOK_COVER_CODE_COLORS["base"]
    kw_color = HOOK_COVER_CODE_COLORS["keyword"]
    fn_color = HOOK_COVER_CODE_COLORS["function"]
    for i, line in enumerate(wrapped, 1):
        if y > content_bottom - line_h:
            break
        od.text((px1, y), f"{i:>2}", font=code_font, fill=num_color)
        x = px1 + HOOK_COVER_CODE_LAYOUT["line_num_gutter"]
        for tk in line.replace("(", " ( ").replace(")", " ) ").replace(",", " , ").split(" "):
            if tk == "":
                x += HOOK_COVER_CODE_LAYOUT["space_gap"]
                continue
            color = kw_color if tk in {"def", "return", "if", "for", "in"} else fn_color if (tk.endswith("()") or tk in {"embed", "search", "build_prompt", "generate"}) else base_color
            bb = od.textbbox((x, y), tk, font=code_font)
            tk_w = bb[2] - bb[0]
            if x + tk_w > px2 - 4:
                break
            od.text((x, y), tk, font=code_font, fill=color)
            x += tk_w + HOOK_COVER_CODE_LAYOUT["token_gap"]
        y += line_h
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(overlay)
    img.paste(img_rgba.convert("RGB"))


def render_cover_illustration(img, frame, right_x1, right_x2, load_font):
    style = pick_cover_illustration(frame)
    overlay = Image.new("RGBA", (W, SAFE_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    fill_back = HOOK_COVER_ILLUSTRATION_COLORS["fill_back"]
    fill_mid = HOOK_COVER_ILLUSTRATION_COLORS["fill_mid"]
    fill_front = HOOK_COVER_ILLUSTRATION_COLORS["fill_front"]
    line_soft = HOOK_COVER_ILLUSTRATION_COLORS["line_soft"]
    line_dim = HOOK_COVER_ILLUSTRATION_COLORS["line_dim"]
    accent = HOOK_COVER_ILLUSTRATION_COLORS["accent"]
    accent_dot = HOOK_COVER_ILLUSTRATION_COLORS["accent_dot"]
    cx1, cy1, cx2, cy2 = right_x1 + 36, 192, right_x2 - 36, SAFE_H - 70
    od.rounded_rectangle([cx1 + 34, cy1 + 18, cx2 - 8, cy2 + 10], radius=12, fill=fill_back, outline=line_dim, width=1)
    od.rounded_rectangle([cx1 + 14, cy1, cx2 - 28, cy2 - 8], radius=12, fill=fill_mid, outline=line_soft, width=1)
    od.rounded_rectangle([cx1, cy1 + 24, cx2 - 44, cy2 + 18], radius=12, fill=fill_front, outline=line_dim, width=1)

    def _draw_laptop_shell():
        lx1, ly1, lx2, ly2 = cx1 + 24, cy1 + 76, cx2 - 72, cy2 - 24
        od.rounded_rectangle([lx1, ly1, lx2, ly2], radius=12, fill=HOOK_COVER_ILLUSTRATION_COLORS["laptop_shell"], outline=line_soft, width=1)
        sx1, sy1, sx2, sy2 = lx1 + 16, ly1 + 18, lx2 - 16, ly2 - 28
        od.rectangle([sx1, sy1, sx2, sy2], outline=line_soft, width=1)
        bx1, by1, bx2, by2 = lx1 + 42, ly2 - 10, lx2 - 42, ly2 + 12
        od.rounded_rectangle([bx1, by1, bx2, by2], radius=6, fill=HOOK_COVER_ILLUSTRATION_COLORS["laptop_base"], outline=line_dim, width=1)
        return sx1, sy1, sx2, sy2

    if style == "trend":
        chart_x1, chart_y1 = cx1 + 22, cy1 + 86
        chart_x2, chart_y2 = cx2 - 88, cy2 - 26
        od.rectangle([chart_x1, chart_y1, chart_x2, chart_y2], outline=line_soft, width=1)
        for i in range(4):
            gy = chart_y1 + (chart_y2 - chart_y1) * i // 3
            od.line([(chart_x1 + 8, gy), (chart_x2 - 8, gy)], fill=line_dim, width=1)
        pts = [(chart_x1 + 12, chart_y2 - 18), (chart_x1 + 56, chart_y2 - 36), (chart_x1 + 94, chart_y2 - 32), (chart_x1 + 142, chart_y2 - 72), (chart_x1 + 186, chart_y2 - 112)]
        od.line(pts, fill=accent, width=3)
        ex, ey = pts[-1]
        od.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=accent_dot)
    elif style == "flow":
        sx1, sy1, sx2, sy2 = _draw_laptop_shell()
        nx = [sx1 + 12, sx1 + 82, sx1 + 152, sx1 + 222]
        ny = [sy1 + 24, sy1 + 56, sy1 + 36, sy1 + 70]
        for i in range(4):
            od.rounded_rectangle([nx[i], ny[i], nx[i] + 56, ny[i] + 30], radius=7, fill=HOOK_COVER_ILLUSTRATION_COLORS["flow_node"], outline=line_soft, width=1)
            if i < 3:
                od.line([(nx[i] + 56, ny[i] + 15), (nx[i + 1], ny[i + 1] + 15)], fill=accent, width=2)
        od.ellipse([nx[-1] + 46, ny[-1] + 8, nx[-1] + 62, ny[-1] + 24], fill=accent_dot)
    else:
        sx1, sy1, sx2, sy2 = _draw_laptop_shell()
        a = (sx1 + 20, sy1 + 26, sx1 + 108, sy1 + 66)
        b = (sx1 + 20, sy1 + 92, sx1 + 108, sy1 + 132)
        c = (sx1 + 152, sy1 + 60, sx1 + 244, sy1 + 100)
        for box in (a, b, c):
            od.rounded_rectangle(box, radius=8, fill=HOOK_COVER_ILLUSTRATION_COLORS["stack_node"], outline=line_soft, width=1)
        od.line([(a[2], (a[1] + a[3]) // 2), (c[0], (c[1] + c[3]) // 2)], fill=accent, width=2)
        od.line([(b[2], (b[1] + b[3]) // 2), (c[0], (c[1] + c[3]) // 2)], fill=accent, width=2)
        od.ellipse([c[2] - 10, (c[1] + c[3]) // 2 - 4, c[2] - 2, (c[1] + c[3]) // 2 + 4], fill=accent_dot)
    od.rounded_rectangle([right_x1 + 18, 164, right_x1 + 86, 230], radius=10, fill=HOOK_COVER_ILLUSTRATION_COLORS["badge_fill"], outline=line_soft, width=1)
    od.text((right_x1 + 44, 186), "*", font=load_font(22), fill=accent)
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(overlay)
    img.paste(img_rgba.convert("RGB"))
