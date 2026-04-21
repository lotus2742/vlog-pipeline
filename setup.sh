#!/bin/bash
# setup.sh - 一键初始化
# 用法: bash setup.sh

set -e

echo "开始初始化..."

# 1 检查python
echo ""
echo "[1/4] 检查python 3..."
if ! python3 --version; then
    echo "❌错误: python 3 未安装, 请先安装: brew install python3"
    exit 1
fi


# 2 安装python依赖
echo ""
echo "[2/4] 安装python依赖..."
pip3 install fastapi uvicorn pillow edge-tts --quiet
echo "✅python依赖安装完成"

# 3 检查ffmpeg
echo ""
echo "[3/4] 检查ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "❌错误: ffmpeg未安装, 正在通过brew安装..."
    HOMEBREW_NO_AUTO_UPDATE=1 brew install ffmpeg
else
    echo "✅ffmpeg已安装: $(ffmpeg --version 2>&1 | head -1)"
fi

# 4 检查中文字体
echo ""
echo "[4/4] 检查中文字体..."
FONT_FOUND=0

check_font() {
    if [ -f "$1" ]; then
        echo "✅ 找到字体: $1"
        FONT_FOUND=1
    fi
}

check_font "/opt/homebrew/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"
check_font "/usr/local/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"
check_font "$(dirname "$0")/NotoSansCJK.otf"
check_font "/System/Library/Fonts/PingFang.ttc"

if [ $FONT_FOUND -eq 0 ]; then
    echo "⚠️ 未找到推荐字体, 尝试安装 font-noto-sans-cjk-sc..."
    brew install --cask font-noto-sans-cjk-sc 2>/dev/null || \
    brew install font-noto-sans-cjk-sc 2>/dev/null || \
    echo "❌错误: 字体安装失败, 系统将降级使用PingFang"
fi

echo ""
echo "✅ ==== 安装完成 ===="
echo ""
echo "启动服务:"
echo "  cd $(dirname "$0")"
echo "  uvicorn render_server:app --host 0.0.0.0 --port 8765"
echo ""
echo "访问: http://localhost:8765"
echo ""
echo "测试渲染:"
echo "  curl -X POST http://localhost:8765/render \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"job_id\":\"test001\",\"frames\":[{\"id\":\"01\",\"type\":\"hook\",\"title\":\"测试\",\"subtitle\":\"副标题\",\"script\":\"测试配音文本\"}]}'"

