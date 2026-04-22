#!/usr/bin/env python3
"""
frame_expander.py

将单帧过长 script 自动拆分为多帧，减少单页停留时间。
"""

import copy
import re


def _split_sentences(text: str) -> list[str]:
    src = str(text or "").strip()
    if not src:
        return []
    chunks = []
    cur = []
    for ch in src:
        cur.append(ch)
        if ch in "。！？!?；;":
            s = "".join(cur).strip()
            if s:
                chunks.append(s)
            cur = []
    tail = "".join(cur).strip()
    if tail:
        chunks.append(tail)
    if chunks:
        return chunks
    # 回退：按逗号切
    return [x.strip() for x in re.split(r"[，,]", src) if x.strip()]


def _pack_segments(sentences: list[str], target_len: int) -> list[str]:
    if not sentences:
        return []
    out = []
    cur = ""
    for s in sentences:
        if not cur:
            cur = s
            continue
        if len(cur) + len(s) <= target_len:
            cur += s
        else:
            out.append(cur)
            cur = s
    if cur:
        out.append(cur)
    return out


def expand_long_frames(data: dict, target_script_len: int = 110, max_frames: int = 12) -> tuple[dict, dict]:
    """
    返回: (expanded_data, stats)
    stats: {expanded_count, before_count, after_count}
    """
    if not isinstance(data, dict):
        return data, {"expanded_count": 0, "before_count": 0, "after_count": 0}
    frames = data.get("frames", [])
    if not isinstance(frames, list) or not frames:
        return data, {"expanded_count": 0, "before_count": 0, "after_count": 0}

    out = []
    expanded_count = 0
    for frame in frames:
        script = str(frame.get("script", "")).strip()
        # 尽量留至少 2 个空位给后续帧，避免超过 12 触发校验失败
        room_left = max_frames - len(out) - 2
        if len(script) <= target_script_len or room_left <= 0:
            out.append(frame)
            continue
        sentences = _split_sentences(script)
        parts = _pack_segments(sentences, target_script_len)
        if len(parts) <= 1:
            out.append(frame)
            continue
        # 若拆分后超出容量，裁到可容纳范围
        max_parts = min(len(parts), room_left + 1)
        parts = parts[:max_parts]
        total = len(parts)
        base_id = str(frame.get("id", "frame"))
        base_title = str(frame.get("title", "")).strip()
        for i, seg in enumerate(parts, start=1):
            nf = copy.deepcopy(frame)
            if i == 1:
                nf["id"] = base_id
            else:
                nf["id"] = f"{base_id}_p{i}"
            if total > 1 and base_title:
                nf["title"] = f"{base_title}（{i}/{total}）"
            nf["script"] = seg
            out.append(nf)
        expanded_count += 1

    out_data = copy.deepcopy(data)
    out_data["frames"] = out[:max_frames]
    return out_data, {
        "expanded_count": expanded_count,
        "before_count": len(frames),
        "after_count": len(out_data["frames"]),
    }

