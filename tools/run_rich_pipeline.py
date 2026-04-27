#!/usr/bin/env python3
"""
run_rich_pipeline.py

在调用 agent_pipeline 前增加“信息密度硬约束”：
- 最小帧数
- 最小类型多样性

不满足时直接失败，避免进入渲染阶段浪费时间与 token。
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import shlex
import subprocess
import sys
import uuid
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rich-first 渲染入口（先做信息密度门禁）")
    parser.add_argument("--frames", required=True, help="frames.json 路径")
    parser.add_argument(
        "--generate-cmd",
        required=True,
        help="用于生成新 frames JSON 的命令，使用 {output} 占位输出文件路径",
    )
    parser.add_argument(
        "--source-doc",
        default="",
        help="可选：源文档路径（.md/.docx/.pdf），传给 agent_pipeline 进行来源一致性硬校验。",
    )
    parser.add_argument("--theme", default="dark", help="主题（purple/ocean/dark/light）")
    parser.add_argument("--server", default="http://localhost:8765", help="渲染服务地址")
    parser.add_argument(
        "--engine",
        default="remotion",
        choices=["remotion", "legacy", "auto"],
        help="渲染引擎，默认 remotion；仅在明确要求时使用 legacy",
    )
    parser.add_argument("--min-frames", type=int, default=9, help="最小帧数，默认 9")
    parser.add_argument(
        "--min-type-kinds",
        type=int,
        default=4,
        help="最小类型种类数，默认 4",
    )
    parser.add_argument(
        "--result-file",
        default="",
        help="可选：agent_pipeline 的结果文件路径",
    )
    return parser.parse_args()


def fail(msg: str, code: int = 1) -> int:
    print(f"❌ {msg}", file=sys.stderr)
    return code


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise RuntimeError(f"找不到文件: {path}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON 解析失败: {e}")


def gate_richness(data: dict, min_frames: int, min_type_kinds: int) -> None:
    frames = data.get("frames", [])
    if not isinstance(frames, list):
        raise RuntimeError("frames 必须是数组")

    frame_count = len(frames)
    if frame_count < min_frames:
        raise RuntimeError(
            f"帧数不足：当前 {frame_count}，要求至少 {min_frames}。请先补充内容再渲染。"
        )

    kinds = {
        str((f or {}).get("type", "")).strip().lower()
        for f in frames
        if isinstance(f, dict) and str((f or {}).get("type", "")).strip()
    }
    if len(kinds) < min_type_kinds:
        raise RuntimeError(
            f"类型多样性不足：当前 {len(kinds)} 种，要求至少 {min_type_kinds} 种。"
        )


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"命令失败（exit={proc.returncode}）: {' '.join(cmd)}")


def main() -> int:
    args = parse_args()
    frames_path = Path(args.frames).expanduser().resolve()

    generated_frames_path = frames_path.with_name(
        f"{frames_path.stem}_rich_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{uuid.uuid4().hex[:6]}{frames_path.suffix}"
    )
    generate_cmd = args.generate_cmd.format(output=shlex.quote(str(generated_frames_path)))
    try:
        run(["bash", "-lc", generate_cmd])
        data = load_json(generated_frames_path)
        gate_richness(data, min_frames=args.min_frames, min_type_kinds=args.min_type_kinds)
    except Exception as e:
        return fail(str(e))

    validate_cmd = ["python3", "validate_frames.py", str(generated_frames_path)]
    try:
        run(validate_cmd)
    except Exception as e:
        return fail(f"结构校验失败：{e}")

    pipeline_cmd = [
        "python3",
        "tools/agent_pipeline.py",
        "--frames",
        str(frames_path),
        "--generate-cmd",
        args.generate_cmd,
        "--engine",
        args.engine,
        "--theme",
        args.theme,
        "--server",
        args.server,
    ]
    if args.source_doc:
        pipeline_cmd.extend(["--source-doc", args.source_doc])
    if args.result_file:
        pipeline_cmd.extend(["--result-file", args.result_file])

    try:
        run(pipeline_cmd)
    except Exception as e:
        return fail(f"渲染链路失败：{e}")

    print("✅ Rich-first 完整链路执行完成")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
