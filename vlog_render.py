#!/usr/bin/env python3
"""
vlog_render.py — 通用帧渲染引擎（Mac 适配版）
接收 frames.json，按 frame.type 渲染对应布局
用法: python3 vlog_render.py frames.json
"""
import json, sys, os, random, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── 分辨率 & 安全区 ───────────────────────────────────────────
W, H = 1280, 720
SAFE_H = 650

# ─── 字体路径（Mac 适配，自动查找）───────────────────────────
def _find_font():
    candidates = [
        # Homebrew 安装的 Noto CJK
        "/opt/homebrew/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        "/usr/local/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        # Homebrew cask font-noto-sans-cjk-sc
        "/opt/homebrew/Caskroom/font-noto-sans-cjk-sc/20190416/NotoSansCJKsc-Regular.otf",
        # 脚本同目录下手动放置的字体
        os.path.join(os.path.dirname(__file__), "NotoSansCJK.otf"),
        os.path.join(os.path.dirname(__file__), "NotoSansCJK.ttc"),
        # macOS 系统自带中文字体
        "/System/Library/Fonts/PingFang.ttc",
        "/Library/Fonts/Arial Unicode MS.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(
        "找不到中文字体！请执行：\n"
        "  brew install font-noto-sans-cjk-sc\n"
        "或手动下载 NotoSansCJK.otf 放到脚本同目录。"
    )

FONT_PATH = _find_font()
print(f"[render] 使用字体: {FONT_PATH}")

# ─── 颜色表 ──────────────────────────────────────────────────
PALETTE = {
    "BG":       (8,   4,  20),
    "CARD":     (22,  14,  50),
    "CARD_B":   (60,  30, 100),
    "PURPLE_L": (200, 120, 255),
    "CYAN":     (100, 220, 255),
    "WHITE":    (240, 235, 255),
    "DIM":      (120, 100, 160),
    "GOLD":     (255, 209,   0),
    "GREEN":    (  0, 229, 150),
    "RED":      (255,  60,  60),
    "ORANGE":   (255, 140,  40),
    "PINK":     (255,  80, 180),
}
BG       = PALETTE["BG"]
CARD     = PALETTE["CARD"]
CARD_B   = PALETTE["CARD_B"]
PURPLE_L = PALETTE["PURPLE_L"]
CYAN     = PALETTE["CYAN"]
WHITE    = PALETTE["WHITE"]
DIM      = PALETTE["DIM"]
GOLD     = PALETTE["GOLD"]
GREEN    = PALETTE["GREEN"]
RED      = PALETTE["RED"]

STANDARD_GLOW_POS = [
    (-600, -550,  400,  450, (20,  60, 220)),
    ( 880, -550, 1880,  450, (180,  0, 200)),
    (-500,  270,  300, 1270, ( 10, 40, 160)),
    ( 980,  270, 1780, 1270, (160,  0, 160)),
]

# ─── 工具函数 ─────────────────────────────────────────────────
def load_font(size):
    return ImageFont.truetype(FONT_PATH, size)

def col(name):
    if isinstance(name, (tuple, list)):
        return tuple(name)
    return PALETTE.get(name, WHITE)

def make_base_purple():
    random.seed(42)
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for x1, y1, x2, y2, color in STANDARD_GLOW_POS:
        tmp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        td.ellipse([x1, y1, x2, y2], fill=(*color, int(255 * 0.65)))
        tmp = tmp.filter(ImageFilter.GaussianBlur(150))
        glow = Image.alpha_composite(glow, tmp)
    img_rgba = img.convert("RGBA")
    img_rgba = Image.alpha_composite(img_rgba, glow)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)
    for x in range(0, W, 60):
        draw.line([(x, 0), (x, H)], fill=(25, 15, 50), width=1)
    for y in range(0, H, 60):
        draw.line([(0, y), (W, y)], fill=(25, 15, 50), width=1)
    c = PURPLE_L
    draw.line([(0,40),(120,40)], fill=c, width=1)
    draw.line([(120,40),(120,0)], fill=c, width=1)
    draw.rectangle([116,36,124,44], fill=c)
    draw.line([(W,H-40),(W-120,H-40)], fill=c, width=1)
    draw.line([(W-120,H-40),(W-120,H)], fill=c, width=1)
    draw.rectangle([W-124,H-44,W-116,H-36], fill=c)
    for _ in range(60):
        px, py = random.randint(0, W), random.randint(0, H)
        rv = random.choice([1,1,1,2])
        a = random.randint(40, 120)
        pc = tuple(min(255, int(ch*a//255)) for ch in c)
        draw.ellipse([px-rv, py-rv, px+rv, py+rv], fill=pc)
    return img

def text_center(draw, text, y, font, color=WHITE):
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (W - (bbox[2] - bbox[0])) // 2
    draw.text((x+2, y+2), text, font=font, fill=(0,0,0))
    draw.text((x, y), text, font=font, fill=color)

def card(draw, x1, y1, x2, y2, r=12, fill=CARD, outline=CARD_B):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill, outline=outline, width=1)

def tag(draw, x, y, text, font, color=CYAN):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.rounded_rectangle([x, y, x+tw+20, y+th+10], radius=6,
                            fill=(15,30,60), outline=color, width=1)
    draw.text((x+10, y+5), text, font=font, fill=color)
    return tw + 20


# ─── 布局渲染器 ───────────────────────────────────────────────

def render_hook(draw, img, frame):
    f14 = load_font(14)
    tx = 40
    for t in frame.get("tags", []):
        tx += tag(draw, tx, 28, t, f14) + 12

    f72 = load_font(72)
    f56 = load_font(56)
    title    = frame.get("title", "")
    subtitle = frame.get("subtitle", "")
    GAP          = 28
    LINE_SPACING = 12
    DECOR_GAP    = 18

    title_lines  = title.split("\n")
    line_heights = []
    line_widths  = []
    for line in title_lines:
        bb = draw.textbbox((0, 0), line, font=f72)
        line_heights.append(72)
        line_widths.append(bb[2] - bb[0])
    th = sum(line_heights) + LINE_SPACING * (len(title_lines) - 1)

    sub_font = f56
    sub_bb = draw.textbbox((0, 0), subtitle, font=f56) if subtitle else None
    if sub_bb:
        for fs in [56, 48, 40, 36, 32]:
            _f = load_font(fs)
            _bb = draw.textbbox((0, 0), subtitle, font=_f)
            if (_bb[2] - _bb[0]) <= W - 80:
                sub_font = _f
                sub_bb   = _bb
                break
    sub_h  = (sub_bb[3] - sub_bb[1]) if sub_bb else 0
    sub_w  = (sub_bb[2] - sub_bb[0]) if sub_bb else 0

    total_h = th + (GAP + sub_h if subtitle else 0)
    avail_top = 60
    avail_bot = SAFE_H
    title_y = avail_top + (avail_bot - avail_top - total_h) // 2

    cur_y = title_y
    for i, (line, lh, lw) in enumerate(zip(title_lines, line_heights, line_widths)):
        lx = (W - lw) // 2
        draw.text((lx + 3, cur_y + 3), line, font=f72, fill=(120, 40, 200))
        draw.text((lx,     cur_y),     line, font=f72, fill=PURPLE_L)
        cur_y += lh + (LINE_SPACING if i < len(title_lines) - 1 else 0)

    subtitle_y = title_y + th + GAP
    if subtitle:
        x2 = (W - sub_w) // 2
        draw.text((x2 + 3, subtitle_y + 3), subtitle, font=sub_font, fill=(80, 20, 180))
        draw.text((x2,     subtitle_y),     subtitle, font=sub_font, fill=CYAN)

    line_y = subtitle_y + sub_h + DECOR_GAP
    if line_y < SAFE_H:
        draw.line([(160, line_y), (1120, line_y)], fill=CARD_B, width=1)


def render_cards(draw, img, frame):
    f18  = load_font(18)
    f_title = load_font(36)
    f_desc  = load_font(22)

    title_text    = frame.get("title", "")
    subtitle_text = frame.get("subtitle", "")
    tag_w = tag(draw, 40, 25, title_text, f18, CYAN)
    if subtitle_text:
        draw.text((40 + tag_w + 16, 30), subtitle_text, font=f_desc, fill=DIM)

    cards = frame.get("cards", [])
    n = len(cards)
    if n == 0:
        return

    CONTENT_TOP = 72
    CONTENT_BOT = SAFE_H - 16
    gap         = 14
    avail_h     = CONTENT_BOT - CONTENT_TOP
    card_h_fill = (avail_h - gap * (n - 1)) // n
    card_h      = min(card_h_fill, 120)
    total_cards_h = n * card_h + (n - 1) * gap
    start_y = CONTENT_TOP + (avail_h - total_cards_h) // 2

    colors = ["CYAN", "GOLD", "PURPLE_L", "GREEN", "ORANGE", "PINK"]
    for i, c_data in enumerate(cards):
        c_color    = col(c_data.get("color", colors[i % len(colors)]))
        cy         = start_y + i * (card_h + gap)
        card(draw, 60, cy, W-60, cy+card_h, fill=CARD, outline=c_color)
        draw.rectangle([60, cy, 67, cy+card_h], fill=c_color)

        card_title = c_data.get("title") or c_data.get("label", "")
        desc       = c_data.get("desc", "")
        text_x     = 90
        padding    = 20
        draw.text((text_x, cy + padding),       card_title, font=f_title, fill=WHITE)
        if desc:
            draw.text((text_x, cy + padding + 44), desc, font=f_desc, fill=DIM)


def render_content(draw, img, frame):
    """type=content：标题 + 要点列表（最通用的帧类型）"""
    f18  = load_font(18)
    f28  = load_font(28)
    f22  = load_font(22)

    title = frame.get("title", "")
    tag(draw, 40, 25, title, f18, CYAN)

    points = frame.get("points", [])
    if not points:
        return

    CONTENT_TOP = 85
    LINE_H      = 56
    PADDING_X   = 80

    for i, pt in enumerate(points):
        y = CONTENT_TOP + i * LINE_H
        if y + LINE_H > SAFE_H:
            break
        # 序号圆圈
        draw.ellipse([PADDING_X, y+6, PADDING_X+32, y+38],
                     fill=CARD_B, outline=CYAN, width=1)
        f16 = load_font(16)
        draw.text((PADDING_X+8, y+9), str(i+1), font=f16, fill=CYAN)
        draw.text((PADDING_X+50, y+4), pt, font=f28, fill=WHITE)


def render_outro(draw, img, frame):
    """type=outro：结尾帧，居中大字 + 小字"""
    f48 = load_font(48)
    f24 = load_font(24)
    title = frame.get("title", "")
    text_center(draw, title, SAFE_H // 2 - 60, f48, GOLD)
    subtitle = frame.get("subtitle", "")
    if subtitle:
        text_center(draw, subtitle, SAFE_H // 2 + 20, f24, DIM)


def render_comparison(draw, img, frame):
    f18 = load_font(18)
    tag(draw, 40, 25, frame.get("title", ""), f18, GOLD)
    subtitle = frame.get("subtitle", "")
    if subtitle:
        f15 = load_font(15)
        tag_bb = draw.textbbox((0, 0), frame.get("title", ""), load_font(18))
        tag_w  = tag_bb[2] - tag_bb[0] + 24
        draw.text((40 + tag_w + 12, 30), subtitle, font=f15, fill=DIM)

    left  = frame.get("left", {})
    right = frame.get("right", {})
    lc = col(left.get("color",  "GREEN"))
    rc = col(right.get("color", "RED"))

    margin  = 60
    vs_half = 30
    mid     = W // 2
    f24     = load_font(24)
    PAD     = 20
    BASE_LINE_H = 40

    def calc_card_h(data):
        n_pts = len(data.get("points", []))
        return PAD + 36 + 20 + n_pts * BASE_LINE_H + PAD

    card_h  = max(calc_card_h(left), calc_card_h(right), 180)
    CONTENT_TOP = 72
    CONTENT_BOT = SAFE_H - 16
    card_y1 = CONTENT_TOP + (CONTENT_BOT - CONTENT_TOP - card_h) // 2
    card_y2 = card_y1 + card_h

    card(draw, margin,      card_y1, mid - vs_half, card_y2, fill=(10,28,18), outline=lc)
    card(draw, mid+vs_half, card_y1, W - margin,    card_y2, fill=(28,10,10), outline=rc)

    f28   = load_font(28)
    bb_vs = draw.textbbox((0, 0), "VS", font=f28)
    vs_x  = mid - (bb_vs[2] - bb_vs[0]) // 2
    vs_y  = card_y1 + (card_h - (bb_vs[3] - bb_vs[1])) // 2
    draw.text((vs_x, vs_y), "VS", font=f28, fill=DIM)

    def wrap_text_lines(text, font, max_w):
        # 按字符增量换行，适配中英文混排
        out = []
        cur = ""
        for ch in str(text or ""):
            candidate = cur + ch
            bb = draw.textbbox((0, 0), candidate, font=font)
            if bb[2] - bb[0] <= max_w or not cur:
                cur = candidate
            else:
                out.append(cur)
                cur = ch
        if cur:
            out.append(cur)
        return out

    def draw_side(data, cx_base, cx_end, color):
        cw    = cx_end - cx_base
        label = data.get("label", "")
        bb    = draw.textbbox((0, 0), label, font=f24)
        lx    = cx_base + (cw - (bb[2]-bb[0])) // 2
        draw.text((lx, card_y1 + PAD), label, font=f24, fill=color)
        sep_y = card_y1 + PAD + 36 + 10
        draw.line([(cx_base+20, sep_y), (cx_end-20, sep_y)], fill=color, width=1)
        points = data.get("points", [])
        if points:
            # 根据可用高度自动选字号，避免文字越界
            usable_w = max(80, cw - 56)
            usable_h = max(0, card_y2 - (sep_y + 16) - PAD)
            for fs in [26, 24, 22, 20, 18]:
                font = load_font(fs)
                line_h = int(fs * 1.45)
                wrapped = []
                for pt in points:
                    wrapped.extend(wrap_text_lines(f"- {pt}", font, usable_w))
                if wrapped and len(wrapped) * line_h <= usable_h:
                    break
            else:
                font = load_font(18)
                line_h = int(18 * 1.45)
                wrapped = []
                for pt in points:
                    wrapped.extend(wrap_text_lines(f"- {pt}", font, usable_w))

            max_lines = max(1, usable_h // line_h) if line_h > 0 else 1
            draw_lines = wrapped[:max_lines]
            # 若仍超长，最后一行加省略号
            if len(wrapped) > max_lines and draw_lines:
                last = draw_lines[-1]
                while last:
                    test = last + "…"
                    bb_last = draw.textbbox((0, 0), test, font=font)
                    if bb_last[2] - bb_last[0] <= usable_w:
                        draw_lines[-1] = test
                        break
                    last = last[:-1]
                if not last:
                    draw_lines[-1] = "…"

            py = sep_y + 16
            for i, line in enumerate(draw_lines):
                y = py + i * line_h
                if y + line_h > card_y2 - PAD:
                    break
                draw.text((cx_base + 28, y), line, font=font, fill=WHITE)

    draw_side(left,  margin,      mid - vs_half, lc)
    draw_side(right, mid+vs_half, W - margin,    rc)

    insight = frame.get("insight", "")
    if insight:
        card(draw, 100, SAFE_H-50, W-100, SAFE_H-5, fill=(18,12,30), outline=GOLD)
        f18i = load_font(18)
        text_center(draw, insight, SAFE_H-40, f18i, GOLD)


# ─── 分发路由 ─────────────────────────────────────────────────
RENDERERS = {
    "hook":       render_hook,
    "cards":      render_cards,
    "content":    render_content,
    "outro":      render_outro,
    "comparison": render_comparison,
}

def render_frame(frame, out_dir):
    ftype    = frame.get("type", "content")
    fid      = frame.get("id", "00")
    out_path = os.path.join(out_dir, f"frame_{fid}.png")

    img  = make_base_purple()
    draw = ImageDraw.Draw(img)

    renderer = RENDERERS.get(ftype)
    if renderer:
        renderer(draw, img, frame)
    else:
        # 未知类型降级为 content
        render_content(draw, img, frame)

    img.save(out_path)
    print(f"  frame_{fid}.png [{ftype}]")
    return out_path


if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "frames.json"
    out_dir   = os.path.join(os.path.dirname(os.path.abspath(json_path)), "frames")

    os.makedirs(out_dir, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    frames = data.get("frames", [])
    print(f"渲染 {len(frames)} 帧 → {out_dir}/")
    for frame in frames:
        render_frame(frame, out_dir)

    print(f"\n✅ 全部完成，共 {len(frames)} 帧")

