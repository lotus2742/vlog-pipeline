#!/bin/bash
# run_frames.sh - 生成并自动校验 frames.json 的短命令封装

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_PATH="${2:-$ROOT_DIR/tmp/frames.json}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# 优先使用第一个参数，其次使用环境变量 FRAME_GENERATE_CMD
GENERATE_CMD="${1:-${FRAME_GENERATE_CMD:-}}"

if [ -z "$GENERATE_CMD" ]; then
  echo "用法:"
  echo "  ./run_frames.sh '<生成命令，包含 {output} 占位符>' [输出路径]"
  echo ""
  echo "示例:"
  echo "  ./run_frames.sh \"cp langchain_setup_frames.json {output}\""
  echo ""
  echo "也可先设置环境变量后直接运行:"
  echo "  export FRAME_GENERATE_CMD='cp langchain_setup_frames.json {output}'"
  echo "  ./run_frames.sh"
  exit 1
fi

python3 "$ROOT_DIR/one_click_frames.py" \
  --generate-cmd "$GENERATE_CMD" \
  --output "$OUTPUT_PATH" \
  --max-retries "$MAX_RETRIES"
