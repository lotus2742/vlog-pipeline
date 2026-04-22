#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


AI_CLICHE_PATTERNS = [
    "首先",
    "其次",
    "最后",
    "综上所述",
    "在当今时代",
    "不难发现",
    "赋能",
    "形成闭环",
    "全面优化",
]

EMPTY_PATTERNS = [
    "待补充",
    "略",
    "...",
    "等等",
]

ACTION_HINTS = [
    "先",
    "再",
    "然后",
    "建议",
    "参数",
    "步骤",
    "检查",
    "如果",
    "报错",
    "重试",
    "设置",
    "验证",
]

CLICHE_REPLACEMENTS = {
    "首先": "先说重点",
    "其次": "再看关键点",
    "最后": "收尾重点是",
    "综上所述": "一句话总结",
    "在当今时代": "现在做这件事",
    "不难发现": "你会看到",
    "赋能": "支持",
    "形成闭环": "形成完整流程",
    "全面优化": "逐步优化",
}


def _clamp(v: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, v))


def _estimate_seconds(text: str) -> float:
    # 中文口播粗估：每秒约 4.5 字
    chars = len(str(text or "").strip())
    if chars <= 0:
        return 0.0
    return chars / 4.5


def _score_info_density(frames: list[dict]) -> tuple[float, list[str]]:
    issues = []
    if not frames:
        return 0.0, ["frames 为空，无法评估信息密度"]

    rich_count = 0
    for idx, frame in enumerate(frames):
        score = 0
        script = str(frame.get("script", "")).strip()
        ftype = str(frame.get("type", "")).strip()
        if any(h in script for h in ACTION_HINTS):
            score += 1
        if any(p in script for p in EMPTY_PATTERNS):
            score -= 1
            issues.append(f"frames[{idx}] script 含占位表达")

        if ftype == "cards":
            cards = frame.get("cards", [])
            if isinstance(cards, list) and len(cards) >= 2:
                non_empty = 0
                for c in cards:
                    if str(c.get("desc", "")).strip():
                        non_empty += 1
                if non_empty >= 2:
                    score += 1
        elif ftype == "bullets":
            items = frame.get("items", [])
            if isinstance(items, list) and len(items) >= 2:
                score += 1
        elif ftype == "kpi":
            kpis = frame.get("kpis", [])
            if isinstance(kpis, list) and len(kpis) >= 2:
                score += 1
            elif str(frame.get("value", "")).strip() and str(frame.get("label", "")).strip():
                score += 1
        elif ftype == "quote":
            if str(frame.get("quote", "")).strip():
                score += 1
        elif ftype == "comparison":
            left = frame.get("left", {}) if isinstance(frame.get("left"), dict) else {}
            right = frame.get("right", {}) if isinstance(frame.get("right"), dict) else {}
            l_points = left.get("points", [])
            r_points = right.get("points", [])
            if isinstance(l_points, list) and len(l_points) > 0:
                score += 1
            if isinstance(r_points, list) and len(r_points) > 0:
                score += 1

        if score >= 2:
            rich_count += 1

    ratio = rich_count / max(len(frames), 1)
    return _clamp(50 + ratio * 50), issues


def _score_naturalness(frames: list[dict]) -> tuple[float, list[str]]:
    issues = []
    total_penalty = 0
    openings = []
    for idx, frame in enumerate(frames):
        script = str(frame.get("script", "")).strip()
        first4 = script[:4]
        if first4:
            openings.append(first4)

        for p in AI_CLICHE_PATTERNS:
            if p in script:
                total_penalty += 4
                issues.append(f"frames[{idx}] 命中 AI 套话: {p}")

    # 连续同开头句式惩罚
    for i in range(2, len(openings)):
        if openings[i] and openings[i] == openings[i - 1] == openings[i - 2]:
            total_penalty += 6
            issues.append(f"frames[{i-2}..{i}] 连续三帧开头重复")

    return _clamp(100 - total_penalty), issues


def _score_rhythm(frames: list[dict]) -> tuple[float, list[str]]:
    issues = []
    penalties = 0
    for idx, frame in enumerate(frames):
        ftype = str(frame.get("type", "")).strip()
        sec = _estimate_seconds(str(frame.get("script", "")).strip())
        if ftype == "comparison":
            # 小白讲清楚优先：节奏仅做弱提醒，不作为强约束。
            if sec < 5 or sec > 24:
                penalties += 2
                issues.append(
                    f"frames[{idx}] comparison 口播预计 {sec:.1f}s，时长偏离常见区间(5-24s)"
                )
        else:
            if sec < 4 or sec > 20:
                penalties += 2
                issues.append(
                    f"frames[{idx}] 口播预计 {sec:.1f}s，时长偏离常见区间(4-20s)"
                )
    return _clamp(100 - penalties), issues


def _score_style_diversity(frames: list[dict]) -> tuple[float, list[str]]:
    issues = []
    if not frames:
        return 0.0, ["frames 为空，无法评估版式多样性"]

    combos = []
    repeats = 0
    for frame in frames:
        combo = f"{frame.get('type','')}/{frame.get('style','default')}"
        if combos and combos[-1] == combo:
            repeats += 1
        combos.append(combo)

    unique_styles = len(set(frame.get("style", "default") for frame in frames))
    n = len(frames)
    target = 3 if n >= 6 else 2
    if n >= 9:
        target = 4

    base = 60 + (min(unique_styles, target) / max(target, 1)) * 30
    penalty = repeats * 6
    if unique_styles < target:
        issues.append(f"样式种类 {unique_styles}，低于建议值 {target}")
    if repeats > 0:
        issues.append(f"出现 {repeats} 处连续 type/style 重复")
    return _clamp(base - penalty), issues


def analyze_frames(data: dict) -> dict:
    frames = data.get("frames", []) if isinstance(data, dict) else []
    scores = {}
    issues = []

    s1, i1 = _score_info_density(frames)
    s2, i2 = _score_naturalness(frames)
    s3, i3 = _score_rhythm(frames)
    s4, i4 = _score_style_diversity(frames)

    scores["info_density"] = round(s1, 2)
    scores["naturalness"] = round(s2, 2)
    scores["rhythm"] = round(s3, 2)
    scores["style_diversity"] = round(s4, 2)
    issues.extend(i1 + i2 + i3 + i4)

    # 评分权重：信息密度和可读性优先，节奏仅作次要参考。
    total = round(s1 * 0.45 + s2 * 0.3 + s3 * 0.05 + s4 * 0.2, 2)

    return {
        "ok": True,
        "total_score": total,
        "scores": scores,
        "issues": issues,
    }


def _split_sentences(text: str) -> list[str]:
    s = str(text or "").strip()
    if not s:
        return []
    parts = []
    buf = ""
    for ch in s:
        buf += ch
        if ch in "。！？；":
            parts.append(buf.strip())
            buf = ""
    if buf.strip():
        parts.append(buf.strip())
    return [p for p in parts if p]


def _is_actionable_subtitle(text: str) -> bool:
    s = str(text or "").strip()
    if len(s) < 8:
        return False
    has_action = any(k in s for k in ACTION_HINTS)
    has_sentence_shape = any(p in s for p in ("，", "。", "；", "！", "？")) or len(s) >= 14
    return has_action and has_sentence_shape


def _build_first_subtitle(script: str, title: str = "") -> str:
    sentences = _split_sentences(script)
    for sent in sentences:
        s = sent.strip()
        if _is_actionable_subtitle(s):
            return s
    # 兜底：确保首帧字幕是动作型完整句子，避免中间信息块过空。
    if str(title).strip():
        return f"先按“{str(title).strip()}”拆成步骤再执行，避免关键细节漏掉。"
    return "先把任务拆成小步骤再执行，避免顾此失彼。"


def _compress_script(script: str, max_chars: int) -> tuple[str, bool]:
    s = str(script or "").strip()
    if len(s) <= max_chars:
        return s, False
    # 句级压缩，避免截成半句影响技术讲解清晰度
    sentences = _split_sentences(s)
    if len(sentences) <= 1:
        out = s[:max_chars].strip()
        if len(out) < len(s):
            out = out.rstrip("，,")
        if out and out[-1] not in "。！？":
            out = out + "。"
        return out, True
    kept = []
    total = 0
    for sent in sentences:
        if total + len(sent) <= max_chars or not kept:
            kept.append(sent)
            total += len(sent)
        else:
            break
    out = "".join(kept).strip()
    if len(out) < 20:
        out = s[: max(20, min(len(s), max_chars))].strip()
    return out, True


def _rewrite_script(script: str, frame_type: str) -> tuple[str, list[str]]:
    fixes = []
    s = str(script or "").strip()
    if not s:
        return s, fixes

    for old, new in CLICHE_REPLACEMENTS.items():
        if old in s:
            s = s.replace(old, new)
            fixes.append(f"替换套话: {old}->{new}")

    # 小白可听懂优先：自动修复不再主动压缩文案，避免“听懂但不会做”。

    # 保证讲解信息量，避免修复后过短
    if len(s) < 45:
        s = (s + " 实操时先做一条样例验证，再批量执行。").strip()
        fixes.append("补充可执行细节，避免讲解过短")
    return s, fixes


def auto_fix_frames(data: dict) -> dict:
    if not isinstance(data, dict):
        return {
            "ok": False,
            "error": "输入不是 JSON 对象",
            "fixed_data": data,
            "fixes": [],
        }
    out = json.loads(json.dumps(data, ensure_ascii=False))
    frames = out.get("frames", [])
    if not isinstance(frames, list):
        return {
            "ok": False,
            "error": "frames 不是列表",
            "fixed_data": out,
            "fixes": [],
        }

    fixes = []
    for idx, frame in enumerate(frames):
        ftype = str(frame.get("type", "")).strip()
        old_script = str(frame.get("script", "")).strip()
        new_script, frame_fixes = _rewrite_script(old_script, ftype)
        if frame_fixes and new_script != old_script:
            frame["script"] = new_script
            fixes.append(
                {
                    "frame_index": idx,
                    "frame_id": frame.get("id", ""),
                    "actions": frame_fixes,
                }
            )
        if idx == 0:
            old_subtitle = str(frame.get("subtitle", "")).strip()
            if not _is_actionable_subtitle(old_subtitle):
                new_subtitle = _build_first_subtitle(
                    str(frame.get("script", "")).strip(),
                    str(frame.get("title", "")).strip(),
                )
                frame["subtitle"] = new_subtitle
                fixes.append(
                    {
                        "frame_index": idx,
                        "frame_id": frame.get("id", ""),
                        "actions": ["首帧 subtitle 改为带动作的完整句子，避免信息空块"],
                    }
                )
    out["frames"] = frames
    return {"ok": True, "fixed_data": out, "fixes": fixes}


def main() -> int:
    parser = argparse.ArgumentParser(description="frames.json 质量评分（非结构校验）")
    parser.add_argument("frames_path", help="frames.json 文件路径")
    parser.add_argument(
        "--min-total",
        type=float,
        default=0.0,
        help="总分阈值，低于该分数则返回非 0",
    )
    parser.add_argument(
        "--auto-fix",
        action="store_true",
        help="自动修复低质量脚本并输出修复后评分",
    )
    parser.add_argument(
        "--fixed-output",
        default="",
        help="可选：自动修复后 JSON 输出路径",
    )
    parser.add_argument(
        "--write-back",
        action="store_true",
        help="自动修复后写回原文件",
    )
    args = parser.parse_args()

    p = Path(args.frames_path).expanduser().resolve()
    if not p.exists():
        print(
            json.dumps(
                {"ok": False, "error": f"文件不存在: {p}"},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(
            json.dumps(
                {"ok": False, "error": f"JSON 读取失败: {e}"},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    report = analyze_frames(data)
    report["auto_fix_applied"] = False
    report["fixes"] = []
    report["before_score"] = report["total_score"]
    if args.auto_fix:
        fixed = auto_fix_frames(data)
        if fixed.get("ok"):
            fixed_data = fixed.get("fixed_data", data)
            fixed_report = analyze_frames(fixed_data)
            report["auto_fix_applied"] = True
            report["fixes"] = fixed.get("fixes", [])
            report["after_score"] = fixed_report["total_score"]
            report["total_score"] = fixed_report["total_score"]
            report["scores"] = fixed_report["scores"]
            report["issues"] = fixed_report["issues"]
            if args.write_back:
                p.write_text(
                    json.dumps(fixed_data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
            if args.fixed_output:
                fp = Path(args.fixed_output).expanduser().resolve()
                fp.parent.mkdir(parents=True, exist_ok=True)
                fp.write_text(
                    json.dumps(fixed_data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
    report["min_total"] = args.min_total
    report["pass"] = report["total_score"] >= args.min_total
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
