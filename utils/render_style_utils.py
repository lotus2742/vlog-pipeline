#!/usr/bin/env python3
"""
渲染样式决策工具：
- 自动选择 style
- 估算版式风险分
- 回退到更稳的 style
"""

from utils.render_consts import (
    CARDS_GRID_MIN_COUNT,
    CARDS_TIMELINE_DESC_TOTAL,
    CARDS_TIMELINE_MIN_COUNT,
    COMPARISON_TABLE_MIN_SIDE_POINTS,
    HOOK_FIRST_LAST_SPLIT_SCRIPT_LEN,
    HOOK_FIRST_LAST_SPLIT_TITLE_LEN,
    HOOK_SPLIT_TITLE_LEN,
    LAYOUT_CARDS_DESC_TOTAL,
    LAYOUT_CARDS_MANY,
    LAYOUT_COMPARISON_SIDE_MANY,
    LAYOUT_COMPARISON_TOTAL_MANY,
    LAYOUT_SCRIPT_DANGER,
    LAYOUT_SCRIPT_WARN,
    LAYOUT_TITLE_DANGER,
    LAYOUT_TITLE_WARN,
)


def choose_hook_style(frame):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit:
        return explicit
    title_len = len(str(frame.get("title", "")))
    script_len = len(str(frame.get("script", "")))
    if frame.get("_is_first") or frame.get("_is_last"):
        if title_len > HOOK_FIRST_LAST_SPLIT_TITLE_LEN or script_len > HOOK_FIRST_LAST_SPLIT_SCRIPT_LEN:
            return "split"
        return "spotlight"
    if title_len > HOOK_SPLIT_TITLE_LEN:
        return "split"
    return "center"


def choose_cards_style(frame):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit:
        return explicit
    cards = frame.get("cards", []) if isinstance(frame.get("cards"), list) else []
    n = len(cards)
    if n >= CARDS_GRID_MIN_COUNT:
        return "grid"
    desc_total = sum(len(str(c.get("desc", ""))) for c in cards if isinstance(c, dict))
    if n >= CARDS_TIMELINE_MIN_COUNT and desc_total >= CARDS_TIMELINE_DESC_TOTAL:
        return "timeline"
    return "stack"


def choose_comparison_style(frame):
    explicit = str(frame.get("style", "")).strip().lower()
    if explicit:
        return explicit
    left = frame.get("left", {}) if isinstance(frame.get("left"), dict) else {}
    right = frame.get("right", {}) if isinstance(frame.get("right"), dict) else {}
    ln = len(left.get("points", []) or [])
    rn = len(right.get("points", []) or [])
    if max(ln, rn) >= COMPARISON_TABLE_MIN_SIDE_POINTS:
        return "table"
    return "vs"


def estimate_layout_score(frame):
    ftype = str(frame.get("type", "")).strip().lower()
    title_len = len(str(frame.get("title", "")))
    script_len = len(str(frame.get("script", "")))
    score = 100
    if title_len > LAYOUT_TITLE_DANGER:
        score -= 20
    elif title_len > LAYOUT_TITLE_WARN:
        score -= 10
    if script_len > LAYOUT_SCRIPT_DANGER:
        score -= 20
    elif script_len > LAYOUT_SCRIPT_WARN:
        score -= 10
    if ftype == "cards":
        cards = frame.get("cards", []) if isinstance(frame.get("cards"), list) else []
        if len(cards) >= LAYOUT_CARDS_MANY:
            score -= 15
        if sum(len(str(c.get("desc", ""))) for c in cards if isinstance(c, dict)) > LAYOUT_CARDS_DESC_TOTAL:
            score -= 15
    if ftype == "comparison":
        left = frame.get("left", {}) if isinstance(frame.get("left"), dict) else {}
        right = frame.get("right", {}) if isinstance(frame.get("right"), dict) else {}
        ln = len(left.get("points", []) or [])
        rn = len(right.get("points", []) or [])
        if max(ln, rn) >= LAYOUT_COMPARISON_SIDE_MANY:
            score -= 15
        if (ln + rn) >= LAYOUT_COMPARISON_TOTAL_MANY:
            score -= 10
    if ftype == "bullets":
        items = frame.get("items", []) if isinstance(frame.get("items"), list) else []
        if len(items) >= 6:
            score -= 10
    if ftype == "kpi":
        if len(str(frame.get("value", ""))) > 18:
            score -= 8
    if ftype == "quote":
        if len(str(frame.get("quote", ""))) > 200:
            score -= 10
    return max(0, score)


def fallback_style_for_frame(frame):
    ftype = str(frame.get("type", "")).strip().lower()
    if ftype == "hook":
        return "split"
    if ftype == "cards":
        cards = frame.get("cards", []) if isinstance(frame.get("cards"), list) else []
        return "timeline" if len(cards) <= 3 else "grid"
    if ftype == "comparison":
        return "table"
    return ""
