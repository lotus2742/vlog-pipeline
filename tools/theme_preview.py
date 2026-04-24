#!/usr/bin/env python3
"""
theme_preview.py

同一份 frames.json 一次渲染多套主题，并输出首帧总览图。
"""

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_THEMES = ["purple", "ocean", "dark", "light"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="渲染多主题预览并生成对比图")
    parser.add_argument("--frames", required=True, help="输入 frames.json 路径")
    parser.add_argument(
        "--themes",
        default=",".join(DEFAULT_THEMES),
        help=f"主题列表，逗号分隔。默认: {','.join(DEFAULT_THEMES)}",
    )
    parser.add_argument(
        "--output-dir",
        default="tmp/theme_preview",
        help="输出目录（默认 tmp/theme_preview）",
    )
    parser.add_argument(
        "--keep-json",
        action="store_true",
        help="保留每个主题生成的临时 JSON 文件",
    )
    return parser.parse_args()


def _theme_list(text: str) -> list[str]:
    out = []
    for x in str(text or "").split(","):
        t = x.strip().lower()
        if t and t not in out:
            out.append(t)
    return out


def _run_render(theme_json_path: Path) -> tuple[int, str]:
    cmd = [
        sys.executable,
        str(PROJECT_ROOT / "vlog_render.py"),
        str(theme_json_path),
    ]
    proc = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
    output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    return proc.returncode, output.strip()


def _load_first_frame_id(data: dict) -> str:
    frames = data.get("frames", [])
    if not isinstance(frames, list) or not frames:
        return "00"
    return str((frames[0] or {}).get("id", "00"))


def _write_contact_sheet(cards: list[tuple[str, Path]], out_path: Path) -> None:
    if not cards:
        return
    images = []
    for name, p in cards:
        if p.exists():
            images.append((name, Image.open(p).convert("RGB")))
    if not images:
        return

    thumb_w, thumb_h = 560, 315
    gap = 24
    pad = 30
    label_h = 44
    cols = 2
    rows = (len(images) + cols - 1) // cols
    canvas_w = pad * 2 + cols * thumb_w + (cols - 1) * gap
    canvas_h = pad * 2 + rows * (thumb_h + label_h) + (rows - 1) * gap
    canvas = Image.new("RGB", (canvas_w, canvas_h), (20, 24, 34))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()

    for i, (name, img) in enumerate(images):
        r = i // cols
        c = i % cols
        x = pad + c * (thumb_w + gap)
        y = pad + r * (thumb_h + label_h + gap)
        thumb = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(thumb, (x, y))
        draw.rectangle([x, y + thumb_h, x + thumb_w, y + thumb_h + label_h], fill=(28, 34, 46))
        draw.text((x + 12, y + thumb_h + 14), f"theme: {name}", fill=(220, 230, 245), font=font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)


def main() -> int:
    args = parse_args()
    frames_path = Path(args.frames).expanduser().resolve()
    if not frames_path.exists():
        print(f"❌ 找不到文件: {frames_path}", file=sys.stderr)
        return 2

    themes = _theme_list(args.themes)
    if not themes:
        print("❌ 主题列表为空，请用 --themes 指定", file=sys.stderr)
        return 2

    raw = json.loads(frames_path.read_text(encoding="utf-8"))
    first_id = _load_first_frame_id(raw)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    root_out = Path(args.output_dir).expanduser().resolve() / ts
    root_out.mkdir(parents=True, exist_ok=True)

    overview_cards = []
    ok_count = 0
    for theme in themes:
        themed = json.loads(json.dumps(raw, ensure_ascii=False))
        if not isinstance(themed.get("meta"), dict):
            themed["meta"] = {}
        themed["meta"]["theme"] = theme

        json_path = root_out / f"frames_{theme}.json"
        json_path.write_text(json.dumps(themed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        code, output = _run_render(json_path)
        if code != 0:
            print(f"❌ 渲染失败: {theme}")
            if output:
                print(output)
            continue

        theme_frames_dir = root_out / f"frames_{theme}"
        rendered_default_dir = json_path.parent / "frames"
        if rendered_default_dir.exists():
            if theme_frames_dir.exists():
                shutil.rmtree(theme_frames_dir)
            shutil.move(str(rendered_default_dir), str(theme_frames_dir))

        cover = theme_frames_dir / f"frame_{first_id}.png"
        overview_cards.append((theme, cover))
        ok_count += 1
        print(f"✅ 完成: {theme} -> {theme_frames_dir}")

        if not args.keep_json and json_path.exists():
            json_path.unlink()

    overview_path = root_out / "theme_overview.png"
    _write_contact_sheet(overview_cards, overview_path)
    if overview_path.exists():
        print(f"🖼️ 总览图: {overview_path}")
    print(f"完成 {ok_count}/{len(themes)} 个主题")
    print(f"输出目录: {root_out}")
    return 0 if ok_count > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

