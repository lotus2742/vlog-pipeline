#!/usr/bin/env python3
"""
视频合成
"""
import json, sys,os,subprocess, time

def get_duration(mp3):
    r = subprocess.run(
        ["ffprobe","-v","error","-show_entries","format=duration",
         "-of","default=noprint_wrappers=1:nokey=1", mp3],
        capture_output=True, text=True)
    return float(r.stdout.strip())

def make_seg(fid,frame_png,mp3,seg_path):
    if os.path.exists(seg_path):
        os.remove(seg_path)
    audio_dur = get_duration(mp3)
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", "24", "-i", frame_png,
        "-i", mp3,
        "-t", f"{audio_dur:.3f}",
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-r", "24",
        "-shortest",
        seg_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def main(json_path, output_mp4):
    base = os.path.dirname(os.path.abspath(json_path))
    frames_dir = os.path.join(base, "frames")
    audio_dir = os.path.join(base, "audio")
    segs_dir = os.path.join(base, "segs")
    os.makedirs(segs_dir, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    
    frames = data.get('frames', [])
    seg_files = []

    print(f"合成 {len(frames)}段视频...")
    for frame in frames:
        fid = frame.get("id", "00")
        png = os.path.join(frames_dir, f"frame_{fid}.png")
        mp3 = os.path.join(audio_dir, f"{fid}.mp3")
        seg = os.path.join(segs_dir, f"seg_{fid}.mp4")

        if not os.path.exists(png):
            print(f"{fid}: 缺少帧图 {png},跳过"); continue
        if not os.path.exists(mp3):
            print(f"{fid}: 缺少音频 {mp3},跳过"); continue
        
        make_seg(fid, png, mp3, seg)
        seg_files.append(seg)
        dur = get_duration(seg)
        print(f"seg_{fid}.mp4 {dur:.1f}s")
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

    print(f"\n ✅ 完成: {output_mp4} ({total_dur:.0f}s, {size_mb: .1f}MB)")

if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "frames.json"
    ts = int(time.time())
    output_mp4 = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(json_path)), f"{ts}.mp4"
    )
    main(json_path, output_mp4)






