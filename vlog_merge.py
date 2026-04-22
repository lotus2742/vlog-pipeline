#!/usr/bin/env python3
"""
视频合成
"""
import json, sys, os, subprocess, time

def get_duration(mp3):
    r = subprocess.run(
        ["ffprobe","-v","error","-show_entries","format=duration",
         "-of","default=noprint_wrappers=1:nokey=1", mp3],
        capture_output=True, text=True)
    return float(r.stdout.strip())

def _build_atempo_chain(speed_factor):
    """
    ffmpeg atempo 单个滤镜仅支持 0.5~2.0。
    当需要更大倍速时，拆成多个 atempo 串联。
    """
    sf = max(1.0, float(speed_factor))
    parts = []
    while sf > 2.0:
        parts.append("atempo=2.0")
        sf /= 2.0
    parts.append(f"atempo={sf:.5f}")
    return ",".join(parts)

def _to_bool(v):
    return str(v).strip().lower() in {"1", "true", "yes", "on"}

def _maybe_speedup_audio(src_mp3, dst_mp3, target_dur, enable_speedup=False):
    """
    当音频过长时，生成加速版音频并返回新路径。
    返回: (audio_path, audio_duration, sped_up)
    """
    audio_dur = get_duration(src_mp3)
    if (not enable_speedup) or target_dur <= 0 or audio_dur <= target_dur:
        return src_mp3, audio_dur, False
    speed = audio_dur / target_dur
    af = _build_atempo_chain(speed)
    cmd = [
        "ffmpeg", "-y",
        "-i", src_mp3,
        "-filter:a", af,
        "-c:a", "aac", "-b:a", "128k",
        dst_mp3,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    new_dur = get_duration(dst_mp3)
    return dst_mp3, new_dur, True

def make_seg(
    fid,
    frame_png,
    mp3,
    seg_path,
    target_max_sec=0,
    min_seg_sec=0,
    enable_speedup=False
):
    if os.path.exists(seg_path):
        os.remove(seg_path)
    seg_dir = os.path.dirname(seg_path)
    sped_mp3 = os.path.join(seg_dir, f"audio_fast_{fid}.m4a")
    use_mp3, audio_dur, sped = _maybe_speedup_audio(
        mp3,
        sped_mp3,
        target_max_sec,
        enable_speedup=enable_speedup
    )
    final_dur = max(audio_dur, min_seg_sec if min_seg_sec > 0 else 0)
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", "24", "-i", frame_png,
        "-i", use_mp3,
        "-t", f"{final_dur:.3f}",
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-r", "24",
        "-shortest",
        seg_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    if sped and os.path.exists(sped_mp3):
        os.remove(sped_mp3)
    return final_dur, sped

def main(json_path, output_mp4):
    base = os.path.dirname(os.path.abspath(json_path))
    frames_dir = os.path.join(base, "frames")
    audio_dir = os.path.join(base, "audio")
    segs_dir = os.path.join(base, "segs")
    os.makedirs(segs_dir, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    meta = data.get("meta", {}) if isinstance(data.get("meta"), dict) else {}
    # 默认策略：单帧最长 9 秒，最短 2.8 秒（避免切页太快）
    # 注意：默认关闭语速压缩，避免“讲话过快”的听感问题。
    max_seg_sec = float(meta.get("max_seg_sec", os.getenv("VLOG_MAX_SEG_SEC", "9")))
    min_seg_sec = float(meta.get("min_seg_sec", os.getenv("VLOG_MIN_SEG_SEC", "2.8")))
    enable_speedup = _to_bool(
        meta.get("enable_speedup", os.getenv("VLOG_ENABLE_SPEEDUP", "0"))
    )

    frames = data.get('frames', [])
    seg_files = []
    sped_count = 0

    print(
        f"合成 {len(frames)}段视频... "
        f"(max_seg_sec={max_seg_sec:.1f}, min_seg_sec={min_seg_sec:.1f}, "
        f"enable_speedup={int(enable_speedup)})"
    )
    for frame in frames:
        fid = frame.get("id", "00")
        png = os.path.join(frames_dir, f"frame_{fid}.png")
        mp3 = os.path.join(audio_dir, f"{fid}.mp3")
        seg = os.path.join(segs_dir, f"seg_{fid}.mp4")

        if not os.path.exists(png):
            print(f"{fid}: 缺少帧图 {png},跳过"); continue
        if not os.path.exists(mp3):
            print(f"{fid}: 缺少音频 {mp3},跳过"); continue

        seg_dur, sped = make_seg(
            fid,
            png,
            mp3,
            seg,
            target_max_sec=max_seg_sec,
            min_seg_sec=min_seg_sec,
            enable_speedup=enable_speedup
        )
        if sped:
            sped_count += 1
        seg_files.append(seg)
        print(f"seg_{fid}.mp4 {seg_dur:.1f}s" + (" (已压缩语速)" if sped else ""))
    if not seg_files:
        print("没有可合并的片段"); return 
    
    concat_txt = os.path.join(base, 'concat.txt')
    with open(concat_txt, 'w') as f:
        for seg in seg_files:
            f.write(f"file '{os.path.abspath(seg)}'\n")
    subprocess.run(
        ['ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_txt, '-c', 'copy', output_mp4],
        check=True, capture_output=True
    )

    size_mb = os.path.getsize(output_mp4)/ 1024/1024
    total_dur = sum(get_duration(s) for s in seg_files)

    print(f"\n ✅ 完成: {output_mp4} ({total_dur:.0f}s, {size_mb: .1f}MB, 压缩语速 {sped_count} 段)")

if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "frames.json"
    ts = int(time.time())
    output_mp4 = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(json_path)), f"{ts}.mp4"
    )
    main(json_path, output_mp4)






