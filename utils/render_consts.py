#!/usr/bin/env python3
"""
渲染相关常量集中维护。
"""

# 画布尺寸
W = 1280
H = 720
SAFE_H = 650

# 字体探测文本
FONT_PROBE_TEXT = "稳定关键信息复杂路线记忆策略检索"
FONT_CANDIDATES = [
    ("/opt/homebrew/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", 0),
    ("/usr/local/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", 0),
    ("/opt/homebrew/Caskroom/font-noto-sans-cjk-sc/20190416/NotoSansCJKsc-Regular.otf", 0),
    ("NotoSansCJK.otf", 0),
    ("NotoSansCJK.ttc", 0),
    ("/System/Library/Fonts/PingFang.ttc", 2),
    ("/System/Library/Fonts/PingFang.ttc", 0),
    ("/Library/Fonts/Arial Unicode MS.ttf", 0),
]

# 配色
PALETTE = {
    "BG": (8, 4, 20),
    "CARD": (22, 14, 50),
    "CARD_B": (60, 30, 100),
    "PURPLE_L": (200, 120, 255),
    "CYAN": (100, 220, 255),
    "WHITE": (240, 235, 255),
    "DIM": (165, 150, 205),
    "TEXT_SOFT": (205, 195, 230),
    "GOLD": (255, 209, 0),
    "GREEN": (0, 229, 150),
    "RED": (255, 60, 60),
    "ORANGE": (255, 140, 40),
    "PINK": (255, 80, 180),
}

TOKENS = {
    "font": {
        "h1": 64,
        "h2": 36,
        "body": 28,
        "caption": 22,
    },
    "color": {
        "title": PALETTE["GOLD"],
        "subtitle": PALETTE["CYAN"],
        "body": PALETTE["WHITE"],
        "muted": PALETTE["TEXT_SOFT"],
    },
}

CARD_ACCENT_COLORS = ["CYAN", "GOLD", "PURPLE_L", "GREEN", "ORANGE", "PINK"]

STANDARD_GLOW_POS = [
    (-600, -550, 400, 450, (20, 60, 220)),
    (880, -550, 1880, 450, (180, 0, 200)),
    (-500, 270, 300, 1270, (10, 40, 160)),
    (980, 270, 1780, 1270, (160, 0, 160)),
]

# 文本处理
COMPARE_DROP_CHARS = " \n\r\t，。！？；：、,.!?;:-_()[]{}\"'`~|/\\"
WEAK_SUBTITLE_PHRASES = {
    "先说结论",
    "核心价值",
    "小步可运行",
    "实操要点",
    "三类痛点",
    "行动建议",
}

# style 策略阈值
HOOK_FIRST_LAST_SPLIT_TITLE_LEN = 14
HOOK_FIRST_LAST_SPLIT_SCRIPT_LEN = 95
HOOK_SPLIT_TITLE_LEN = 16
CARDS_GRID_MIN_COUNT = 4
CARDS_TIMELINE_MIN_COUNT = 3
CARDS_TIMELINE_DESC_TOTAL = 90
COMPARISON_TABLE_MIN_SIDE_POINTS = 3

# 风险评分阈值
LAYOUT_TITLE_WARN = 20
LAYOUT_TITLE_DANGER = 28
LAYOUT_SCRIPT_WARN = 110
LAYOUT_SCRIPT_DANGER = 150
LAYOUT_CARDS_MANY = 5
LAYOUT_CARDS_DESC_TOTAL = 200
LAYOUT_COMPARISON_SIDE_MANY = 4
LAYOUT_COMPARISON_TOTAL_MANY = 7
