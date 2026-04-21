#!/usr/bin/env python3
"""
one_click_frames.py

一键执行「生成 -> 校验 -> 重试」闭环。
"""

import argparse
import shlex
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="循环执行 JSON 生成命令并用 validate_frames.py 校验"
    )
    parser.add_argument(
        "--generate-cmd",
        required=True,
        help="用于生成 frames JSON 的 shell 命令，可用 {output} 占位输出文件路径",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="生成的 JSON 文件路径",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="最大重试次数（默认 3）",
    )
    parser.add_argument(
        "--validator",
        default="validate_frames.py",
        help="校验脚本路径（默认 validate_frames.py）",
    )
    parser.add_argument(
        "--show-validator-json",
        action="store_true",
        help="打印完整校验 JSON 输出",
    )
    return parser.parse_args()


def run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        shell=True,
        text=True,
        capture_output=True,
    )


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    validator_path = Path(args.validator).expanduser().resolve()
    if not validator_path.exists():
        print(f"❌ 校验脚本不存在: {validator_path}", file=sys.stderr)
        return 2

    for attempt in range(1, args.max_retries + 2):
        print(f"\n=== 第 {attempt} 次生成 ===")
        generate_cmd = args.generate_cmd.format(output=shlex.quote(str(output_path)))
        print(f"$ {generate_cmd}")
        gen = run_cmd(generate_cmd)
        if gen.stdout.strip():
            print(gen.stdout.rstrip())
        if gen.returncode != 0:
            print("❌ 生成命令失败", file=sys.stderr)
            if gen.stderr.strip():
                print(gen.stderr.rstrip(), file=sys.stderr)
            if attempt > args.max_retries:
                return 1
            continue

        validate_cmd = (
            f"python3 {shlex.quote(str(validator_path))} "
            f"{shlex.quote(str(output_path))}"
        )
        val = run_cmd(validate_cmd)
        if args.show_validator_json and val.stdout.strip():
            print(val.stdout.rstrip())

        if val.returncode == 0:
            print(f"✅ 校验通过: {output_path}")
            return 0

        print("⚠️ 校验失败")
        if val.stdout.strip():
            print(val.stdout.rstrip())
        if val.stderr.strip():
            print(val.stderr.rstrip(), file=sys.stderr)

        if attempt > args.max_retries:
            print("❌ 超过最大重试次数，仍未通过校验", file=sys.stderr)
            return 1

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
