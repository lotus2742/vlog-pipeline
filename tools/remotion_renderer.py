#!/usr/bin/env python3
"""
Remotion 渲染桥接脚本。
将 frames.json 映射为 Remotion props（meta + slides，含每段时长），并调用 Remotion CLI 产出 mp4。
"""

import argparse
import json
import math
import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional

FPS_DEFAULT = 30
DEFAULT_FRAME_PAD = 6

HOTLIST_LEGACY_STYLES = frozenset(
    {"hotlist-cover", "hotlist-project", "hotlist-outro", "hotlist-table"}
)


def is_hotlist_frames(data: dict) -> bool:
    meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
    if str(meta.get("videoType", "")).strip().lower() == "hotlist":
        return True
    for frame in data.get("frames") or []:
        if not isinstance(frame, dict):
            continue
        ftype = str(frame.get("type", "")).lower()
        style = str(frame.get("style", "")).lower()
        if ftype.startswith("hotlist-") or style in HOTLIST_LEGACY_STYLES:
            return True
    return False


def ffprobe_duration_seconds(path: str) -> Optional[float]:
    try:
        r = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if r.returncode != 0:
            return None
        return float(r.stdout.strip())
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def speech_end_seconds(audio_sec: float, captions: list | None) -> float:
    end = float(audio_sec or 0)
    if captions:
        for cue in captions:
            if isinstance(cue, dict) and cue.get("end") is not None:
                end = max(end, float(cue["end"]))
    return end


def parse_srt_captions(path: str) -> list[dict]:
    try:
        text = open(path, encoding="utf-8", errors="ignore").read().strip()
    except OSError:
        return []
    if not text:
        return []
    cues: list[dict] = []
    for block in re.split(r"\n\s*\n", text):
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
            start_s = _srt_timestamp_to_seconds(start_ts)
            end_s = _srt_timestamp_to_seconds(end_ts)
        except (ValueError, IndexError):
            continue
        body = " ".join(body_lines).strip()
        if not body:
            continue
        cues.append({"start": start_s, "end": end_s, "text": body})
    return cues


def _srt_timestamp_to_seconds(ts: str) -> float:
    hh, mm, rest = ts.split(":")
    ss, ms = rest.split(",")
    return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0


def compute_slide_duration_frames(
    audio_sec: float,
    captions: list | None = None,
    *,
    fps: int = FPS_DEFAULT,
    min_frames: int = 15,
    pad_frames: int = DEFAULT_FRAME_PAD,
    min_sec: float = 0,
) -> int:
    end = speech_end_seconds(audio_sec, captions)
    if min_sec > 0:
        end = max(end, min_sec)
    return max(min_frames, int(math.ceil(end * fps)) + pad_frames)


def estimate_duration_frames_from_script(
    script: str,
    *,
    fps: int,
    min_sec: float,
    max_sec: float,
) -> int:
    """无配音文件时，按脚本长度粗估时长（秒），再换算为帧数。"""
    n = len(script or "")
    sec = max(min_sec, min(max_sec, n / 16.0))
    return max(int(sec * fps), int(min_sec * fps))


def build_remotion_props(data: dict, frames_path: str, fps: int = FPS_DEFAULT) -> dict:
    meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
    min_seg = float(meta.get("min_seg_sec", os.getenv("VLOG_MIN_SEG_SEC", "2.8")))
    max_seg = float(meta.get("max_seg_sec", os.getenv("VLOG_MAX_SEG_SEC", "9")))
    base = os.path.dirname(os.path.abspath(frames_path))
    audio_dir = os.path.join(base, "audio")
    slides: List[Dict[str, Any]] = []
    for frame in data.get("frames") or []:
        if not isinstance(frame, dict):
            continue
        fid = str(frame.get("id", "frame"))
        ftype = str(frame.get("type", "content"))
        mp3 = os.path.join(audio_dir, f"{fid}.mp3")
        script = str(frame.get("script", ""))
        match_audio = bool(frame.get("matchAudioDuration"))
        pad_frames = int(
            frame.get("durationPadFrames", 0 if match_audio else DEFAULT_FRAME_PAD)
        )
        frame_min_sec = 0.0 if match_audio else min_seg

        if os.path.isfile(mp3):
            d = ffprobe_duration_seconds(mp3)
            if d and d > 0:
                cap_audio = os.getenv("VLOG_REMOTION_CAP_AUDIO", "").strip().lower() in {
                    "1",
                    "true",
                    "yes",
                    "on",
                }
                effective_sec = min(d, max_seg) if cap_audio else d
                srt = os.path.splitext(mp3)[0] + ".srt"
                captions = parse_srt_captions(srt) if os.path.isfile(srt) else None
                dur_frames = compute_slide_duration_frames(
                    effective_sec,
                    captions,
                    fps=fps,
                    pad_frames=pad_frames,
                    min_sec=frame_min_sec,
                )
            else:
                dur_frames = estimate_duration_frames_from_script(
                    script, fps=fps, min_sec=min_seg, max_sec=max_seg
                )
        else:
            dur_frames = estimate_duration_frames_from_script(
                script, fps=fps, min_sec=min_seg, max_sec=max_seg
            )
        slides.append(
            {
                "id": fid,
                "type": ftype,
                "durationInFrames": dur_frames,
                "frame": frame,
            }
        )
    out: Dict[str, Any] = {"meta": meta, "slides": slides}
    if is_hotlist_frames(data):
        meta["videoType"] = "hotlist"
        meta.setdefault("theme", "light")
        meta.setdefault("bgStyle", "classic")
        meta["engagementCta"] = False
        out["videoType"] = "hotlist"
        out["aspectRatio"] = "16:9"
        return out
    ar = meta.get("aspectRatio") or meta.get("aspect_ratio")
    if isinstance(ar, str) and str(ar).strip().lower() in (
        "9:16",
        "9x16",
        "portrait",
        "vertical",
    ):
        out["aspectRatio"] = "9:16"
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Render video via Remotion project.")
    parser.add_argument("--frames", required=True, help="frames.json path")
    parser.add_argument("--output", required=True, help="output mp4 path")
    parser.add_argument("--project-dir", required=True, help="Remotion project directory")
    parser.add_argument(
        "--composition-id",
        default="VlogFrames",
        help="Composition id（默认 VlogFrames 多段成片；竖屏可选用 VlogFrames9x16）",
    )
    parser.add_argument(
        "--aspect-ratio",
        choices=("16:9", "9:16"),
        default="16:9",
        help="输出画布比例；9:16 写入 props.aspectRatio（与 Remotion calculateMetadata 一致）",
    )
    parser.add_argument("--fps", type=int, default=FPS_DEFAULT, help="与 Root 中 fps 一致，用于换算帧数")
    args = parser.parse_args()

    frames_path = os.path.abspath(args.frames)
    output_path = os.path.abspath(args.output)
    project_dir = os.path.abspath(args.project_dir)

    if not os.path.isfile(frames_path):
        raise FileNotFoundError(f"frames 文件不存在: {frames_path}")
    if not os.path.isdir(project_dir):
        raise FileNotFoundError(f"Remotion 项目目录不存在: {project_dir}")
    if not os.path.isfile(os.path.join(project_dir, "package.json")):
        raise FileNotFoundError(f"缺少 package.json: {project_dir}")

    with open(frames_path, encoding="utf-8") as f:
        data = json.load(f)
    props = build_remotion_props(data, frames_path, fps=args.fps)
    if args.aspect_ratio == "9:16":
        props["aspectRatio"] = "9:16"
    else:
        props.pop("aspectRatio", None)
    props_json = json.dumps(props, ensure_ascii=False)

    cmd = [
        "npx",
        "remotion",
        "render",
        args.composition_id,
        output_path,
        "--props",
        props_json,
    ]
    env = os.environ.copy()
    env.setdefault("REMOTION_BROWSER_MODE", "headless-shell")
    res = subprocess.run(cmd, cwd=project_dir, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        detail = (res.stderr or "")[-1600:] or (res.stdout or "")[-1600:]
        raise RuntimeError(f"Remotion 渲染失败: {detail}")
    if not os.path.isfile(output_path):
        raise RuntimeError("Remotion 返回成功但未生成输出文件")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
