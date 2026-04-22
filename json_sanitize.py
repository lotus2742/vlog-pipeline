#!/usr/bin/env python3
"""
json_sanitize.py

清洗可能包含“多段 JSON 拼接”的文本，只保留首个合法 JSON 对象。
"""

import json
from typing import Any


def extract_first_json_value(raw: str) -> Any:
    text = str(raw or "").lstrip("\ufeff").strip()
    if not text:
        raise ValueError("输入为空")
    decoder = json.JSONDecoder()
    obj, _end = decoder.raw_decode(text)
    return obj


def sanitize_json_file(path: str) -> dict:
    """
    将文件内容清洗为首个合法 JSON 并覆盖写回。
    返回统计:
      - changed: 是否发生内容变更
      - had_extra_text: 首对象后是否存在额外文本
    """
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    text = str(raw or "").lstrip("\ufeff").strip()
    decoder = json.JSONDecoder()
    obj, end = decoder.raw_decode(text)
    rest = text[end:].strip()

    normalized = json.dumps(obj, ensure_ascii=False, indent=2) + "\n"
    changed = normalized != raw
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(normalized)

    return {
        "changed": changed,
        "had_extra_text": bool(rest),
    }

