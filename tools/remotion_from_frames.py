#!/usr/bin/env python3
"""
从任意符合规范的 frames.json（meta + frames）生成 Remotion props，可选渲染 MP4 或同步到 Studio。

步骤：
1) 将 JSON 复制到 job 目录下的 frames.json（便于生成 audio/ 与相对路径）
2) 可选：运行 vlog_audio.py 生成配音（用于按真实音频时长算每段帧数）
3) 写出 Remotion props JSON（out/）
4) 可选 --studio：复制到 remotion-demo/src/studio-active-props.json，用 npm run dev 选 VlogFramesStudio 预览（不渲 MP4）
5) 否则：调用 remotion_renderer.py 尝试渲染 MP4
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.remotion_renderer import build_remotion_props


CN_STOPWORDS = {
    "我们",
    "你们",
    "他们",
    "这个",
    "那个",
    "这样",
    "可以",
    "需要",
    "通过",
    "以及",
    "然后",
    "进行",
    "系统",
    "能力",
    "问题",
    "场景",
    "配置",
}
EN_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "your",
    "you",
    "agent",
}


def _extract_caption_keywords(frame: dict, limit: int = 8) -> list[str]:
    script = str(frame.get("script", "")).strip()
    if not script:
        return []

    # 以 script 为唯一主语料，避免标题词干扰字幕高亮。
    cn_terms = re.findall(r"[\u4e00-\u9fff]{2,8}", script)
    en_terms = re.findall(r"[A-Za-z][A-Za-z0-9_+-]{1,20}", script)

    score: dict[str, int] = {}

    def add_term(term: str, base: int) -> None:
        t = term.strip()
        if not t:
            return
        if re.fullmatch(r"[\u4e00-\u9fff]+", t):
            if t in CN_STOPWORDS:
                return
        else:
            if t.lower() in EN_STOPWORDS:
                return
        score[t] = score.get(t, 0) + base

    for t in cn_terms:
        add_term(t, 1)
    for t in en_terms:
        add_term(t, 2)

    # 按分数+长度排序，去重取前 N
    ranked = sorted(score.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    return [k for k, _ in ranked[:limit]]


def _extract_caption_keywords_from_cues(cues: list[dict], limit: int = 8) -> list[str]:
    """
    从 SRT cue 的完整句片中抽关键词，避免半截短语。
    """
    if not cues:
        return []

    texts = [str(c.get("text", "")).strip() for c in cues if str(c.get("text", "")).strip()]
    if not texts:
        return []

    score: dict[str, int] = {}

    def add_term(term: str, base: int) -> None:
        t = term.strip("，。！？；：、,.!?;: ")
        if not t:
            return
        if re.fullmatch(r"[\u4e00-\u9fff]+", t):
            if len(t) < 2 or len(t) > 8 or t in CN_STOPWORDS:
                return
        else:
            low = t.lower()
            if len(t) < 2 or len(t) > 20 or low in EN_STOPWORDS:
                return
        score[t] = score.get(t, 0) + base

    for idx, txt in enumerate(texts):
        # 句级候选：中文短片 + 英文术语
        cn_terms = re.findall(r"[\u4e00-\u9fff]{2,6}", txt)
        en_terms = re.findall(r"[A-Za-z][A-Za-z0-9_+-]{1,20}", txt)
        for t in cn_terms:
            add_term(t, 2)
        for t in en_terms:
            add_term(t, 3)

        # cue 前两句通常是核心论点，稍微加权
        if idx <= 1:
            for t in cn_terms[:2]:
                add_term(t, 2)
            for t in en_terms[:2]:
                add_term(t, 2)

    ranked = sorted(score.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    return [k for k, _ in ranked[:limit]]


def _extract_caption_keywords_from_script(script: str, limit: int = 8) -> list[str]:
    """
    以 script 分句为主抽关键词，减少 SRT 换行造成的半截词。
    """
    script = (script or "").strip()
    if not script:
        return []
    sentences = [s.strip() for s in re.split(r"[。！？；\n]+", script) if s.strip()]
    if not sentences:
        sentences = [script]

    score: dict[str, int] = {}

    def add_term(term: str, base: int) -> None:
        t = term.strip("，。！？；：、,.!?;: ")
        if not t:
            return
        if re.fullmatch(r"[\u4e00-\u9fff]+", t):
            if len(t) < 2 or len(t) > 6 or t in CN_STOPWORDS:
                return
        else:
            if len(t) < 2 or len(t) > 20 or t.lower() in EN_STOPWORDS:
                return
        score[t] = score.get(t, 0) + base

    for idx, sent in enumerate(sentences):
        sent_weight = 2 if idx <= 1 else 1
        # 中文按短语边界提取，避免固定长度切块导致半截词
        clauses = [c.strip() for c in re.split(r"[，、：,\s]+", sent) if c.strip()]
        for c in clauses:
            # 仅保留纯中文短语，长度适中
            if re.fullmatch(r"[\u4e00-\u9fff]+", c) and 2 <= len(c) <= 10:
                add_term(c, sent_weight + 1)
            # 子短语（“配置安全和记忆治理” -> “配置安全”“记忆治理”）
            for sub in re.split(r"[和与及并再把将让]", c):
                sub = sub.strip()
                if re.fullmatch(r"[\u4e00-\u9fff]+", sub) and 2 <= len(sub) <= 8:
                    add_term(sub, sent_weight)

        for t in re.findall(r"[A-Za-z][A-Za-z0-9_+-]{1,20}", sent):
            add_term(t, 2 + sent_weight)

        # 顿号并列结构，拆出更语义化关键词（如 配置安全、记忆治理、技能沉淀）
        if "、" in sent:
            for chunk in sent.split("、"):
                chunk = chunk.strip("，。！？；： ")
                if 2 <= len(chunk) <= 8:
                    add_term(chunk, sent_weight + 2)

    ranked = sorted(score.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    return [k for k, _ in ranked[:limit]]


def _srt_time_to_seconds(ts: str) -> float:
    # 00:00:03,120
    hh, mm, rest = ts.split(":")
    ss, ms = rest.split(",")
    return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0


def _parse_srt(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return []
    blocks = re.split(r"\n\s*\n", text)
    cues = []
    for block in blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        # 兼容第一行是序号或直接时间轴
        if "-->" in lines[0]:
            time_line = lines[0]
            body_lines = lines[1:]
        elif len(lines) >= 3 and "-->" in lines[1]:
            time_line = lines[1]
            body_lines = lines[2:]
        else:
            continue
        try:
            start_ts, end_ts = [s.strip() for s in time_line.split("-->", 1)]
            start_s = _srt_time_to_seconds(start_ts)
            end_s = _srt_time_to_seconds(end_ts)
        except Exception:
            continue
        body = " ".join(body_lines).strip()
        if not body:
            continue
        cues.append({"start": start_s, "end": end_s, "text": body})
    return cues


def main() -> int:
    parser = argparse.ArgumentParser(description="从 frames.json 生成 Remotion 视频与 props")
    parser.add_argument(
        "--frames",
        required=True,
        type=Path,
        help="frames.json 路径（如 tmp/hermes_agent_frames_rich.json）",
    )
    parser.add_argument(
        "--job-dir",
        type=Path,
        default=None,
        help="工作目录（默认: tmp/remotion_jobs/<源文件名不含后缀>）",
    )
    parser.add_argument(
        "--skip-audio",
        action="store_true",
        help="不调用 vlog_audio，仅用 script 估算每段时长",
    )
    parser.add_argument(
        "--props-only",
        action="store_true",
        help="只生成 props JSON，不调用 Remotion CLI（适合本机无法 headless 渲染时）",
    )
    parser.add_argument(
        "--studio",
        action="store_true",
        help="同步 props 到 remotion-demo/src/studio-active-props.json，便于有界面 Studio 预览（不渲 MP4）",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=PROJECT_ROOT / "remotion-demo" / "out",
        help="输出 props / mp4 的目录",
    )
    parser.add_argument(
        "--composition-id",
        default="VlogFrames",
        help="Remotion Composition id",
    )
    args = parser.parse_args()

    src = args.frames.expanduser().resolve()
    if not src.is_file():
        print(f"找不到文件: {src}", file=sys.stderr)
        return 2

    if args.job_dir is not None:
        job_dir = args.job_dir.expanduser().resolve()
    else:
        job_dir = (PROJECT_ROOT / "tmp" / "remotion_jobs" / src.stem).resolve()
    job_dir.mkdir(parents=True, exist_ok=True)
    job_json = job_dir / "frames.json"
    shutil.copy(src, job_json)
    print(f"[remotion_from_frames] job_dir={job_dir}")

    if not args.skip_audio:
        rc = subprocess.run(
            [sys.executable, str(PROJECT_ROOT / "vlog_audio.py"), str(job_json)],
            cwd=str(job_dir),
        ).returncode
        if rc != 0:
            print(
                "[remotion_from_frames] 警告: vlog_audio 失败，将按 script 估算时长",
                file=sys.stderr,
            )

    args.out_dir.mkdir(parents=True, exist_ok=True)
    stem = src.stem
    props_path = args.out_dir / f"{stem}_remotion_props.json"
    mp4_path = args.out_dir / f"{stem}_remotion.mp4"

    data = json.loads(job_json.read_text(encoding="utf-8"))
    props = build_remotion_props(data, str(job_json), fps=30)
    for slide in props.get("slides", []):
        frame_obj = slide.get("frame", {}) if isinstance(slide.get("frame"), dict) else {}
        override = frame_obj.get("captionKeywordsOverride")
        if isinstance(override, list):
            manual = [str(x).strip() for x in override if str(x).strip()]
            if manual:
                slide["captionKeywords"] = manual[:8]
                continue
        kws = _extract_caption_keywords(frame_obj, limit=8)
        if kws:
            slide["captionKeywords"] = kws

    if args.studio:
        remotion_dir = PROJECT_ROOT / "remotion-demo"
        studio_audio_dir = remotion_dir / "public" / "studio-audio" / stem
        studio_audio_dir.mkdir(parents=True, exist_ok=True)
        audio_dir = job_dir / "audio"
        if audio_dir.is_dir():
            for slide in props.get("slides", []):
                sid = str(slide.get("id", "")).strip()
                if not sid:
                    continue
                src_mp3 = audio_dir / f"{sid}.mp3"
                src_srt = audio_dir / f"{sid}.srt"
                if src_mp3.is_file():
                    dst_mp3 = studio_audio_dir / f"{sid}.mp3"
                    shutil.copy(src_mp3, dst_mp3)
                    slide["audioSrc"] = f"studio-audio/{stem}/{sid}.mp3"
                if src_srt.is_file():
                    cues = _parse_srt(src_srt)
                    slide["captions"] = cues
                    # 手动覆盖优先级最高：若设置了 captionKeywordsOverride，不再自动改写。
                    if isinstance(slide.get("captionKeywords"), list) and slide["captionKeywords"]:
                        continue
                    frame_obj = slide.get("frame", {}) if isinstance(slide.get("frame"), dict) else {}
                    script_text = str(frame_obj.get("script", "")).strip()
                    kws = _extract_caption_keywords_from_script(script_text, limit=6)
                    if not kws:
                        kws = _extract_caption_keywords_from_cues(cues, limit=6)
                    if kws:
                        slide["captionKeywords"] = kws

    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[remotion_from_frames] props -> {props_path}")

    if args.studio:
        studio_dest = remotion_dir / "src" / "studio-active-props.json"
        shutil.copy(props_path, studio_dest)
        print(f"[remotion_from_frames] 已同步 Studio 预览数据 -> {studio_dest}")
        print(
            "[remotion_from_frames] 下一步: cd remotion-demo && npm run dev ，左侧选择 **VlogFramesStudio**（含配音），"
            "若 Studio 已在运行请重启以加载新 JSON。"
        )

    if args.props_only or args.studio:
        if args.props_only and not args.studio:
            print("[remotion_from_frames] 已跳过 Remotion CLI（--props-only）")
        return 0

    rc = subprocess.run(
        [
            sys.executable,
            str(PROJECT_ROOT / "tools" / "remotion_renderer.py"),
            "--frames",
            str(job_json),
            "--output",
            str(mp4_path),
            "--project-dir",
            str(PROJECT_ROOT / "remotion-demo"),
            "--composition-id",
            args.composition_id,
        ],
        cwd=str(PROJECT_ROOT),
    ).returncode
    if rc != 0:
        try:
            cat_hint = props_path.relative_to(PROJECT_ROOT / "remotion-demo").as_posix()
        except ValueError:
            cat_hint = str(props_path)
        print(
            "[remotion_from_frames] Remotion CLI 渲染失败时，可用 Studio 粘贴 props，或在新系统执行:\n"
            f"  cd {PROJECT_ROOT / 'remotion-demo'} && "
            f'npx remotion render {args.composition_id} out.mp4 --props "$(cat {cat_hint})"',
            file=sys.stderr,
        )
        print(f"  props 文件: {props_path}", file=sys.stderr)
        return rc

    print(f"[remotion_from_frames] mp4 -> {mp4_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
