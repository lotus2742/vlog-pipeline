#!/bin/bash
# setup.sh - 一键初始化
# 用法: bash setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "开始初始化..."

# 1 检查 python
echo ""
echo "[1/4] 检查 Python 3..."
if ! "$PYTHON_BIN" --version; then
    echo "❌ 错误: Python 3 未安装"
    echo "   macOS: 先安装 Homebrew，再执行 brew install python3"
    echo "   或从 https://www.python.org/downloads/ 安装"
    exit 1
fi

# 2 安装 Python 依赖
echo ""
echo "[2/4] 安装 Python 依赖..."
"$PYTHON_BIN" -m pip install --user -r "$SCRIPT_DIR/requirements.txt"
USER_BIN="$("$PYTHON_BIN" -m site --user-base)/bin"
if [ -d "$USER_BIN" ]; then
    export PATH="$USER_BIN:$PATH"
fi
echo "✅ Python 依赖安装完成"
if ! command -v uvicorn >/dev/null 2>&1; then
    echo "⚠️  uvicorn 不在 PATH 中，启动时请使用:"
    echo "   $PYTHON_BIN -m uvicorn render_server:app --host 0.0.0.0 --port 8765"
fi

install_ffmpeg() {
    if command -v brew >/dev/null 2>&1; then
        echo "   正在通过 Homebrew 安装 ffmpeg..."
        HOMEBREW_NO_AUTO_UPDATE=1 brew install ffmpeg
        return 0
    fi

    if command -v apt-get >/dev/null 2>&1; then
        echo "   正在通过 apt 安装 ffmpeg..."
        sudo apt-get update -qq
        sudo apt-get install -y ffmpeg
        return 0
    fi

    if command -v dnf >/dev/null 2>&1; then
        echo "   正在通过 dnf 安装 ffmpeg..."
        sudo dnf install -y ffmpeg
        return 0
    fi

    return 1
}

print_ffmpeg_help() {
    echo ""
    echo "❌ 未找到 ffmpeg，且当前环境无法自动安装。"
    echo ""
    echo "请任选一种方式手动安装后，重新运行 bash setup.sh："
    echo ""
    echo "  方式 A（推荐，macOS）— 安装 Homebrew 后再装 ffmpeg："
    echo "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "    brew install ffmpeg"
    echo ""
    echo "  方式 B（macOS，无需 Homebrew）— 下载静态二进制："
    echo "    curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o /tmp/ffmpeg.zip"
    echo "    unzip -o /tmp/ffmpeg.zip -d /usr/local/bin"
    echo "    curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o /tmp/ffprobe.zip"
    echo "    unzip -o /tmp/ffprobe.zip -d /usr/local/bin"
    echo ""
    echo "  方式 C（Linux）:"
    echo "    sudo apt install ffmpeg    # Debian/Ubuntu"
    echo "    sudo dnf install ffmpeg    # Fedora"
}

# 3 检查 ffmpeg
echo ""
echo "[3/4] 检查 ffmpeg..."
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "⚠️  ffmpeg 未安装，尝试自动安装..."
    if ! install_ffmpeg; then
        print_ffmpeg_help
        exit 1
    fi
fi

if command -v ffmpeg >/dev/null 2>&1; then
    echo "✅ ffmpeg 已安装: $(ffmpeg -version 2>&1 | head -1)"
else
    print_ffmpeg_help
    exit 1
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
check_font "$SCRIPT_DIR/NotoSansCJK.otf"
check_font "/System/Library/Fonts/PingFang.ttc"
check_font "/System/Library/Fonts/STHeiti Light.ttc"
check_font "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
check_font "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"

if [ "$FONT_FOUND" -eq 0 ]; then
    echo "⚠️  未找到推荐中文字体"
    if command -v brew >/dev/null 2>&1; then
        echo "   尝试通过 Homebrew 安装 font-noto-sans-cjk-sc..."
        brew install --cask font-noto-sans-cjk-sc 2>/dev/null || \
        brew install font-noto-sans-cjk-sc 2>/dev/null || \
        echo "   字体安装失败，legacy 渲染可能降级使用系统字体"
    else
        echo "   macOS 通常自带 PingFang；若渲染中文异常，请安装 Noto Sans CJK"
    fi
fi

echo ""
echo "✅ ==== 安装完成 ===="
echo ""
echo "启动服务:"
echo "  cd $SCRIPT_DIR"
if command -v uvicorn >/dev/null 2>&1; then
    echo "  uvicorn render_server:app --host 0.0.0.0 --port 8765"
else
    echo "  $PYTHON_BIN -m uvicorn render_server:app --host 0.0.0.0 --port 8765"
fi
echo ""
echo "访问: http://localhost:8765"
echo ""
echo "测试渲染:"
echo "  curl -X POST http://localhost:8765/render \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"job_id\":\"test001\",\"frames\":[{\"id\":\"01\",\"type\":\"hook\",\"title\":\"测试\",\"subtitle\":\"副标题\",\"script\":\"测试配音文本\"}]}'"
