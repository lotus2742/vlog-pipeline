#!/usr/bin/env python3
"""
从 studio spec JSON 生成 remotion-demo/public/studio-preview 下的预览 JSON。

Spec 格式见 tools/studio-specs/README.md

用法:
  python3 tools/build_studio_from_spec.py tools/studio-specs/mcp-ep3-compare-v2.json
  python3 vlog_audio.py remotion-demo/public/studio-preview/latest.json --studio-bundle <bundle>
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "remotion-demo/public/studio-preview/latest.json"
DEFAULT_FPS = 30
MIN_FRAMES = 45


def _resolve_path(raw: str) -> Path:
    p = Path(raw).expanduser()
    if not p.is_absolute():
        p = ROOT / p
    return p.resolve()


def _slide_duration_frames(index: int, slide: dict, seg_sec: list[int], fps: int) -> int:
    if slide.get("durationInFrames") is not None:
        return max(MIN_FRAMES, int(slide["durationInFrames"]))
    if slide.get("durationSec") is not None:
        return max(MIN_FRAMES, int(float(slide["durationSec"]) * fps))
    if slide.get("durationFrames") is not None:
        return max(MIN_FRAMES, int(slide["durationFrames"]))
    if index < len(seg_sec):
        return max(MIN_FRAMES, int(seg_sec[index] * fps))
    return max(MIN_FRAMES, 15 * fps)


def build_from_spec(spec: dict) -> dict:
    meta = spec.get("meta")
    if not isinstance(meta, dict):
        raise ValueError("spec.meta 必须为对象")

    slides_in = spec.get("slides")
    if not isinstance(slides_in, list) or not slides_in:
        raise ValueError("spec.slides 必须为非空数组")

    id_prefix = str(spec.get("idPrefix", "slide")).strip() or "slide"
    fps = int(spec.get("fps", DEFAULT_FPS))
    seg_sec_raw = spec.get("segSec", spec.get("seg_sec", []))
    seg_sec = [int(x) for x in seg_sec_raw] if isinstance(seg_sec_raw, list) else []

    out_slides: list[dict] = []
    for i, slide in enumerate(slides_in):
        if not isinstance(slide, dict):
            raise ValueError(f"slides[{i}] 必须为对象")
        typ = str(slide.get("type", "")).strip()
        if not typ:
            raise ValueError(f"slides[{i}].type 不能为空")

        slug = str(slide.get("slug", slide.get("_slug", f"lens{i + 1:02d}"))).strip()
        slide_id = str(slide.get("id", "")).strip()
        if not slide_id:
            slide_id = f"{id_prefix}_lens{i + 1:02d}_{slug}"

        frame = slide.get("frame")
        if not isinstance(frame, dict):
            frame = {k: v for k, v in slide.items() if k not in {
                "id", "slug", "_slug", "type", "durationSec", "durationInFrames",
                "durationFrames", "voiceScript", "narration", "frame",
            }}
        else:
            frame = dict(frame)

        voice = (slide.get("voiceScript") or slide.get("narration") or "").strip()
        if not voice:
            voice = (frame.get("voiceScript") or frame.get("narration") or "").strip()
        if voice:
            frame["voiceScript"] = voice

        out_slides.append({
            "id": slide_id,
            "type": typ,
            "durationInFrames": _slide_duration_frames(i, slide, seg_sec, fps),
            "frame": frame,
        })

    video_type = str(spec.get("videoType", meta.get("videoType", "vlog"))).strip() or "vlog"
    aspect_ratio = str(meta.get("aspectRatio", "")).strip()
    payload: dict[str, Any] = {
        "meta": meta,
        "videoType": video_type,
        "slides": out_slides,
    }
    if aspect_ratio in ("9:16", "16:9"):
        payload["aspectRatio"] = aspect_ratio
    return payload


def load_spec(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("spec 根节点必须为 JSON 对象")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description="从 studio spec JSON 生成 Studio 预览 JSON")
    parser.add_argument("spec", type=Path, help="tools/studio-specs/*.json")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="覆盖 spec.output 的输出路径",
    )
    parser.add_argument(
        "--no-copy-latest",
        action="store_true",
        help="即使 spec.copyToLatest=true 也不复制到 latest.json",
    )
    args = parser.parse_args()

    spec_path = args.spec.expanduser().resolve()
    if not spec_path.is_file():
        print(f"找不到 spec: {spec_path}")
        return 2

    spec = load_spec(spec_path)
    payload = build_from_spec(spec)

    out_raw = args.out or spec.get("output") or str(DEFAULT_OUT.relative_to(ROOT))
    out_path = _resolve_path(str(out_raw))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if spec.get("copyToLatest") and not args.no_copy_latest:
        latest = _resolve_path("remotion-demo/public/studio-preview/latest.json")
        if latest != out_path:
            shutil.copy(out_path, latest)
            print(f"Copied -> {latest}")

    bundle = str(spec.get("bundle", "")).strip()
    total_sec = sum(s["durationInFrames"] for s in payload["slides"]) / int(spec.get("fps", DEFAULT_FPS))
    print(f"Wrote {out_path} ({len(payload['slides'])} slides, ~{total_sec:.0f}s placeholder)")
    if bundle:
        print(f"Next: python3 vlog_audio.py {out_path} --studio-bundle {bundle}")
    else:
        print(f"Next: python3 vlog_audio.py {out_path} --studio-bundle <bundle-name>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
