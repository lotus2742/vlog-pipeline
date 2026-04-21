import argparse
import asyncio
import json
import sys

VALID_VOICES = {
    "zh-CN-XiaoyiNeural",
    "zh-CN-YunxiNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-XiaochenNeural",
}

VALID_COLORS = {
    "CYAN",
    "GOLD",
    "PURPLE_L",
    "GREEN",
    "RED",
    "ORANGE",
    "PINK",
    "WHITE",
    "DIM",
}

BANNED_CHARS = "✅✓❌✗⭐★☆→←↑↓①②③④⑤⚠⚡🎯🔥💡🚀😊"

MAX_SCRIPT_LEN = 300
MIN_SCRIPT_LEN = 20


async def main(args: dict) -> dict:
    data = args.get("frames_json", {})
    retry_count = args.get("retry_count", 0)
    errors = []

    # 如果传入的是字符串，尝试解析
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError as e:
            return {
                "is_valid": False,
                "errors": [f"JSON解析失败: {str(e)}"],
                "retry_count": retry_count + 1,
                "frames_json_str": args.get("frames_json", ""),
            }

    if not isinstance(data, dict):
        return {
            "is_valid": False,
            "errors": ["根对象必须是JSON object"],
            "retry_count": retry_count + 1,
            "frames_json_str": json.dumps(data, ensure_ascii=False),
        }

    # ── meta 校验 ──
    meta = data.get("meta", {})
    if not isinstance(meta, dict):
        errors.append("meta 必须是对象")
    else:
        if not meta.get("topic", "").strip():
            errors.append("meta.topic 不能为空")
        voice = meta.get("voice", "zh-CN-XiaoyiNeural")
        if voice not in VALID_VOICES:
            errors.append(f"meta.voice '{voice}' 不合法，可选: {list(VALID_VOICES)}")
        rate = meta.get("rate", "+5%")
        if not isinstance(rate, str) or not rate.endswith("%"):
            errors.append(f"meta.rate '{rate}' 格式应为 '+5%' / '-10%'")

    # ── frames 校验 ──
    frames = data.get("frames", [])
    if not isinstance(frames, list) or len(frames) == 0:
        errors.append("frames 必须是非空列表")
    else:
        if len(frames) < 3:
            errors.append(f"frames 数量 {len(frames)} 过少，至少 3 帧")
        if len(frames) > 12:
            errors.append(f"frames 数量 {len(frames)} 过多，最多 12 帧")

        # 首尾 hook 检查
        if frames[0].get("type") != "hook":
            errors.append("第一帧 type 必须是 hook")
        if frames[-1].get("type") != "hook":
            errors.append("最后一帧 type 必须是 hook")

        # id 唯一性
        ids = []
        for f in frames:
            fid = str(f.get("id", ""))
            if fid in ids:
                errors.append(f"帧 id '{fid}' 重复")
            ids.append(fid)

        # 逐帧校验
        for i, frame in enumerate(frames):
            prefix = f"frames[{i}]"
            ftype = frame.get("type", "")

            if ftype not in ("hook", "cards", "comparison"):
                errors.append(
                    f"{prefix}.type '{ftype}' 无效，只能是 hook/cards/comparison"
                )
                continue

            # id
            if not str(frame.get("id", "")).strip():
                errors.append(f"{prefix}.id 不能为空")

            # title
            if not frame.get("title", "").strip():
                errors.append(f"{prefix}.title 不能为空")

            # script
            script = frame.get("script", "")
            if not script:
                errors.append(f"{prefix}.script 缺失")
            else:
                if len(script) > MAX_SCRIPT_LEN:
                    errors.append(
                        f"{prefix}.script 过长({len(script)}字 > {MAX_SCRIPT_LEN})"
                    )
                if len(script) < MIN_SCRIPT_LEN:
                    errors.append(
                        f"{prefix}.script 过短({len(script)}字 < {MIN_SCRIPT_LEN})"
                    )

            # 禁止字符
            title = frame.get("title", "")
            for ch in BANNED_CHARS:
                if ch in title:
                    errors.append(f"{prefix}.title 含禁止字符 '{ch}'")
                if ch in script:
                    errors.append(f"{prefix}.script 含禁止字符 '{ch}'")

            # ── cards 类型专项 ──
            if ftype == "cards":
                cards = frame.get("cards", [])
                if not isinstance(cards, list) or len(cards) == 0:
                    errors.append(f"{prefix}.cards 不能为空")
                elif len(cards) > 6:
                    errors.append(f"{prefix}.cards 数量 {len(cards)} 超过上限 6")
                else:
                    for j, card in enumerate(cards):
                        cp = f"{prefix}.cards[{j}]"
                        if not card.get("title", "").strip() and not card.get(
                            "label", ""
                        ).strip():
                            errors.append(f"{cp} title/label 至少填一个")
                        if not card.get("desc", "").strip():
                            errors.append(f"{cp}.desc 不能为空")
                        color = card.get("color", "")
                        if color and color not in VALID_COLORS:
                            errors.append(f"{cp}.color '{color}' 无效")

            # ── comparison 类型专项 ──
            if ftype == "comparison":
                for side in ["left", "right"]:
                    s = frame.get(side, {})
                    if not isinstance(s, dict):
                        errors.append(f"{prefix}.{side} 必须是对象")
                    else:
                        if not str(s.get("label", "")).strip():
                            errors.append(f"{prefix}.{side}.label 不能为空")
                        color = s.get("color", "")
                        if color and color not in VALID_COLORS:
                            errors.append(f"{prefix}.{side}.color '{color}' 无效")

                # 渲染内容防空：至少有一侧 points，或提供 insight
                left = frame.get("left", {}) if isinstance(frame.get("left"), dict) else {}
                right = frame.get("right", {}) if isinstance(frame.get("right"), dict) else {}
                l_points = left.get("points", [])
                r_points = right.get("points", [])
                has_l = isinstance(l_points, list) and len(l_points) > 0
                has_r = isinstance(r_points, list) and len(r_points) > 0
                has_insight = bool(str(frame.get("insight", "")).strip())
                if not (has_l or has_r or has_insight):
                    errors.append(
                        f"{prefix} comparison 内容为空：请至少提供 left.points/right.points 其一，"
                        f"或提供 insight"
                    )

    is_valid = len(errors) == 0

    return {
        "is_valid": is_valid,
        "errors": errors,
        "error_summary": "; ".join(errors) if errors else "校验通过",
        "retry_count": retry_count + 1 if not is_valid else retry_count,
        "frames_json_str": json.dumps(data, ensure_ascii=False, indent=2),
    }


def run_validation(frames_json, retry_count: int = 0) -> dict:
    """同步包装器，便于 CLI / 脚本直接复用。"""
    return asyncio.run(main({"frames_json": frames_json, "retry_count": retry_count}))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="校验 vlog frames JSON 是否符合规范")
    parser.add_argument(
        "input",
        nargs="?",
        default="-",
        help="JSON 文件路径；默认 '-' 表示从标准输入读取",
    )
    parser.add_argument(
        "--retry-count",
        type=int,
        default=0,
        help="可选重试计数，仅用于透传到校验结果",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="格式化输出 JSON 结果（默认单行）",
    )
    return parser


def _read_input(path: str):
    if path == "-":
        raw = sys.stdin.read()
    else:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()

    text = raw.strip()
    if not text:
        return ""
    return text


def _cli() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    try:
        frames_json = _read_input(args.input)
    except OSError as e:
        print(f"读取输入失败: {e}", file=sys.stderr)
        return 2

    result = run_validation(frames_json, retry_count=args.retry_count)

    if args.pretty:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(result, ensure_ascii=False))

    return 0 if result.get("is_valid") else 1


if __name__ == "__main__":
    raise SystemExit(_cli())