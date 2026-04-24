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

# 主题
DEFAULT_THEME = "purple"
ACTIVE_THEME = DEFAULT_THEME

THEME_PRESETS = {
    "purple": {
        "palette": {
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
        },
        "background": {
            "glow_pos": [
                (-600, -550, 400, 450, (20, 60, 220)),
                (880, -550, 1880, 450, (180, 0, 200)),
                (-500, 270, 300, 1270, (10, 40, 160)),
                (980, 270, 1780, 1270, (160, 0, 160)),
            ],
            "grid_low_noise": (20, 14, 40),
            "grid_high_noise": (25, 15, 50),
            "star_color": "PURPLE_L",
        },
    },
    "ocean": {
        "palette": {
            "BG": (6, 16, 28),
            "CARD": (12, 36, 56),
            "CARD_B": (24, 74, 108),
            "PURPLE_L": (116, 198, 255),
            "CYAN": (124, 236, 255),
            "WHITE": (229, 246, 255),
            "DIM": (146, 178, 202),
            "TEXT_SOFT": (176, 208, 230),
            "GOLD": (255, 210, 92),
            "GREEN": (68, 231, 170),
            "RED": (255, 106, 106),
            "ORANGE": (255, 156, 72),
            "PINK": (255, 120, 200),
        },
        "background": {
            "glow_pos": [
                (-640, -520, 460, 420, (0, 126, 178)),
                (840, -540, 1900, 420, (0, 148, 196)),
                (-520, 280, 340, 1280, (0, 84, 144)),
                (940, 250, 1760, 1240, (0, 108, 166)),
            ],
            "grid_low_noise": (12, 34, 54),
            "grid_high_noise": (14, 42, 66),
            "star_color": "CYAN",
        },
    },
    "dark": {
        "palette": {
            "BG": (14, 14, 20),
            "CARD": (30, 30, 38),
            "CARD_B": (68, 68, 84),
            "PURPLE_L": (194, 174, 255),
            "CYAN": (132, 220, 255),
            "WHITE": (242, 244, 248),
            "DIM": (168, 172, 186),
            "TEXT_SOFT": (198, 202, 214),
            "GOLD": (255, 213, 112),
            "GREEN": (86, 224, 168),
            "RED": (255, 114, 114),
            "ORANGE": (255, 172, 104),
            "PINK": (244, 132, 208),
        },
        "background": {
            "glow_pos": [
                (-560, -560, 460, 360, (70, 70, 96)),
                (860, -560, 1880, 360, (88, 72, 108)),
                (-500, 320, 300, 1240, (52, 52, 72)),
                (980, 320, 1780, 1240, (70, 56, 94)),
            ],
            "grid_low_noise": (30, 30, 38),
            "grid_high_noise": (38, 38, 48),
            "star_color": "DIM",
        },
    },
    "light": {
        "palette": {
            "BG": (240, 244, 252),
            "CARD": (224, 233, 247),
            "CARD_B": (168, 185, 214),
            "PURPLE_L": (44, 50, 132),
            "CYAN": (24, 82, 132),
            "WHITE": (24, 30, 42),
            "DIM": (54, 66, 92),
            "TEXT_SOFT": (68, 82, 110),
            "GOLD": (142, 98, 0),
            "GREEN": (18, 118, 84),
            "RED": (170, 56, 56),
            "ORANGE": (166, 88, 24),
            "PINK": (142, 54, 106),
        },
        "background": {
            "glow_pos": [
                (-640, -540, 460, 420, (180, 204, 244)),
                (840, -560, 1900, 420, (206, 188, 248)),
                (-520, 300, 320, 1300, (182, 210, 244)),
                (940, 300, 1760, 1280, (204, 188, 240)),
            ],
            "grid_low_noise": (220, 230, 244),
            "grid_high_noise": (208, 220, 238),
            "star_color": "PURPLE_L",
        },
    },
}

PALETTE = dict(THEME_PRESETS[DEFAULT_THEME]["palette"])

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
STANDARD_GLOW_POS = list(THEME_PRESETS[DEFAULT_THEME]["background"]["glow_pos"])


def _sync_tokens():
    TOKENS["color"]["title"] = PALETTE["GOLD"]
    TOKENS["color"]["subtitle"] = PALETTE["CYAN"]
    TOKENS["color"]["body"] = PALETTE["WHITE"]
    TOKENS["color"]["muted"] = PALETTE["TEXT_SOFT"]


def list_theme_names():
    return sorted(THEME_PRESETS.keys())


def apply_theme(theme_name: str):
    global ACTIVE_THEME
    name = str(theme_name or "").strip().lower() or DEFAULT_THEME
    if name not in THEME_PRESETS:
        name = DEFAULT_THEME
    preset = THEME_PRESETS[name]
    PALETTE.clear()
    PALETTE.update(preset["palette"])
    _sync_tokens()
    ACTIVE_THEME = name
    return name


def get_active_theme():
    return ACTIVE_THEME


def get_theme_background_config():
    return THEME_PRESETS.get(ACTIVE_THEME, THEME_PRESETS[DEFAULT_THEME]).get("background", {})

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

# hook 渲染常量
HOOK_STYLE_ADAPTIVE_THRESHOLDS = {
    "title_long": 18,
    "script_long": 120,
    "title_short": 10,
    "script_short": 70,
    "edge_script_long": 100,
}

HOOK_CLOSING_DEFAULT_POINTS = ["目标达成情况", "关键成果展示", "问题与改进"]

HOOK_COVER_KEYWORD_MAP = {
    "trend": ("增长", "趋势", "数据", "指标", "转化", "留存"),
    "flow": ("流程", "步骤", "执行", "协作", "推进", "上线"),
    "stack": ("架构", "系统", "文档", "技术", "模块", "平台"),
}

HOOK_COVER_ILLUSTRATION_COLORS = {
    "fill_back": (38, 70, 130, 42),
    "fill_mid": (56, 98, 168, 48),
    "fill_front": (76, 124, 198, 54),
    "line_soft": (138, 182, 255, 60),
    "line_dim": (96, 128, 198, 50),
    "accent": (100, 220, 255, 96),
    "accent_dot": (255, 209, 0, 104),
    "laptop_shell": (68, 110, 184, 92),
    "laptop_base": (70, 106, 168, 86),
    "flow_node": (76, 122, 198, 106),
    "stack_node": (76, 122, 198, 106),
    "badge_fill": (52, 94, 166, 48),
}

HOOK_COVER_CODE_COLORS = {
    "file_label": (138, 198, 255, 146),
    "line_num": (120, 158, 220, 128),
    "base": (210, 230, 255, 188),
    "keyword": (136, 210, 255, 210),
    "function": (255, 214, 120, 210),
}

HOOK_COVER_PATTERN_COLORS = {
    "panel_fill": (18, 16, 42, 42),
    "panel_outline": (142, 128, 210, 34),
    "panel_inner_outline": (220, 210, 255, 12),
    "bar_fill": (38, 28, 78, 48),
    "bar_outline": (158, 146, 236, 30),
    "bar_title": (200, 224, 255, 74),
    "dot_red": (255, 106, 122, 62),
    "dot_yellow": (255, 210, 92, 62),
    "dot_green": (110, 224, 170, 62),
    "flow_card_1": (58, 98, 172, 42),
    "flow_card_2": (76, 118, 194, 42),
    "flow_card_3": (96, 132, 210, 42),
    "flow_card_outline": (170, 212, 255, 28),
    "flow_step_text": (236, 244, 255, 72),
    "flow_sep": (190, 224, 255, 24),
    "flow_subtext": (218, 232, 255, 60),
    "flow_arrow": (132, 224, 255, 46),
    "chart_panel_fill": (20, 40, 74, 38),
    "chart_panel_outline": (144, 208, 255, 26),
    "chart_grid": (114, 168, 228, 14),
    "chart_line": (118, 236, 255, 68),
    "chart_point": (255, 210, 92, 78),
    "kpi_fill": (38, 66, 118, 38),
    "kpi_outline": (156, 202, 255, 24),
    "kpi_text": (222, 236, 255, 66),
}

HOOK_COVER_CODE_LAYOUT = {
    "frame_inset_left": 36,
    "frame_top": 192,
    "frame_inset_right": 36,
    "frame_bottom": 70,
    "panel_inset_left": 22,
    "panel_inset_right": 54,
    "panel_inset_top": 16,
    "panel_inset_bottom": 18,
    "label_x_offset": 2,
    "content_top_offset": 28,
    "line_num_gutter": 30,
    "token_gap": 5,
    "space_gap": 4,
    "max_text_width_min": 120,
    "max_text_width_right_padding": 6,
    "available_height_min": 80,
    "target_lines_max": 16,
    "line_height_min": 18,
    "line_height_max": 30,
}

HOOK_COVER_PATTERN_LAYOUT = {
    "panel_outset_x": 10,
    "panel_top": 128,
    "panel_bottom": 2,
    "panel_radius": 24,
    "panel_outline_width": 2,
    "inner_inset": 10,
    "inner_radius": 20,
    "inner_outline_width": 1,
    "bar_height": 42,
    "bar_inset_x": 18,
    "bar_inset_top": 16,
    "bar_radius": 10,
    "bar_outline_width": 1,
    "bar_title_x": 30,
    "bar_title_y": 23,
    "bar_title_font": 18,
    "status_dot_left": 96,
    "status_dot_spacing": 20,
    "status_dot_top": 24,
    "status_dot_size": 12,
    "left_col_inset": 22,
    "left_col_ratio": 0.56,
    "flow_rows": 3,
    "flow_gap": 12,
    "flow_reserved_h": 120,
    "flow_start_y_offset": 16,
    "flow_card_radius": 12,
    "flow_card_outline_width": 1,
    "flow_step_x": 14,
    "flow_step_y": 12,
    "flow_step_font": 16,
    "flow_sep_y": 36,
    "flow_subtext_y": 44,
    "flow_subtext_font": 13,
    "flow_arrow_start_y": 2,
    "flow_arrow_end_y": 4,
    "flow_arrow_half_w": 4,
    "flow_arrow_tip_y": 1,
    "right_col_gap": 18,
    "right_col_inset": 22,
    "chart_top_offset": 16,
    "chart_h_ratio": 0.62,
    "chart_radius": 12,
    "chart_grid_lines": 4,
    "chart_grid_inset": 10,
    "trend_points": [
        (14, -16),
        (30, -26),
        (50, -24),
        (72, -48),
        (92, -42),
        (116, -76),
        (136, -88),
    ],
    "trend_line_width": 4,
    "trend_point_r": 6,
    "kpi_block_top_gap": 14,
    "kpi_block_h": 42,
    "kpi_block_gap": 10,
    "kpi_radius": 10,
    "kpi_outline_width": 1,
    "kpi_text_x": 12,
    "kpi_text_y": 11,
    "kpi_font": 14,
    "blur_radius": 0.4,
}

HOOK_SPLIT_LAYOUT = {
    "first_left_x1": 70,
    "first_left_x2": 930,
    "first_right_x1": 730,
    "first_right_x2_inset": 20,
    "first_title_width_pad": 72,
    "first_title_box_h": 220,
    "first_title_fonts": [72, 66, 58, 52, 46],
    "first_title_y": 220,
    "first_title_x_pad": 36,
    "first_title_line_gap": 10,
    "first_sub_width_pad": 72,
    "first_sub_box_h": 96,
    "first_sub_fonts": [34, 30, 28, 24],
    "first_sub_max_lines": 2,
    "first_sub_line_gap": 8,
    "first_sub_title_gap": 28,
    "normal_left_x1": 70,
    "normal_left_x2": 810,
    "normal_right_x1": 840,
    "normal_right_x2_inset": 70,
}
