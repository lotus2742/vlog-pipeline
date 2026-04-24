#!/usr/bin/env python3
"""
Remotion 渲染桥接脚本。
将 frames.json 映射为 Remotion props（meta + slides，含每段时长），并调用 Remotion CLI 产出 mp4。
"""

import argparse
import json
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional

FPS_DEFAULT = 30


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
        if os.path.isfile(mp3):
            d = ffprobe_duration_seconds(mp3)
            if d and d > 0:
                # Remotion 以音频为准：避免口播未结束就切到下一帧。
                # 若确实需要强制上限，可显式设置 VLOG_REMOTION_CAP_AUDIO=1。
                cap_audio = os.getenv("VLOG_REMOTION_CAP_AUDIO", "").strip().lower() in {
                    "1",
                    "true",
                    "yes",
                    "on",
                }
                effective_sec = min(d, max_seg) if cap_audio else d
                dur_frames = max(int(min_seg * fps), int(effective_sec * fps + 0.999))
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
    return {"meta": meta, "slides": slides}


def main() -> int:
    parser = argparse.ArgumentParser(description="Render video via Remotion project.")
    parser.add_argument("--frames", required=True, help="frames.json path")
    parser.add_argument("--output", required=True, help="output mp4 path")
    parser.add_argument("--project-dir", required=True, help="Remotion project directory")
    parser.add_argument(
        "--composition-id",
        default="VlogFrames",
        help="Composition id（默认 VlogFrames 多段成片）",
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
