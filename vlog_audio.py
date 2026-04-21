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

    if words:
        lines = [];cur_word= []; cs = None; ce = 0
        for w in words:
            if cs is None: cs = w["offset"]
            cur_word.append(w["text"]);ce=w['offset'] + w['duration']
            cur_text = "".join(cur_word)
            if display_width(cur_text) >= 13  or w == words[-1]:
                lines.append((cs, ce, cur_text)); cur_word = []; cs=None
    else:
        r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                            "-of","default=noprint_wrappers=1:nokey=1", mp3],
                            capture_output=True, text=True)
        dur = float(r.stdout.strip() or "10")
        raw_lines = simple_split(text)
        widths = [display_width(l) for l in raw_lines]
        total_w = sum(widths) or 1
        lines = []; t = 0.0
        for i, (l, w) in enumerate(zip(raw_lines, widths)):
            te = t + dur * (w / total_w)
            if i == len(raw_lines) - 1: te = dur
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
        await gen_audio(fid, script, voice, rate, audio_dir, force=force)
        await asyncio.sleep(0.3)
    print("\n配音完成")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    json_path = args[0] if args else "frames.json"
    audio_dir = os.path.join(os.path.dirname(os.path.abspath(json_path)), "audio")
    asyncio.run(main(json_path, audio_dir, force=force))