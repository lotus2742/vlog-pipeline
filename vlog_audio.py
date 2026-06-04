#!/usr/bin/env python3
"""
通用配音+SRT生成
接收frames.json,为每帧生成 audio/{id}.mp3 + audio/{id}.srt
用法: python3 vlog_audio.py frames.json
"""

import json, sys, os, asyncio, subprocess, re, math
from pathlib import Path

import edge_tts

PROXY=None
MAX_RETRY = 3
FALLBACK_VOICE = "zh-CN-XiaoyiNeural"

def fmt_srt_time(t):
    h = int(t // 3600); m = int((t % 3600)//60); s=int(t%60);ms=int((t%1)*1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def tts_strip_visual_marks(text: str) -> str:
    """去掉送入 TTS 的装饰符号（叉/勾等），避免 Edge TTS 把 Unicode 符号念出来；画面上仍可保留图标。"""
    if not text:
        return text
    for ch in (
        "\u274c",  # ❌
        "\u2705",  # ✅
        "\u2713",  # ✓
        "\u2717",  # ✗
        "\u2718",  # ✘
        "\u2611",  # ☑
    ):
        text = text.replace(ch, "")
    text = re.sub(r"[ \t\u3000]{2,}", " ", text)
    text = re.sub(r" *\n *\n+", "\n\n", text)
    return text.strip()


# Edge TTS 多音字：长短语优先替换，仅用于配音（JSON 画面文案可保持原样）
_TTS_PRONUNCIATION_PAIRS: list[tuple[str, str]] = [
    # 率 lǜ（比例）— 易被读成 shuài（率真）
    ("成功率", "成功占比"),
    ("失败率", "失败占比"),
    ("通过率", "通过占比"),
    ("准确率", "准确占比"),
    ("转化率", "转化占比"),
    ("命中率", "命中占比"),
    ("占有率", "占有比例"),
    ("增长率", "增长比例"),
    ("错误率", "错误占比"),
    ("召回率", "召回占比"),
    ("利用率", "利用占比"),
    ("覆盖率", "覆盖占比"),
    # 行 háng（代码行 / CLI）
    ("命令行包装器", "C L I 包装器"),
    ("命令行", "C L I"),
    ("代码才100行", "代码才一百行"),
    ("好100倍", "好一百倍"),
    ("100行", "一百行"),
    # 重 zhòng/chóng
    ("重量级选手", "重量级别选手"),
    # 难读词
    ("拥趸", "支持者"),
    # 数字连读
    ("30万9000个Stars", "三十万九千颗星"),
    ("30万9000", "三十万九千"),
    ("55000个token", "五万五千个 token"),
    ("55000", "五万五千"),
    ("编号20873", "编号二万零八百七十三"),
    ("高17倍", "高十七倍"),
    ("低28个百分点", "低二十八个百分点"),
    ("为高频调用", "为了高频调用"),
    # 槛 kǎn（门槛）— 易被读成 jiàn
    ("门槛", "门坎"),
]

# 口播 TTS 用字与字幕展示不一致时，生成字幕后还原
_CAPTION_DISPLAY_REVERT: list[tuple[str, str]] = [
    ("门坎", "门槛"),
]


def _digits_to_cn_short(num_str: str) -> str:
    """1–999 转中文，供「N行」等口播使用。"""
    try:
        n = int(num_str)
    except ValueError:
        return num_str
    if n < 0 or n > 999:
        return num_str
    digits = "零一二三四五六七八九"
    if n < 10:
        return digits[n]
    if n == 10:
        return "十"
    if n < 20:
        return "十" + digits[n % 10]
    if n % 10 == 0:
        return digits[n // 10] + "十"
    if n < 100:
        return digits[n // 10] + "十" + digits[n % 10]
    if n == 100:
        return "一百"
    if n < 200:
        return "一百" + (digits[n % 100] if n % 100 else "")
    if n % 100 == 0:
        return digits[n // 100] + "百"
    return str(n)


def normalize_tts_pronunciation(text: str) -> str:
    """将口播中的多音字/易错读替换为 TTS 更稳的说法。"""
    if not text:
        return text
    out = text
    for src, dst in sorted(_TTS_PRONUNCIATION_PAIRS, key=lambda x: len(x[0]), reverse=True):
        out = out.replace(src, dst)
    out = re.sub(
        r"(成功|失败|通过|准确|转化|命中|错误|召回|利用|覆盖|增长|占用)率",
        r"\1占比",
        out,
    )
    out = re.sub(
        r"(?<![0-9A-Za-z])(\d{1,3})行(?![a-zA-Z])",
        lambda m: _digits_to_cn_short(m.group(1)) + "行",
        out,
    )
    return out


def prepare_tts_text(text: str) -> str:
    return normalize_tts_pronunciation(tts_strip_visual_marks(text))


def caption_display_text(text: str) -> str:
    """字幕展示文案：还原仅用于 TTS 的替代表达。"""
    if not text:
        return text
    out = text
    for src, dst in _CAPTION_DISPLAY_REVERT:
        out = out.replace(src, dst)
    return out


def display_width(s):
    return sum(1 if ord(c) > 127 else 0.5 for c in s)

def _tokenize_caption_units(text: str) -> list[str]:
    """中文按字、英文按整词切分，避免字幕把 Claude 撕成 Claud/e。"""
    units: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch.isascii() and (ch.isalnum() or ch in "._-/"):
            j = i + 1
            while j < n and text[j].isascii() and (text[j].isalnum() or text[j] in "._-/"):
                j += 1
            units.append(text[i:j])
            i = j
        else:
            units.append(ch)
            i += 1
    return units


def simple_split(text, max_w=13):
    lines, cur, cw = [], [], 0.0
    for unit in _tokenize_caption_units(text):
        w = display_width(unit)
        if cw + w > max_w and cur:
            lines.append("".join(cur))
            cur, cw = [], 0.0
        cur.append(unit)
        cw += w
    if cur:
        lines.append("".join(cur))
    return lines


_PUNCT = set("，。！？；：,.!?;:、")


def _is_break_token(token_text: str) -> bool:
    t = (token_text or "").strip()
    if not t:
        return False
    return any(ch in _PUNCT for ch in t)


def _line_from_tokens(tokens):
    if not tokens:
        return None
    s = tokens[0]["offset"]
    e = tokens[-1]["offset"] + tokens[-1]["duration"]
    txt = "".join(t["text"] for t in tokens)
    return (s, e, txt)


def split_word_boundaries(words, max_w=13):
    """
    基于 WordBoundary 的更稳断句：
    - 优先在标点处分割
    - 避免把英文词 / 单个 token 硬拆
    """
    if not words:
        return []
    lines = []
    cur = []
    cur_w = 0.0
    last_break_idx = -1

    i = 0
    n = len(words)
    while i < n:
        w = words[i]
        token = w.get("text", "")
        token_w = display_width(token)
        cur.append(w)
        cur_w += token_w
        if _is_break_token(token):
            last_break_idx = len(cur) - 1

        # 未超宽继续
        if cur_w < max_w:
            i += 1
            continue

        # 超宽：优先在最近标点处分割
        cut = None
        if last_break_idx >= 0 and last_break_idx < len(cur) - 1:
            cut = last_break_idx + 1
        elif len(cur) >= 2:
            # 次优：切在当前 token 之前，避免 token 被拆散
            cut = len(cur) - 1
        else:
            cut = 1

        left = cur[:cut]
        right = cur[cut:]
        line = _line_from_tokens(left)
        if line:
            lines.append(line)

        cur = right
        cur_w = display_width("".join(t["text"] for t in cur))
        last_break_idx = -1
        for idx, tk in enumerate(cur):
            if _is_break_token(tk.get("text", "")):
                last_break_idx = idx
        i += 1

    tail = _line_from_tokens(cur)
    if tail:
        lines.append(tail)
    return lines


def semantic_split(text, max_w=13):
    """
    语义优先切分：
    - 先按句号/问号/叹号/分号切句
    - 再按逗号/顿号切短语并做装箱
    - 尽量不在词内部硬切
    """
    text = (text or "").strip()
    if not text:
        return []
    # 一级分句（保留分隔符）
    sentence_parts = []
    buf = ""
    for ch in text:
        buf += ch
        if ch in "。！？；!?;":
            sentence_parts.append(buf.strip())
            buf = ""
    if buf.strip():
        sentence_parts.append(buf.strip())

    out = []
    for sent in sentence_parts:
        # 二级短语（按逗号/顿号）
        clauses = []
        cb = ""
        for ch in sent:
            cb += ch
            if ch in "，、,:：":
                clauses.append(cb)
                cb = ""
        if cb:
            clauses.append(cb)

        line = ""
        for c in clauses:
            c = c.strip()
            if not c:
                continue
            # 纯标点短句不单独成行，挂到上一行
            if all(ch in "，、,:：。！？!?;" for ch in c):
                if line:
                    line += c
                elif out:
                    out[-1] = out[-1] + c
                continue
            # 避免行首出现标点（如“，而是...”）
            c = c.lstrip("，、,:：")
            if not c:
                continue
            cand = (line + c).strip()
            if not line:
                line = c
                continue
            if display_width(cand) <= max_w:
                line = cand
            else:
                out.append(line.strip())
                line = c
        if line.strip():
            out.append(line.strip())

    # 兜底：若仍有超长短句，再用 simple_split 细切
    final = []
    for ln in out:
        if display_width(ln) <= max_w:
            final.append(ln)
        else:
            final.extend(simple_split(ln, max_w=max_w))
    # 清理因兜底切分造成的“纯标点单行”
    merged = []
    for ln in final:
        t = ln.strip()
        if not t:
            continue
        if all(ch in "，、,:：。！？!?;" for ch in t):
            if merged:
                merged[-1] = merged[-1] + t
            continue
        merged.append(t)

    # 若出现“收益 / 提升”这类被拆成极短尾行，优先并回上一行
    # 允许轻微超宽，换取词语完整性与可读性
    stitched = []
    for ln in merged:
        if stitched:
            prev = stitched[-1]
            is_short_tail = display_width(ln) <= 3.0
            can_join = display_width(prev + ln) <= (max_w + 2.0)
            if is_short_tail and can_join:
                stitched[-1] = prev + ln
                continue
        stitched.append(ln)

    return stitched


def _assign_timings_proportional(line_texts: list[str], dur: float) -> list[tuple[float, float, str]]:
    if not line_texts:
        return []
    if dur <= 0:
        dur = 10.0
    widths = [display_width(ln) for ln in line_texts]
    total_w = sum(widths) or 1.0
    t = 0.0
    lines: list[tuple[float, float, str]] = []
    for i, (ln, w) in enumerate(zip(line_texts, widths)):
        te = t + dur * (w / total_w)
        if i == len(line_texts) - 1:
            te = dur
        lines.append((max(0.0, t), max(t, min(te, dur)), ln))
        t = te
    if lines:
        ls, _, lt = lines[-1]
        lines[-1] = (ls, dur, lt)
    return lines


def _assign_timings_by_words(
    line_texts: list[str], words: list, dur: float
) -> list[tuple[float, float, str]]:
    """按词边界时间轴分配字幕时段，文案仍用 line_texts（与口播文本一致）。"""
    if not line_texts:
        return []
    if dur <= 0:
        dur = 10.0
    t_start = float(words[0].get("offset", 0))
    t_end = max(
        float(words[-1].get("offset", 0)) + float(words[-1].get("duration", 0)),
        dur,
    )
    span = max(t_end - t_start, 0.05)
    widths = [display_width(ln) for ln in line_texts]
    total_w = sum(widths) or 1.0
    t = t_start
    lines: list[tuple[float, float, str]] = []
    for i, (ln, w) in enumerate(zip(line_texts, widths)):
        seg = span * (w / total_w)
        te = t + seg
        if i == len(line_texts) - 1:
            te = t_end
        lines.append((max(t_start, t), max(t, min(te, t_end)), ln))
        t = te
    if lines:
        ls, _, lt = lines[-1]
        lines[-1] = (ls, t_end, lt)
    return lines


def _merge_broken_latin_lines(line_texts: list[str]) -> list[str]:
    """兜底：合并因超宽被拆开的英文残片（如 Claud + e 里用的）。"""
    if len(line_texts) < 2:
        return line_texts
    merged: list[str] = []
    for ln in line_texts:
        if not merged:
            merged.append(ln)
            continue
        prev = merged[-1]
        if re.search(r"[A-Za-z]$", prev) and re.match(r"^[a-z]{1,4}", ln):
            merged[-1] = prev + ln
        else:
            merged.append(ln)
    return merged


def build_caption_lines(
    tts_text: str, words: list, dur: float, *, max_w: int = 16
) -> list[tuple[float, float, str]]:
    """
    字幕与口播保持一致：文案来自送入 TTS 的文本（语义断句），
    时间轴优先对齐 WordBoundary，避免把英文单词拆成 Cla/ude 这类碎片。
    """
    line_texts = _merge_broken_latin_lines(semantic_split(tts_text, max_w=max_w))
    if not line_texts and tts_text.strip():
        line_texts = [tts_text.strip()]
    line_texts = [caption_display_text(t) for t in line_texts]
    if words and len(words) >= 2:
        return _assign_timings_by_words(line_texts, words, dur)
    return _assign_timings_proportional(line_texts, dur)


def probe_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    try:
        return float((r.stdout or "").strip() or "0")
    except ValueError:
        return 0.0

def min_expected_duration(text):
    # 粗略下限：中文约 4~6 字/秒，给足容错避免误判
    # 太短通常是网络中断或流提前结束导致的残缺音频
    return max(0.8, len((text or "").strip()) * 0.08)


def _looks_like_code_block(s: str) -> bool:
    t = s or ""
    if len(t) > 280:
        return True
    if t.count("\n") >= 6:
        return True
    if "{" in t and ("}" in t or '"name"' in t):
        return True
    if "def " in t or "import " in t or "interface " in t or "export " in t:
        return True
    return False


def _short_clause(s: str, max_len: int = 42) -> str:
    """取一小截可读片段，避免把画面上的小字全文念完。"""
    t = (s or "").strip().replace("\n", " ")
    if not t:
        return ""
    for sep in ("｜", "；", "。", "：", "!", "?", "\t"):
        if sep in t:
            t = t.split(sep)[0].strip()
            break
    if len(t) > max_len:
        t = t[: max_len - 1].rstrip("，、 ") + "…"
    return t


def _supplement_line(title: str) -> str:
    """穿插一两句背景理解，口吻像课堂延展，不说「请注意」「划重点」之类。"""
    if not title:
        return ""
    hints = (
        ("MCP", "可以理解成模型和外部工具之间的一套通用接口，各家按同一套规矩对接。"),
        ("沙箱", "执行环境边界很关键：能碰哪些文件、网络能不能出去，这些要先定义清楚。"),
        ("ReAct", "思路是先想清楚再动手，行动之后看结果，再决定下一步，循环下去。"),
        ("Plan-and-Solve", "步骤特别多的时候，先有一张路线图再执行，中途卡住再改计划，往往比闷头试错稳。"),
        ("RAG", "先把代码库做成可查的片段，提问时把相关上下文放进提示里，能减少凭空编造。"),
        ("Agent Loop", "整体上就是做事、看反馈、再决定下一步，形成一个闭环。"),
        ("成本", "常见做法是压缩上下文、少重复塞整仓代码，简单任务不必处处用大模型。"),
        ("避坑", "很多时候出在上下文不够、没写清楚何时停手，或者权限放得太宽。"),
        ("决策矩阵", "选型时可以对照：你是谁、任务有多重、要不要绑死某家生态或合规要求。"),
        ("转型", "能力一般是分阶段往上涨的，很少能一步到位从技术跳到产品。"),
        ("前沿", "行业里多 Agent 协作、以及人审 PR、机器落地干活，这两条动向比较明显。"),
        ("上下文", "工作记忆、会话摘要和长期知识库，三层各自管的事不一样。"),
        ("代码检索", "典型流程是索引、切块、向量检索，再把检索结果带回提示词。"),
        ("推荐", "一句话定位能帮你缩小范围，具体还要看你仓库规模和团队协作方式。"),
        ("对比", "表里数字不必全背，找到自己关心的那几行就够用了。"),
        ("前端", "React、请求封装、测试这几块，画面里是范例，套路可以迁到自己项目里。"),
        ("Claude Code", "多文件推理和终端流很强；日常细碎编辑很多人会再配一个 IDE。"),
        ("Cursor", "更偏编辑器主场，补全快、改起来顺手，复杂链路可以再配合终端里的 Agent。"),
        ("Copilot", "跟企业和 GitHub 流水线绑得紧的项目里，经常会优先考虑它。"),
        ("附录", "链接和书单在画面上，需要的话可以记下来回头点开。"),
    )
    for key, sentence in hints:
        if key in title:
            return sentence
    return ""


def slide_narration_text(slide: dict) -> str:
    """
    口播策略：默认「串讲 + 简略」，不全念 PPT。
    - 若 frame.voiceScript 或 frame.narration 有内容，则完全以该字段为准（自行控制详略）。
    - hook 仍可用 frame.script。
    - quote 代码页不念全文。
    """
    fr = slide.get("frame") if isinstance(slide.get("frame"), dict) else {}
    manual = (fr.get("voiceScript") or fr.get("narration") or "").strip()
    if manual:
        return manual

    script = (fr.get("script") or "").strip()
    if script:
        return script

    title = (fr.get("title") or "").strip()
    subtitle = (fr.get("subtitle") or "").strip()
    slide_type = str(slide.get("type") or "").lower()

    if slide_type == "quote":
        quote = (fr.get("quote") or "").strip()
        parts = []
        if title:
            parts.append(title)
        extra = _supplement_line(title)
        if extra:
            parts.append(extra)
        if quote and _looks_like_code_block(quote):
            parts.append("这一段比较长，我就不照着读了，你看屏幕上的结构和关键字就好。")
            return "。".join(parts)
        if quote:
            parts.append(_short_clause(quote, 120))
        return "。".join(parts) if parts else ""

    parts: list[str] = []
    if title:
        parts.append(title)
    if subtitle and len(subtitle) <= 48:
        parts.append(subtitle)
    elif subtitle:
        parts.append(_short_clause(subtitle, 44))

    # bullets：前几项展开讲，语气直接陈述，不加「我帮你浓缩」类元话语
    items = fr.get("items") if isinstance(fr.get("items"), list) else []
    if items:
        n = len(items)
        cap = 3 if n >= 6 else 4 if n >= 4 else n
        spoken = []
        for it in items[:cap]:
            if not isinstance(it, dict):
                continue
            tit = (it.get("title") or "").strip()
            desc = _short_clause(it.get("desc") or "", 38)
            if tit and desc:
                spoken.append(f"{tit}，{desc}")
            elif tit:
                spoken.append(tit)
            elif desc:
                spoken.append(desc)
        if spoken:
            body = "。".join(spoken)
            if n > cap:
                parts.append(body + f"。后面还有{n - cap}条，表里写得更细。")
            else:
                parts.append(body)

    # timeline：按节点点名
    milestones = fr.get("milestones") if isinstance(fr.get("milestones"), list) else []
    if milestones and str(slide.get("type") or "").lower() == "timeline":
        spoken = []
        for m in milestones[:6]:
            if not isinstance(m, dict):
                continue
            lab = (m.get("label") or m.get("title") or "").strip()
            desc = _short_clause(m.get("desc") or "", 40)
            if lab and desc:
                spoken.append(f"{lab}，{desc}")
            elif desc:
                spoken.append(desc)
        if spoken:
            parts.append("。".join(spoken))

    # cards：自然点名 + 一句收束
    cards = fr.get("cards") if isinstance(fr.get("cards"), list) else []
    if cards:
        names = []
        for c in cards:
            if not isinstance(c, dict):
                continue
            ct = (c.get("title") or c.get("label") or "").strip()
            if ct:
                names.append(ct)
        if names:
            parts.append(
                "、".join(names[:8]) + "。各家定位和价钱表里都有，可以对着自己的场景比一比。"
            )

    # comparison：陈述对照关系，不说「跟着我听完」
    rows = fr.get("compareRows") if isinstance(fr.get("compareRows"), list) else []
    if rows:
        clean = [r for r in rows if isinstance(r, dict) and (str(r.get("left") or "").strip() or str(r.get("right") or "").strip())]
        if clean:
            samples = []
            for r in clean[:2]:
                left = _short_clause(str(r.get("left") or ""), 28)
                right = _short_clause(str(r.get("right") or ""), 36)
                if left and right:
                    samples.append(f"{left}，对应{right}")
                elif left:
                    samples.append(left)
                elif right:
                    samples.append(right)
            if samples:
                parts.append("。".join(samples))
            if len(clean) > 2:
                parts.append("再往后几行也是同类对照，扫一眼结构就行。")

    left = fr.get("left") if isinstance(fr.get("left"), dict) else {}
    right = fr.get("right") if isinstance(fr.get("right"), dict) else {}
    for _, side in (("左", left), ("右", right)):
        pts = side.get("points") if isinstance(side.get("points"), list) else []
        if pts and not rows:
            gist = [_short_clause(str(p), 36) for p in pts[:3] if str(p).strip()]
            if gist:
                parts.append("；".join(gist))
                if len(pts) > 3:
                    parts.append("更多的在画面上。")

    insight = (fr.get("insight") or "").strip()
    if insight:
        parts.append(_short_clause(insight, 56))

    sup = _supplement_line(title)
    if sup:
        parts.append(sup)

    out = "。".join(parts) if parts else title
    return out.strip()


def parse_srt_to_captions(srt_path: str) -> list:
    text = Path(srt_path).read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return []
    blocks = re.split(r"\n\s*\n", text)
    cues = []
    for block in blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        if "-->" in lines[0]:
            time_line = lines[0]
            body_lines = lines[1:]
        elif len(lines) >= 3 and "-->" in lines[1]:
            time_line = lines[1]
            body_lines = lines[2:]
        else:
            continue
        try:
            start_ts, end_ts = [s.strip() for s in time_line.split("-->", 1)]

            def _ts_sec(ts: str) -> float:
                hh, mm, rest = ts.split(":")
                ss, ms = rest.split(",")
                return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0

            start_s = _ts_sec(start_ts)
            end_s = _ts_sec(end_ts)
        except Exception:
            continue
        body = " ".join(body_lines).strip()
        if body:
            cues.append({"start": start_s, "end": end_s, "text": body})
    return cues


def infer_public_dir(json_path: Path) -> Path:
    """studio-preview/*.json -> 其父目录的父目录即为 remotion public。"""
    if json_path.parent.name == "studio-preview":
        return json_path.parent.parent
    return json_path.parent

async def gen_audio(fid, text, voice, rate, audio_dir, force=False):
    text = prepare_tts_text(text)
    mp3 = os.path.join(audio_dir, f"{fid}.mp3")
    srt = os.path.join(audio_dir, f"{fid}.srt")
    expected_min_dur = min_expected_duration(text)
    if (not force) and os.path.exists(mp3) and os.path.exists(srt):
        old_dur = probe_duration(mp3)
        if old_dur >= expected_min_dur:
            print(f"{fid}: 已存在且时长正常({old_dur:.2f}s), 跳过")
            return
        print(f"{fid}: 旧音频疑似残缺({old_dur:.2f}s), 自动重生成")

    words = []
    last_err = None
    for attempt in range(1, MAX_RETRY + 1):
        tmp_mp3 = f"{mp3}.tmp"
        words = []
        audio_bytes = 0
        try:
            kwargs = dict(text=text, voice=voice, rate=rate)
            if PROXY:
                kwargs["proxy"] = PROXY
            comm = edge_tts.Communicate(**kwargs)
            with open(tmp_mp3, "wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        data = chunk.get("data", b"")
                        audio_bytes += len(data)
                        f.write(data)
                    elif chunk["type"] == "WordBoundary":
                        words.append({
                            "text": chunk.get("text", ""),
                            "offset": chunk["offset"] / 10_000_000,
                            "duration": chunk["duration"] / 10_000_000,
                        })
            dur = probe_duration(tmp_mp3)
            if audio_bytes < 2048 or dur < expected_min_dur:
                raise RuntimeError(
                    f"音频异常(字节={audio_bytes}, 时长={dur:.2f}s, 预期>= {expected_min_dur:.2f}s)"
                )
            os.replace(tmp_mp3, mp3)
            break
        except Exception as e:
            last_err = e
            if os.path.exists(tmp_mp3):
                os.remove(tmp_mp3)
            if attempt < MAX_RETRY:
                print(f"{fid}: 第{attempt}次失败，重试中... ({e})")
                await asyncio.sleep(0.8 * attempt)
            else:
                raise RuntimeError(f"{fid}: 生成失败，已重试{MAX_RETRY}次: {last_err}")

    dur = probe_duration(mp3)
    if dur <= 0:
        dur = 10.0

    lines = build_caption_lines(text, words, dur, max_w=14)

    with open(srt, "w", encoding='utf-8') as f:
        for i, (s, e, txt) in enumerate(lines, 1):
            f.write(f"{i}\n{fmt_srt_time(s)} --> {fmt_srt_time(e)}\n{txt}\n\n")
    print(f"{fid}: {len(lines)}行字幕")

async def _gen_one(fid: str, script: str, voice: str, rate: str, audio_dir: str, force: bool) -> None:
    try:
        await gen_audio(fid, script, voice, rate, audio_dir, force=force)
    except Exception as primary_err:
        if voice != FALLBACK_VOICE:
            print(f"{fid}: 主音色失败，尝试备用音色 {FALLBACK_VOICE} ({primary_err})")
            try:
                await gen_audio(fid, script, FALLBACK_VOICE, rate, audio_dir, force=force)
                await asyncio.sleep(0.3)
                return
            except Exception as fallback_err:
                raise RuntimeError(
                    f"{fid}: 主音色({voice})与备用音色({FALLBACK_VOICE})均失败: "
                    f"{primary_err} | {fallback_err}"
                ) from fallback_err
        raise


async def main(json_path, audio_dir, force=False):
    os.makedirs(audio_dir, exist_ok=True)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    meta = data.get("meta", {})
    voice = meta.get("voice", "zh-CN-XiaoyiNeural")
    rate = meta.get("rate", "+5%")
    frames = data.get("frames", [])
    print(f"生成 {len(frames)}段配音-->{audio_dir}/")
    for frame in frames:
        fid = frame.get("id", "00")
        script = frame.get("script", "")
        if not script:
            print(f"{fid}: 无配音脚本,跳过")
            continue
        await _gen_one(str(fid), script, voice, rate, audio_dir, force)
        await asyncio.sleep(0.3)
    print("\n配音完成")


FPS_DEFAULT = 30
FRAME_PAD = 6  # ~0.2s，避免口播尾部被截断；镜间留白尽量小以保持连贯
CAPTION_TAIL_S = 0.12  # 口播结束后极短留白


def speech_end_seconds(audio_sec: float, captions: list | None) -> float:
    """有字幕时以最后一条字幕结束为准（避免 mp3 尾静音或旧时长拖累）。"""
    cap_end = 0.0
    if captions:
        for cue in captions:
            if isinstance(cue, dict) and cue.get("end") is not None:
                cap_end = max(cap_end, float(cue["end"]))
    if cap_end > 0:
        effective = cap_end + CAPTION_TAIL_S
        if audio_sec and audio_sec > 0:
            return min(float(audio_sec), effective)
        return effective
    return float(audio_sec or 0)


def compute_slide_duration_frames(audio_sec: float, captions: list | None = None) -> int:
    return max(15, int(math.ceil(speech_end_seconds(audio_sec, captions) * FPS_DEFAULT)) + FRAME_PAD)


async def main_slides_studio_bundle(
    json_path: Path, bundle: str, force: bool, *, resync_durations: bool = False
) -> None:
    """为 slides[] 生成口播，写入 public/studio-audio/<bundle>/，并回写 audioSrc、captions、durationInFrames。"""
    json_path = json_path.expanduser().resolve()
    public_dir = infer_public_dir(json_path)
    audio_dir = public_dir / "studio-audio" / bundle
    audio_dir.mkdir(parents=True, exist_ok=True)

    text = json_path.read_text(encoding="utf-8")
    data = json.loads(text)
    slides = data.get("slides")
    if not isinstance(slides, list):
        raise SystemExit("JSON 中未找到 slides 数组（studio-bundle 模式仅支持 slides 格式）")

    meta = data.get("meta", {})
    if not isinstance(meta, dict):
        meta = {}
    voice = meta.get("voice", "zh-CN-XiaoyiNeural")
    rate = meta.get("rate", "+5%")

    action = "重算时长" if resync_durations else "配音"
    print(f"slides {action} x{len(slides)} -> {audio_dir}/")
    rel_prefix = f"studio-audio/{bundle}"

    for slide in slides:
        if not isinstance(slide, dict):
            continue
        fid = str(slide.get("id", "")).strip()
        if not fid:
            print("(跳过：无 id)")
            continue
        mp3 = audio_dir / f"{fid}.mp3"
        srt = audio_dir / f"{fid}.srt"

        if resync_durations:
            if not mp3.is_file():
                print(f"{fid}: 无 mp3，跳过")
                continue
        else:
            narration = slide_narration_text(slide).strip()
            if not narration:
                print(f"{fid}: 无可朗读文本，跳过")
                slide.pop("audioSrc", None)
                continue
            await _gen_one(fid, narration, voice, rate, str(audio_dir), force)

        dur = probe_duration(str(mp3))
        # 优先读磁盘 SRT：--force 重生成口播后 JSON 里 captions 可能仍是旧版，
        # 若用旧字幕算 durationInFrames 会导致口播未播完就切镜。
        if srt.is_file():
            captions = parse_srt_to_captions(str(srt))
        elif isinstance(slide.get("captions"), list):
            captions = slide.get("captions")
        else:
            captions = None
        frames_dur = compute_slide_duration_frames(dur, captions)
        slide["durationInFrames"] = frames_dur
        slide["audioSrc"] = f"{rel_prefix}/{fid}.mp3"
        if captions is not None:
            slide["captions"] = captions
        slide.pop("captionKeywords", None)
        await asyncio.sleep(0.3)

    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_frames = sum(max(15, int(s.get("durationInFrames") or 90)) for s in slides if isinstance(s, dict))
    print(f"\n配音完成；已写回 {json_path}")
    print(f"总时长约 {total_frames / FPS_DEFAULT:.1f}s ({total_frames} frames @ {FPS_DEFAULT}fps)")


if __name__ == "__main__":
    argv = [a for a in sys.argv[1:] if a]
    force = "--force" in argv
    resync_durations = "--resync-durations" in argv
    argv = [a for a in argv if a not in ("--force", "--resync-durations")]

    studio_bundle = None
    filtered = []
    i = 0
    while i < len(argv):
        if argv[i] == "--studio-bundle" and i + 1 < len(argv):
            studio_bundle = argv[i + 1]
            i += 2
            continue
        filtered.append(argv[i])
        i += 1
    argv = filtered

    json_arg = argv[0] if argv else "frames.json"

    if studio_bundle:
        jp = Path(json_arg)
        asyncio.run(
            main_slides_studio_bundle(
                jp, studio_bundle, force, resync_durations=resync_durations
            )
        )
    else:
        audio_dir = os.path.join(os.path.dirname(os.path.abspath(json_arg)), "audio")
        asyncio.run(main(json_arg, audio_dir, force=force))