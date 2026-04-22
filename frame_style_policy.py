#!/usr/bin/env python3
"""
统一的 frames 样式后处理策略。

目标：
- 不改用户手工 json 的使用方式；
- 在“生成后、校验前”自动做轻量样式修正，避免明显空白版式；
- 尤其优化收尾 hook 画面。
"""

from __future__ import annotations

from copy import deepcopy


def _is_short_subtitle(text: str) -> bool:
    s = str(text or "").strip()
    if not s:
        return True
    return len(s) < 9 and ("，" not in s and "。" not in s and "！" not in s and "？" not in s)


def _is_actionable_subtitle(text: str) -> bool:
    s = str(text or "").strip()
    if not s:
        return False
    action_hints = ("先", "再", "先跑", "先做", "现在", "马上", "今天", "记得", "别忘了", "可以")
    return any(k in s for k in action_hints) and ("，" in s or "。" in s or len(s) >= 14)


def _pick_closing_subtitle(frame: dict, meta: dict) -> str:
    text = f"{frame.get('title', '')} {frame.get('script', '')} {meta.get('topic', '')}"
    if "闭环" in text:
        return "先跑最小闭环，跑通后再扩角色和功能。"
    if "协议" in text or "接口" in text:
        return "先定输入输出协议，再开工写 Agent，返工会少很多。"
    if "容错" in text or "降级" in text:
        return "先把重试和降级补上，再追求更高效果。"
    if "日志" in text or "快照" in text:
        return "先把日志和快照接好，问题才能定位得快。"
    return "先做一个可跑版本，再按日志逐步迭代优化。"


def optimize_frame_styles(data: dict) -> dict:
    if not isinstance(data, dict):
        return data

    frames = data.get("frames")
    if not isinstance(frames, list) or not frames:
        return data

    out = deepcopy(data)
    meta = out.get("meta", {}) if isinstance(out.get("meta"), dict) else {}
    out_frames = out.get("frames", [])

    for idx, frame in enumerate(out_frames):
        if not isinstance(frame, dict):
            continue
        if str(frame.get("type", "")).strip().lower() != "hook":
            continue

        style = str(frame.get("style", "")).strip().lower()
        subtitle = str(frame.get("subtitle", "")).strip()

        is_last = idx == len(out_frames) - 1
        # 尾帧优先 spotlight：收尾页要“结论强呈现”，避免 split 出现右侧空块。
        if is_last:
            frame["style"] = "spotlight"
            # 尾帧优先补“行动建议”型 subtitle，让收束更像可执行结尾。
            if not _is_actionable_subtitle(subtitle):
                frame["subtitle"] = _pick_closing_subtitle(frame, meta)
            continue

        # 中间 hook 若 subtitle 太短，split 容易显得空，回退到 spotlight 更稳。
        if style == "split" and _is_short_subtitle(subtitle):
            frame["style"] = "spotlight"

    return out

