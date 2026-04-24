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
import json
import os
import random
import re
import urllib.error
import urllib.request


def _normalize_text_for_compare(text: str) -> str:
    s = str(text or "").strip().lower()
    if not s:
        return ""
    drop_chars = " \n\r\t，。！？；：、,.!?;:-_()[]{}\"'`~|/\\"
    return "".join(ch for ch in s if ch not in drop_chars)


def _is_redundant_text(a: str, b: str) -> bool:
    na = _normalize_text_for_compare(a)
    nb = _normalize_text_for_compare(b)
    if not na or not nb:
        return False
    return na in nb or nb in na


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


def _clip_subtitle_len(text: str, min_len: int = 16, max_len: int = 32) -> str:
    s = str(text or "").strip(" ，。；;、")
    if not s:
        return ""
    if len(s) > max_len:
        s = s[:max_len].rstrip(" ，。；;、")
    if len(s) < min_len:
        if not s.endswith("。"):
            s = f"{s}。"
        while len(s) < min_len:
            s += "先跑一遍。"
            if len(s) > max_len:
                s = s[:max_len].rstrip(" ，。；;、")
                break
    return s


def _build_first_subtitle_from_topic(topic: str, title: str, script: str) -> str:
    t = str(topic or "").strip(" ，。；;、")
    if not t:
        return "先看核心结论，再按步骤落地执行。"

    candidates = [
        f"先围绕{t}搭建最小可跑链路，再按结果迭代。",
        f"先看{t}的关键结论，再照步骤落地。",
        f"先用{t}跑通一版，再补齐细节优化。",
    ]
    for c in candidates:
        clipped = _clip_subtitle_len(c)
        if clipped and not _is_redundant_text(clipped, script) and not _is_redundant_text(clipped, title):
            return clipped
    return _clip_subtitle_len("先看核心结论，再按步骤落地执行。")


def _llm_generate_opening(topic: str, title: str, script: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return ""

    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    url = f"{base_url}/chat/completions"
    prompt = (
        "你是短视频文案助手。请生成 1 条中文开场短语（6~12 字），"
        "用于替换“先说结论”这类固定开头。要求自然口语、不要与输入完全重复、"
        "不要带引号和编号，只输出短语本身。\n"
        f"topic: {topic}\n"
        f"title: {title}\n"
        f"script: {script[:120]}"
    )
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.9,
        "max_tokens": 30,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            text = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            text = re.sub(r"[\r\n]+", "", text).strip("“”\"'：:，,。 ")
            if 4 <= len(text) <= 18:
                return text
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError):
        return ""
    return ""


def _diversify_first_hook_opening(script: str, topic: str, title: str) -> str:
    s = str(script or "").strip()
    if not s:
        return s

    opener_pool = [
        "先说结论",
        "核心结论先给你",
        "你先记住这个判断",
        "这期先抓重点",
        "一句话先定方向",
        "今天我们学习",
        "本期视频核心主题是",
    ]
    target = _llm_generate_opening(topic, title, s) or random.choice(opener_pool)

    # 仅替换首句开头的固定模板，避免误伤正文内容
    pattern = r"^(先说结论|先说重点|一句话总结|核心结论先给你|你先记住这个判断)[，,:：]?\s*"
    if re.match(pattern, s):
        return re.sub(pattern, f"{target}，", s, count=1)

    return s


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
        title = str(frame.get("title", "")).strip()
        script = str(frame.get("script", "")).strip()
        is_first = idx == 0

        is_last = idx == len(out_frames) - 1
        if is_first:
            # 首帧开场句多样化：不再固定“先说结论”，按内容轮换开场模板。
            diversified = _diversify_first_hook_opening(
                script, str(meta.get("topic", "")), title
            )
            if diversified != script:
                frame["script"] = diversified
                script = diversified

            # C+ 改良版：首帧 subtitle 优先从 topic 改写成动作句，并避免与 title/script 复读
            if (not _is_actionable_subtitle(subtitle)) or _is_redundant_text(subtitle, script):
                frame["subtitle"] = _build_first_subtitle_from_topic(
                    meta.get("topic", ""), title, script
                )
                subtitle = frame["subtitle"]

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

