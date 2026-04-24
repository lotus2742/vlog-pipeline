#!/usr/bin/env python3
"""
一键生成「完整 Remotion 多段成片」demo：
1) 复制 langchain_setup_frames.json 到临时 job 目录
2) 运行 vlog_audio.py 生成每段 mp3（失败则仅用脚本长度估时长）
3) 写出 Remotion input props（JSON，便于在 Studio 或他机渲染）
4) 调用 tools/remotion_renderer.py 输出 mp4 到 remotion-demo/out/
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.remotion_renderer import build_remotion_props

SOURCE_FRAMES = PROJECT_ROOT / "langchain_setup_frames.json"
REMOTION_DIR = PROJECT_ROOT / "remotion-demo"
OUT_MP4 = REMOTION_DIR / "out" / "vlog_remotion_full_demo.mp4"
OUT_PROPS = REMOTION_DIR / "out" / "vlog_remotion_full_demo_props.json"


def main() -> int:
    if not SOURCE_FRAMES.is_file():
        print(f"找不到示例 JSON: {SOURCE_FRAMES}", file=sys.stderr)
        return 2

    job_dir = PROJECT_ROOT / "tmp" / "remotion_full_demo_job"
    job_dir.mkdir(parents=True, exist_ok=True)
    job_json = job_dir / "frames.json"
    shutil.copy(SOURCE_FRAMES, job_json)
    print(f"[remotion_full_demo] job: {job_dir}")

    audio_rc = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "vlog_audio.py"), str(job_json)],
        cwd=str(job_dir),
    ).returncode
    if audio_rc != 0:
        print(
            "[remotion_full_demo] 警告: vlog_audio 失败，将按 script 长度估算每段时长",
            file=sys.stderr,
        )

    OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
    props = build_remotion_props(
        json.loads(job_json.read_text(encoding="utf-8")),
        str(job_json),
        fps=30,
    )
    OUT_PROPS.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[remotion_full_demo] props: {OUT_PROPS}")

    rc = subprocess.run(
        [
            sys.executable,
            str(PROJECT_ROOT / "tools" / "remotion_renderer.py"),
            "--frames",
            str(job_json),
            "--output",
            str(OUT_MP4),
            "--project-dir",
            str(REMOTION_DIR),
            "--composition-id",
            "VlogFrames",
        ],
        cwd=str(PROJECT_ROOT),
    ).returncode
    if rc != 0:
        print(
            "[remotion_full_demo] Remotion CLI 渲染失败（常见于旧版 macOS 与 headless Chrome）。"
            "已写入 props；在 remotion-demo 目录下可在较新系统执行:\n"
            '  npx remotion render VlogFrames out.mp4 --props "$(cat out/vlog_remotion_full_demo_props.json)"',
            file=sys.stderr,
        )
        return rc
    print(f"[remotion_full_demo] 输出: {OUT_MP4}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
