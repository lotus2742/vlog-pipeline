#!/usr/bin/env python3
"""
one_click_frames.py

一键执行「生成 -> 校验 -> 重试」闭环。
"""

import argparse
from datetime import datetime
import json
import shlex
import subprocess
import sys
from pathlib import Path
from frame_expander import expand_long_frames
from frame_style_policy import optimize_frame_styles
from json_sanitize import sanitize_json_file


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
    parser.add_argument(
        "--no-timestamp-suffix",
        action="store_true",
        help="关闭时间戳后缀（默认开启，避免覆盖旧文件）",
    )
    return parser.parse_args()


def run_cmd(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        shell=True,
        text=True,
        capture_output=True,
    )


def with_timestamp_suffix(path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return path.with_name(f"{path.stem}_{ts}{path.suffix}")


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).expanduser().resolve()
    if not args.no_timestamp_suffix:
        output_path = with_timestamp_suffix(output_path)
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

        # 先清洗潜在的“多段 JSON 拼接”，只保留首个对象
        try:
            sanitize_stats = sanitize_json_file(str(output_path))
            if sanitize_stats.get("had_extra_text"):
                print("🧹 检测到附加 JSON/文本，已自动清洗为首个合法 JSON 对象")
        except Exception as e:
            print(f"⚠️ JSON 清洗失败: {e}")
            if attempt > args.max_retries:
                return 1
            continue

        # 生成后先自动拆页，减少“单页停留过久”
        try:
            raw = json.loads(output_path.read_text(encoding="utf-8"))
            # 小白讲清楚优先：放宽自动拆页阈值，减少仅因时长被硬拆。
            expanded, stats = expand_long_frames(raw, target_script_len=170, max_frames=12)
            optimized = optimize_frame_styles(expanded)
            if stats["expanded_count"] > 0:
                output_path.write_text(
                    json.dumps(optimized, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                print(
                    f"🪄 已自动拆页: {stats['expanded_count']} 帧被拆分 "
                    f"({stats['before_count']} -> {stats['after_count']})"
                )
            elif optimized != raw:
                output_path.write_text(
                    json.dumps(optimized, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                print("🎨 已自动优化样式策略（收尾 hook 优先 spotlight）")
        except Exception as e:
            print(f"⚠️ 自动拆页跳过: {e}")

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
