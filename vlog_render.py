#!/usr/bin/env python3
"""
vlog_render.py — 通用帧渲染引擎（Mac 适配版）
接收 frames.json，按 frame.type 渲染对应布局
用法: python3 vlog_render.py frames.json
"""

import json
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from renderers.cards_renderer import choose_cards_style_adaptive, render_cards as render_cards_layout
from renderers.common_draw import text_center
from renderers.comparison_renderer import render_comparison as render_comparison_layout
from renderers.content_renderer import render_content as render_content_layout
from renderers.hook_renderer import choose_hook_style_adaptive, render_hook as render_hook_layout
from utils.render_consts import FONT_CANDIDATES, FONT_PROBE_TEXT, PALETTE, SAFE_H, STANDARD_GLOW_POS, W, H
from utils.render_style_utils import (
    choose_comparison_style,
    choose_hook_style,
    estimate_layout_score,
    fallback_style_for_frame,
)
from utils.render_text_utils import set_font_loader


def _find_font():
    base_dir = os.path.dirname(__file__)
    for path, idx in FONT_CANDIDATES:
        p = path if os.path.isabs(path) else os.path.join(base_dir, path)
        if os.path.exists(p):
            try:
                font = ImageFont.truetype(p, 24, index=idx)
                ok = True
                for ch in FONT_PROBE_TEXT:
                    if not font.getmask(ch).getbbox():
                        ok = False
                        break
                if ok:
                    return p, idx
            except Exception:
                continue
    raise FileNotFoundError(
        "找不到中文字体！请执行：\n"
        "  brew install font-noto-sans-cjk-sc\n"
        "或手动下载 NotoSansCJK.otf 放到脚本同目录。"
    )


FONT_PATH, FONT_INDEX = _find_font()
print(f"[render] 使用字体: {FONT_PATH} (index={FONT_INDEX})")

BG = PALETTE["BG"]
PURPLE_L = PALETTE["PURPLE_L"]
WHITE = PALETTE["WHITE"]
DIM = PALETTE["DIM"]
GOLD = PALETTE["GOLD"]


def load_font(size):
    return ImageFont.truetype(FONT_PATH, size, index=FONT_INDEX)


set_font_loader(load_font)


def col(name):
    if isinstance(name, (tuple, list)):
        return tuple(name)
    return PALETTE.get(name, WHITE)


def make_base_purple(low_noise=False):
    random.seed(42)
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_alpha = 0.45 if low_noise else 0.65
    for x1, y1, x2, y2, color in STANDARD_GLOW_POS:
        tmp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        td.ellipse([x1, y1, x2, y2], fill=(*color, int(255 * glow_alpha)))
        tmp = tmp.filter(ImageFilter.GaussianBlur(170 if low_noise else 150))
        glow = Image.alpha_composite(glow, tmp)
    img_rgba = img.convert("RGBA")
    img_rgba = Image.alpha_composite(img_rgba, glow)
    img = img_rgba.convert("RGB")

    draw = ImageDraw.Draw(img)
    grid_step = 72 if low_noise else 60
    grid_col = (20, 14, 40) if low_noise else (25, 15, 50)
    for x in range(0, W, grid_step):
        draw.line([(x, 0), (x, H)], fill=grid_col, width=1)
    for y in range(0, H, grid_step):
        draw.line([(0, y), (W, y)], fill=grid_col, width=1)

    c = PURPLE_L
    draw.line([(0, 40), (120, 40)], fill=c, width=1)
    draw.line([(120, 40), (120, 0)], fill=c, width=1)
    draw.rectangle([116, 36, 124, 44], fill=c)
    draw.line([(W, H - 40), (W - 120, H - 40)], fill=c, width=1)
    draw.line([(W - 120, H - 40), (W - 120, H)], fill=c, width=1)
    draw.rectangle([W - 124, H - 44, W - 116, H - 36], fill=c)

    star_n = 28 if low_noise else 60
    for _ in range(star_n):
        px, py = random.randint(0, W), random.randint(0, H)
        rv = random.choice([1, 1, 1, 2])
        a = random.randint(40, 120)
        pc = tuple(min(255, int(ch * a // 255)) for ch in c)
        draw.ellipse([px - rv, py - rv, px + rv, py + rv], fill=pc)
    return img


def render_hook(draw, img, frame):
    render_hook_layout(draw, img, frame, load_font=load_font)


def render_cards(draw, img, frame):
    render_cards_layout(draw, img, frame, load_font=load_font, col=col)


def render_content(draw, img, frame):
    render_content_layout(draw, img, frame, load_font=load_font)


def render_outro(draw, img, frame):
    f48 = load_font(48)
    f24 = load_font(24)
    title = frame.get("title", "")
    text_center(draw, title, SAFE_H // 2 - 60, f48, GOLD)
    subtitle = frame.get("subtitle", "")
    if subtitle:
        text_center(draw, subtitle, SAFE_H // 2 + 20, f24, DIM)


def render_comparison(draw, img, frame):
    render_comparison_layout(draw, img, frame, load_font=load_font, col=col)


RENDERERS = {
    "hook": render_hook,
    "cards": render_cards,
    "content": render_content,
    "outro": render_outro,
    "comparison": render_comparison,
}


def render_frame(frame, out_dir, idx=0, total=0):
    ftype = frame.get("type", "content")
    fid = frame.get("id", "00")
    out_path = os.path.join(out_dir, f"frame_{fid}.png")

    low_noise = ftype in {"cards", "comparison", "content"}
    img = make_base_purple(low_noise=low_noise)
    draw = ImageDraw.Draw(img)

    frame_ctx = dict(frame)
    frame_ctx["_is_first"] = idx == 0
    frame_ctx["_is_last"] = total > 0 and idx == total - 1
    score = estimate_layout_score(frame_ctx)
    orig_style = str(frame_ctx.get("style", "")).strip().lower()
    auto_fallback = False
    if not str(frame_ctx.get("style", "")).strip() and score < 70:
        fb = fallback_style_for_frame(frame_ctx)
        if fb:
            frame_ctx["style"] = fb
            auto_fallback = True

    renderer = RENDERERS.get(ftype)
    if renderer:
        renderer(draw, img, frame_ctx)
    else:
        render_content(draw, img, frame_ctx)

    img.save(out_path)
    final_style = (
        choose_hook_style_adaptive(frame_ctx)
        if ftype == "hook"
        else choose_cards_style_adaptive(draw, frame_ctx, load_font)
        if ftype == "cards"
        else choose_comparison_style(frame_ctx)
        if ftype == "comparison"
        else str(frame_ctx.get("style", "")).strip().lower() or "default"
    )
    fallback_flag = "yes" if auto_fallback else "no"
    explicit_flag = "yes" if orig_style else "no"
    print(
        f"  frame_{fid}.png [{ftype}] style={final_style} "
        f"score={score} explicit_style={explicit_flag} auto_fallback={fallback_flag}"
    )
    return out_path


if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "frames.json"
    out_dir = os.path.join(os.path.dirname(os.path.abspath(json_path)), "frames")
    os.makedirs(out_dir, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    frames = data.get("frames", [])
    print(f"渲染 {len(frames)} 帧 → {out_dir}/")
    for idx, frame in enumerate(frames):
        render_frame(frame, out_dir, idx=idx, total=len(frames))
    print(f"\n✅ 全部完成，共 {len(frames)} 帧")
