#!/usr/bin/env python3
from renderers.common_draw import tag
from renderers.hook_parts import (
    choose_hook_style_adaptive,
    render_hook_center,
    render_hook_closing,
    render_hook_split,
    render_hook_spotlight,
)


def render_hook(draw, img, frame, load_font):
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
        render_hook_closing(draw, img, frame, load_font)
        return

    if frame.get("_is_first"):
        render_hook_split(draw, img, frame, load_font)
        return

    if style == "split":
        style = "spotlight"
    if style == "spotlight":
        render_hook_spotlight(draw, frame)
        return
    render_hook_center(draw, frame, load_font)
