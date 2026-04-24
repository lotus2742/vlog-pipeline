#!/usr/bin/env python3
"""
通用配音+SRT生成
接收frames.json,为每帧生成 audio/{id}.mp3 + audio/{id}.srt
用法: python3 vlog_audio.py frames.json
"""

import json, sys, os, asyncio, subprocess
import edge_tts

PROXY=None
MAX_RETRY = 3
FALLBACK_VOICE = "zh-CN-XiaoyiNeural"

def fmt_srt_time(t):
    h = int(t // 3600); m = int((t % 3600)//60); s=int(t%60);ms=int((t%1)*1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def display_width(s):
    return sum(1 if ord(c) > 127 else 0.5 for c in s)

def simple_split(text, max_w=13):
    lines, cur, cw = [], [], 0.0
    for ch in text:
        w = 1 if ord(ch) > 127 else 0.5
        if cw + w > max_w and cur:
            lines.append("".join(cur));cur,cw = [],0.0
        cur.append(ch);cw+=w
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

async def gen_audio(fid, text, voice, rate, audio_dir, force=False):
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

    # 使用语义切分，避免把同一词/短语拆成两段字幕
    dur = probe_duration(mp3)
    if dur <= 0:
        dur = 10.0
    raw_lines = semantic_split(text, max_w=13)
    widths = [display_width(l) for l in raw_lines]
    total_w = sum(widths) or 1
    lines = []; t = 0.0
    for i, (l, w) in enumerate(zip(raw_lines, widths)):
        te = t + dur * (w / total_w)
        if i == len(raw_lines) - 1:
            te = dur
        lines.append((t, te, l)); t= te
    with open(srt, "w", encoding='utf-8') as f:
        for i, (s,e,txt) in enumerate(lines, 1):
            f.write(f"{i}\n{fmt_srt_time(s)} --> {fmt_srt_time(e)}\n{txt}\n\n")
    print(f"{fid}: {len(lines)}行字幕")

async def main(json_path, audio_dir, force=False):
    os.makedirs(audio_dir, exist_ok=True)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    meta = data.get("meta", {})
    voice = meta.get("voice", "zh-CN-XiaoyiNeural")
    rate = meta.get('rate', '+5%')
    frames = data.get('frames', [])
    print(f"生成 {len(frames)}段配音-->{audio_dir}/")
    for frame in frames:
        fid = frame.get("id", "00")
        script = frame.get("script", "")
        if not script:
            print(f"{fid}: 无配音脚本,跳过")
            continue
        try:
            await gen_audio(fid, script, voice, rate, audio_dir, force=force)
        except Exception as primary_err:
            # Edge TTS 偶发返回空音频时，使用备用中文音色再试一次，避免整条任务失败
            if voice != FALLBACK_VOICE:
                print(f"{fid}: 主音色失败，尝试备用音色 {FALLBACK_VOICE} ({primary_err})")
                try:
                    await gen_audio(fid, script, FALLBACK_VOICE, rate, audio_dir, force=force)
                    await asyncio.sleep(0.3)
                    continue
                except Exception as fallback_err:
                    raise RuntimeError(
                        f"{fid}: 主音色({voice})与备用音色({FALLBACK_VOICE})均失败: "
                        f"{primary_err} | {fallback_err}"
                    )
            raise
        await asyncio.sleep(0.3)
    print("\n配音完成")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    json_path = args[0] if args else "frames.json"
    audio_dir = os.path.join(os.path.dirname(os.path.abspath(json_path)), "audio")
    asyncio.run(main(json_path, audio_dir, force=force))