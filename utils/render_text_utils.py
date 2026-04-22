#!/usr/bin/env python3
"""
渲染文本通用工具：
- 文本摘要/去重判断
- 按宽度换行与字号自适配
- 文本块绘制
"""

from __future__ import annotations

from typing import Callable
from utils.render_consts import COMPARE_DROP_CHARS, WEAK_SUBTITLE_PHRASES

_FONT_LOADER: Callable[[int], object] | None = None


def set_font_loader(loader: Callable[[int], object]) -> None:
    global _FONT_LOADER
    _FONT_LOADER = loader


def _load_font(size: int):
    if _FONT_LOADER is None:
        raise RuntimeError("font loader not configured, call set_font_loader(load_font) first")
    return _FONT_LOADER(size)


def wrap_text_lines(draw, text, font, max_w):
    out = []
    cur = ""
    for ch in str(text or ""):
        candidate = cur + ch
        bb = draw.textbbox((0, 0), candidate, font=font)
        if bb[2] - bb[0] <= max_w or not cur:
            cur = candidate
        else:
            out.append(cur)
            cur = ch
    if cur:
        out.append(cur)
    return out


def summarize_script(text, max_len=48):
    s = str(text or "").strip().replace("\n", "")
    if not s:
        return ""
    if len(s) <= max_len:
        return s
    return s[:max_len]


def normalize_text_for_compare(text):
    s = str(text or "").strip().lower()
    if not s:
        return ""
    return "".join(ch for ch in s if ch not in COMPARE_DROP_CHARS)


def is_redundant_text(a, b):
    na = normalize_text_for_compare(a)
    nb = normalize_text_for_compare(b)
    if not na or not nb:
        return False
    if na in nb or nb in na:
        return True
    min_len = min(len(na), len(nb))
    if min_len < 12:
        return False
    prefix = 0
    for i in range(min_len):
        if na[i] != nb[i]:
            break
        prefix += 1
    return prefix / min_len >= 0.8


def is_weak_subtitle(text):
    s = str(text or "").strip()
    if not s:
        return True
    if len(s) <= 4:
        return True
    return s in WEAK_SUBTITLE_PHRASES


def script_key_lines(text, max_lines=3, max_len=28):
    src = str(text or "").strip().replace("\n", "")
    if not src:
        return []
    parts = []
    cur = ""
    for ch in src:
        cur += ch
        if ch in "。！？!?；;":
            t = cur.strip()
            if t:
                parts.append(t)
            cur = ""
    if cur.strip():
        parts.append(cur.strip())
    out = []
    for p in parts:
        p = summarize_script(p, max_len)
        if p:
            out.append(p)
        if len(out) >= max_lines:
            break
    if not out:
        out = [summarize_script(src, max_len)]
    return out


def fit_text_block(draw, text, max_w, max_h, font_sizes, max_lines=4, line_gap=10, ellipsize=True):
    src = str(text or "").strip()
    if not src:
        return [], _load_font(font_sizes[-1] if font_sizes else 24), 0, 0
    for fs in font_sizes:
        f = _load_font(fs)
        lines = wrap_text_lines(draw, src, f, max_w)
        if len(lines) > max_lines:
            lines = lines[:max_lines]
            if ellipsize and lines:
                lines[-1] = summarize_script(lines[-1], max(4, len(lines[-1]) - 1))
        line_h = int(fs * 1.15)
        total_h = len(lines) * line_h + max(0, len(lines) - 1) * line_gap
        if total_h <= max_h:
            return lines, f, line_h, total_h
    fs = font_sizes[-1] if font_sizes else 24
    f = _load_font(fs)
    lines = wrap_text_lines(draw, src, f, max_w)[:max_lines]
    if ellipsize and len(lines) == max_lines and lines:
        lines[-1] = summarize_script(lines[-1], max(4, len(lines[-1]) - 1))
    line_h = int(fs * 1.15)
    total_h = len(lines) * line_h + max(0, len(lines) - 1) * line_gap
    return lines, f, line_h, total_h


def draw_text_block(draw, lines, font, x, y, color, line_h=28, line_gap=8, center=False, max_w=0):
    cy = y
    for ln in lines:
        if center and max_w > 0:
            bb = draw.textbbox((0, 0), ln, font=font)
            lw = bb[2] - bb[0]
            lx = x + max(0, (max_w - lw) // 2)
            draw.text((lx, cy), ln, font=font, fill=color)
        else:
            draw.text((x, cy), ln, font=font, fill=color)
        cy += line_h + line_gap
    return cy
