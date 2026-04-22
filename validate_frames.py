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

VALID_FRAME_TYPES = frozenset(
    {"hook", "cards", "comparison", "bullets", "kpi", "quote"}
)

BANNED_CHARS = "✅✓❌✗⭐★☆→←↑↓①②③④⑤⚠⚡🎯🔥💡🚀😊"

# M1 版式：bullets / quote 文本长度边界
MAX_BULLET_ITEM_LEN = 160
MAX_BULLET_TITLE_LEN = 24
MIN_QUOTE_BODY_LEN = 10
MAX_QUOTE_BODY_LEN = 420
MAX_KPI_VALUE_LEN = 40
MAX_FOOTNOTE_LEN = 120
MAX_KPI_ITEMS = 4

MAX_SCRIPT_LEN = 420
MIN_SCRIPT_LEN = 20
MAX_FIRST_HOOK_SCRIPT_LEN = 120
MAX_CLOSING_LIST_ITEMS = 4
MAX_CLOSING_LIST_ITEM_LEN = 24
ACTION_WORD_HINTS = (
    "先",
    "再",
    "然后",
    "可以",
    "建议",
    "记得",
    "请",
    "务必",
    "避免",
    "检查",
    "设置",
    "执行",
    "确认",
    "补充",
    "重试",
)


def normalize_text_for_compare(text: str) -> str:
    s = str(text or "").strip().lower()
    if not s:
        return ""
    drop_chars = " \n\r\t，。！？；：、,.!?;:-_()[]{}\"'`~|/\\"
    return "".join(ch for ch in s if ch not in drop_chars)


def is_redundant_text(a: str, b: str) -> bool:
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
    return (prefix / min_len) >= 0.8


def _normalize_bullet_items(raw):
    out = []
    if not isinstance(raw, list):
        return out
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
        elif isinstance(x, dict) and str(x.get("text", "")).strip():
            out.append(str(x.get("text")).strip())
    return out


def leading_script_chunk(text: str, max_len: int = 36) -> str:
    s = str(text or "").strip().replace("\n", "")
    if not s:
        return ""
    return s[:max_len]


def is_actionable_sentence(text: str) -> bool:
    s = str(text or "").strip()
    if len(s) < 8:
        return False
    has_action = any(k in s for k in ACTION_WORD_HINTS)
    # 首帧 subtitle 期望是完整表达，至少有动作词，并且不是纯标签短语。
    has_sentence_shape = any(p in s for p in ("，", "。", "；", "！", "？")) or len(s) >= 14
    return has_action and has_sentence_shape


def has_quote_alignment(script: str, quote: str) -> bool:
    ns = normalize_text_for_compare(script)
    nq = normalize_text_for_compare(quote)
    if not ns or not nq:
        return True
    if len(nq) < 12:
        return True
    anchors = [nq[:10]]
    mid = max(0, len(nq) // 2 - 5)
    anchors.append(nq[mid : mid + 10])
    anchors.append(nq[-10:])
    return any(a and a in ns for a in anchors)


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

            if ftype not in VALID_FRAME_TYPES:
                errors.append(
                    f"{prefix}.type '{ftype}' 无效，可选: {sorted(VALID_FRAME_TYPES)}"
                )
                continue

            if ftype == "hook":
                closing_list = frame.get("list", None)
                if closing_list is not None:
                    if not isinstance(closing_list, list):
                        errors.append(f"{prefix}.list 必须是数组")
                    elif len(closing_list) < 2:
                        errors.append(f"{prefix}.list 至少需要 2 条")
                    elif len(closing_list) > MAX_CLOSING_LIST_ITEMS:
                        errors.append(f"{prefix}.list 超过上限 {MAX_CLOSING_LIST_ITEMS} 条")
                    else:
                        for j, it in enumerate(closing_list):
                            ip = f"{prefix}.list[{j}]"
                            txt = ""
                            if isinstance(it, str):
                                txt = it.strip()
                            elif isinstance(it, dict):
                                txt = str(it.get("text", "")).strip()
                            else:
                                errors.append(f"{ip} 必须是字符串或 {{\"text\":\"...\"}}")
                                continue
                            if not txt:
                                errors.append(f"{ip} 不能为空")
                                continue
                            if len(txt) > MAX_CLOSING_LIST_ITEM_LEN:
                                errors.append(
                                    f"{ip} 过长({len(txt)}字 > {MAX_CLOSING_LIST_ITEM_LEN})，"
                                    "收尾列表请写精炼短句"
                                )
                            for ch in BANNED_CHARS:
                                if ch in txt:
                                    errors.append(f"{ip} 含禁止字符 '{ch}'")

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
                if i == 0 and len(script) > MAX_FIRST_HOOK_SCRIPT_LEN:
                    errors.append(
                        f"frames[0].script 过长({len(script)}字 > {MAX_FIRST_HOOK_SCRIPT_LEN})，"
                        "首帧建议只讲主题与主结论"
                    )

            # subtitle/script 防复读：若 subtitle 与 script 高度重复，要求重写 subtitle
            subtitle = str(frame.get("subtitle", "")).strip()
            if subtitle and script and is_redundant_text(subtitle, script):
                errors.append(f"{prefix}.subtitle 与 script 高度重复，请改写避免同屏复读")
            if i == 0:
                if not subtitle:
                    errors.append("frames[0].subtitle 不能为空，建议写成带动作的完整句子")
                elif not is_actionable_sentence(subtitle):
                    errors.append(
                        "frames[0].subtitle 建议改为带动作的完整句子，例如“先拆任务再分配执行，避免漏项”。"
                    )
                if subtitle and (len(subtitle) < 16 or len(subtitle) > 32):
                    errors.append(
                        f"frames[0].subtitle 推荐 16~32 字，当前 {len(subtitle)} 字，"
                        "建议调整以保证首帧中央信息区视觉稳定。"
                    )

            # 禁止字符
            title = frame.get("title", "")
            for ch in BANNED_CHARS:
                if ch in title:
                    errors.append(f"{prefix}.title 含禁止字符 '{ch}'")
                if ch in script:
                    errors.append(f"{prefix}.script 含禁止字符 '{ch}'")
                if subtitle and ch in subtitle:
                    errors.append(f"{prefix}.subtitle 含禁止字符 '{ch}'")

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

            # ── bullets 类型专项（M1）──
            if ftype == "bullets":
                raw_items = frame.get("items", [])
                if not isinstance(raw_items, list):
                    errors.append(f"{prefix}.items 必须是数组")
                elif len(raw_items) < 2:
                    errors.append(f"{prefix}.items 至少需要 2 条要点")
                elif len(raw_items) > 8:
                    errors.append(f"{prefix}.items 超过上限 8 条")
                else:
                    for j, it in enumerate(raw_items):
                        ip = f"{prefix}.items[{j}]"
                        if not isinstance(it, dict):
                            errors.append(f"{ip} 必须为对象，且包含 title 与 desc")
                            continue
                        title = str(it.get("title", "")).strip()
                        desc = str(it.get("desc", "")).strip()
                        if not title:
                            errors.append(f"{ip}.title 不能为空（由 LLM 总结右列要点）")
                        if not desc:
                            errors.append(f"{ip}.desc 不能为空（正文解释内容）")
                        if title and len(title) > MAX_BULLET_TITLE_LEN:
                            errors.append(f"{ip}.title 过长(>{MAX_BULLET_TITLE_LEN}字)")
                        if desc and len(desc) > MAX_BULLET_ITEM_LEN:
                            errors.append(f"{ip}.desc 过长(>{MAX_BULLET_ITEM_LEN}字)")
                        for field_name, blob in (("title", title), ("desc", desc)):
                            if not blob:
                                continue
                            for ch in BANNED_CHARS:
                                if ch in blob:
                                    errors.append(f"{ip}.{field_name} 含禁止字符 '{ch}'")

            # ── kpi 类型专项（M1）──
            if ftype == "kpi":
                value = str(frame.get("value", "")).strip()
                label = str(frame.get("label", "")).strip()
                unit = str(frame.get("unit", "")).strip()
                footnote = str(frame.get("footnote", "")).strip()
                kpis = frame.get("kpis", [])
                has_kpis = isinstance(kpis, list) and len(kpis) > 0

                if has_kpis:
                    if len(kpis) < 2:
                        errors.append(f"{prefix}.kpis 至少需要 2 项")
                    if len(kpis) > MAX_KPI_ITEMS:
                        errors.append(f"{prefix}.kpis 超过上限 {MAX_KPI_ITEMS} 项")
                    for j, it in enumerate(kpis[:MAX_KPI_ITEMS]):
                        kp = f"{prefix}.kpis[{j}]"
                        if not isinstance(it, dict):
                            errors.append(f"{kp} 必须是对象")
                            continue
                        t = str(it.get("title", "")).strip()
                        v = str(it.get("value", "")).strip()
                        lb = str(it.get("label", "")).strip()
                        ut = str(it.get("unit", "")).strip()
                        if not t:
                            errors.append(f"{kp}.title 不能为空")
                        if not v:
                            errors.append(f"{kp}.value 不能为空")
                        elif len(v) > MAX_KPI_VALUE_LEN:
                            errors.append(f"{kp}.value 过长(>{MAX_KPI_VALUE_LEN}字)")
                        for field_name, blob in (("title", t), ("value", v), ("label", lb), ("unit", ut)):
                            if not blob:
                                continue
                            for ch in BANNED_CHARS:
                                if ch in blob:
                                    errors.append(f"{kp}.{field_name} 含禁止字符 '{ch}'")
                else:
                    if not value:
                        errors.append(f"{prefix}.value 不能为空（或提供 kpis[]）")
                    elif len(value) > MAX_KPI_VALUE_LEN:
                        errors.append(f"{prefix}.value 过长(>{MAX_KPI_VALUE_LEN}字)")
                    if not label:
                        errors.append(f"{prefix}.label 不能为空（用于解释指标含义）")
                for field_name, blob in (
                    ("value", value),
                    ("label", label),
                    ("unit", unit),
                    ("footnote", footnote),
                ):
                    if not blob:
                        continue
                    for ch in BANNED_CHARS:
                        if ch in blob:
                            errors.append(f"{prefix}.{field_name} 含禁止字符 '{ch}'")
                if footnote and len(footnote) > MAX_FOOTNOTE_LEN:
                    errors.append(f"{prefix}.footnote 过长(>{MAX_FOOTNOTE_LEN}字)")

            # ── quote 类型专项（M1）──
            if ftype == "quote":
                qbody = str(frame.get("quote", "")).strip()
                attr = str(frame.get("attribution", "")).strip()
                if not qbody:
                    errors.append(f"{prefix}.quote 不能为空")
                elif len(qbody) < MIN_QUOTE_BODY_LEN:
                    errors.append(
                        f"{prefix}.quote 过短({len(qbody)}字 < {MIN_QUOTE_BODY_LEN})，请写完整引用内容"
                    )
                elif len(qbody) > MAX_QUOTE_BODY_LEN:
                    errors.append(f"{prefix}.quote 过长(>{MAX_QUOTE_BODY_LEN}字)")
                for ch in BANNED_CHARS:
                    if ch in qbody:
                        errors.append(f"{prefix}.quote 含禁止字符 '{ch}'")
                    if attr and ch in attr:
                        errors.append(f"{prefix}.attribution 含禁止字符 '{ch}'")
                if qbody and script and not has_quote_alignment(script, qbody):
                    errors.append(
                        f"{prefix}.script 与 quote 主体不一致，请围绕引用内容讲解"
                    )

        # 相邻帧防复读：尤其拦截自动拆页后前后页开头重复
        for i in range(1, len(frames)):
            prev = frames[i - 1]
            curr = frames[i]
            prev_script = str(prev.get("script", "")).strip()
            curr_script = str(curr.get("script", "")).strip()
            if not prev_script or not curr_script:
                continue

            prev_lead = leading_script_chunk(prev_script, 40)
            curr_lead = leading_script_chunk(curr_script, 40)
            if is_redundant_text(prev_lead, curr_lead):
                errors.append(
                    f"frames[{i-1}] 与 frames[{i}] 开头表达高度重复，请避免相邻帧复读"
                )

            prev_id = str(prev.get("id", ""))
            curr_id = str(curr.get("id", ""))
            if curr_id.endswith("_p2") or curr_id.startswith(f"{prev_id}_p"):
                if is_redundant_text(prev_script, curr_script):
                    errors.append(
                        f"frames[{i}] 疑似拆页续帧但文案与上一帧重复，请重写后一帧开头"
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