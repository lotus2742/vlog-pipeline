#!/usr/bin/env python3
"""
render_server.py - 渲染服务
POST /render 提交渲染任务 立即返回 job_id，可选浏览器打开 watch_url 查看进度
GET /status/{job_id} 轮询任务状态（含 stage / progress / stage_label）
GET /watch/{job_id} 简易进度页（loading + 进度条）
GET /download/{job_id} 下载渲染结果 (mp4)
GET /mcp MCP服务 (mcp.server.StreamText)
POST /mcp JSON-RPC服务 (mcp.server.StreamText)

启动: uvicorn render_server:app --host 0.0.0.0 --port 8765
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, model_validator
import subprocess, json, os, time, threading, uuid, html
from validate_frames import run_validation
from frame_expander import expand_long_frames

app = FastAPI(title="Video Render Server", version="0.1.0")

# 脚本与工作目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORK_DIR = os.path.join(os.path.expanduser("~"), 'vlog-render-job')
os.makedirs(WORK_DIR, exist_ok=True)

jobs: dict = {}


def _validate_render_content(frames: list) -> list:
    """
    渲染前语义校验：避免“结构合法但画面空白”。
    返回错误列表；为空表示通过。
    """
    errors = []
    for i, frame in enumerate(frames or []):
        ftype = frame.get("type")
        if ftype != "comparison":
            continue
        left = frame.get("left", {}) if isinstance(frame.get("left"), dict) else {}
        right = frame.get("right", {}) if isinstance(frame.get("right"), dict) else {}
        l_points = left.get("points", [])
        r_points = right.get("points", [])
        has_l = isinstance(l_points, list) and len(l_points) > 0
        has_r = isinstance(r_points, list) and len(r_points) > 0
        has_insight = bool(str(frame.get("insight", "")).strip())
        if not (has_l or has_r or has_insight):
            errors.append(
                f"frames[{i}] comparison 内容为空：请至少提供 left.points/right.points 其一，"
                f"或提供 insight，避免画面留白。"
            )
    return errors

class RenderRequest(BaseModel):
    """支持两种 JSON：1) job_id + frames + topic/voice/rate；2) validate_frames 同款 meta + frames（可无 job_id，服务端生成）。"""

    job_id: str = ""  # 空则提交后由 model_validator 填 UUID
    frames: list  # frames.json 的 frames 数组
    topic: str = "未命名"
    voice: str = "zh-CN-XiaoyiNeural"
    rate: str = "+5%"

    @model_validator(mode="before")
    @classmethod
    def flatten_meta_or_fill_job_id(cls, data):
        if not isinstance(data, dict):
            return data
        out = {k: v for k, v in data.items() if k != "meta"}
        meta = data.get("meta")
        if isinstance(meta, dict):
            if meta.get("topic"):
                out.setdefault("topic", meta["topic"])
            if meta.get("voice"):
                out.setdefault("voice", meta["voice"])
            if meta.get("rate"):
                out.setdefault("rate", meta["rate"])
        if not str(out.get("job_id", "")).strip():
            out["job_id"] = str(uuid.uuid4())
        return out

# http api
@app.get('/')
def index():
    return {"service": "vlog-render-server", "status": "running", "jobs": len(jobs)}

@app.post("/render")
def submit_render(req: RenderRequest):
    """提交渲染任务,立即返回,后台异步执行"""
    payload_raw = {
        "meta": {"topic": req.topic, "voice": req.voice, "rate": req.rate},
        "frames": req.frames
    }
    # 小白讲清楚优先：放宽自动拆页阈值，减少仅因时长被硬拆。
    payload, split_stats = expand_long_frames(payload_raw, target_script_len=170, max_frames=12)
    validation = run_validation(payload)
    if not validation.get("is_valid"):
        raise HTTPException(
            status_code=422,
            detail={
                "message": "frames.json 校验失败，请修正后重试",
                "errors": validation.get("errors", []),
                "error_summary": validation.get("error_summary", ""),
            },
        )
    render_content_errors = _validate_render_content(req.frames)
    if render_content_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "渲染内容校验失败，请补充画面字段后重试",
                "errors": render_content_errors,
                "error_summary": "; ".join(render_content_errors),
            },
        )

    job_dir = os.path.join(WORK_DIR, req.job_id)
    os.makedirs(job_dir, exist_ok=True)

    frames_path = os.path.join(job_dir, "frames.json")

    with open(frames_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    jobs[req.job_id] = {
        "status": "pending",
        "stage": "queued",
        "stage_label": "排队中",
        "progress": 0,
        "mp4_path": "",
        "error": "",
        "created_at": int(time.time()),
        "updated_at": int(time.time()),
    }

    t = threading.Thread(
        target=run_pipeline,
        args=(req.job_id, job_dir, frames_path),
        daemon=True,
    )
    t.start()
    return {
        "job_id": req.job_id,
        "status": "pending",
        "job_dir": job_dir,
        "watch_url": f"/watch/{req.job_id}",
        "split_applied": split_stats.get("expanded_count", 0) > 0,
        "split_stats": split_stats,
        "hint": f"浏览器打开 http://localhost:8765/watch/{req.job_id} 可查看制作进度",
    }

@app.get("/status/{job_id}")
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="jobs not found")
    return jobs[job_id]

@app.get("/download/{job_id}")
def download(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="jobs not found")
    if jobs[job_id]["status"] != "done":
        raise HTTPException(status_code=425, detail=f"not ready: {jobs[job_id]['status']}")
    mp4_path = jobs[job_id]['mp4_path']
    return FileResponse(mp4_path, media_type='video/mp4', filename=f"{job_id}.mp4")

@app.get("/jobs")
def list_jobs():
    return {
        jid: {k: v for k, v in info.items() if k != "mp4_path"}
        for jid, info in jobs.items()
    }


def _job_touch(job_id: str, **fields):
    fields["updated_at"] = int(time.time())
    jobs[job_id].update(fields)


@app.get("/watch/{job_id}", response_class=HTMLResponse)
def watch_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="jobs not found")
    # 单页轮询 /status，无外部依赖
    return HTMLResponse(
        f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>渲染进度 · {html.escape(job_id)}</title>
  <style>
    :root {{
      --bg: #0f1419;
      --card: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #3b82f6;
      --ok: #22c55e;
      --err: #ef4444;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg); color: var(--text);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }}
    .card {{
      width: min(420px, 100%); background: var(--card); border-radius: 16px;
      padding: 28px 24px; box-shadow: 0 20px 50px rgba(0,0,0,.35);
    }}
    h1 {{ font-size: 1.1rem; font-weight: 600; margin: 0 0 8px; }}
    .id {{ font-size: 0.75rem; color: var(--muted); word-break: break-all; margin-bottom: 20px; }}
    .spinner {{
      width: 48px; height: 48px; border-radius: 50%;
      border: 3px solid rgba(59,130,246,.25); border-top-color: var(--accent);
      animation: spin 0.85s linear infinite; margin: 0 auto 20px;
    }}
    .spinner.done {{ display: none; }}
    .spinner.err {{ display: none; }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
    .label {{ text-align: center; font-size: 0.95rem; margin-bottom: 14px; min-height: 1.4em; }}
    .bar {{
      height: 8px; border-radius: 999px; background: rgba(255,255,255,.08);
      overflow: hidden; margin-bottom: 16px;
    }}
    .bar > i {{
      display: block; height: 100%; width: 0%; border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), #60a5fa);
      transition: width 0.35s ease;
    }}
    .bar.done > i {{ background: linear-gradient(90deg, var(--ok), #4ade80); }}
    .bar.err > i {{ background: var(--err); width: 100% !important; }}
    .meta {{ font-size: 0.8rem; color: var(--muted); text-align: center; }}
    .actions {{ margin-top: 20px; text-align: center; display: none; }}
    .actions.show {{ display: block; }}
    a.btn {{
      display: inline-block; padding: 10px 18px; border-radius: 10px;
      background: var(--accent); color: #fff; text-decoration: none; font-size: 0.9rem;
    }}
    a.btn:hover {{ filter: brightness(1.08); }}
    pre.err {{
      display: none; margin-top: 14px; padding: 12px; border-radius: 10px;
      background: rgba(239,68,68,.12); color: #fecaca; font-size: 0.75rem;
      white-space: pre-wrap; word-break: break-word;
    }}
    pre.err.show {{ display: block; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>视频制作中</h1>
    <div class="id">{html.escape(job_id)}</div>
    <div class="spinner" id="sp"></div>
    <div class="label" id="lab">连接中…</div>
    <div class="bar" id="bar"><i id="fill"></i></div>
    <div class="meta" id="meta"></div>
    <div class="actions" id="act"><a class="btn" id="dl" href="#">下载 MP4</a></div>
    <pre class="err" id="err"></pre>
  </div>
  <script>
    const jobId = {json.dumps(job_id)};
    const sp = document.getElementById('sp');
    const lab = document.getElementById('lab');
    const bar = document.getElementById('bar');
    const fill = document.getElementById('fill');
    const meta = document.getElementById('meta');
    const act = document.getElementById('act');
    const dl = document.getElementById('dl');
    const errEl = document.getElementById('err');

    async function tick() {{
      try {{
        const r = await fetch('/status/' + encodeURIComponent(jobId));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const st = j.status || '';
        const pct = Math.max(0, Math.min(100, Number(j.progress) || 0));
        fill.style.width = pct + '%';
        lab.textContent = j.stage_label || st || '处理中';
        meta.textContent = '阶段: ' + (j.stage || '-') + ' · 更新于 ' + (j.updated_at || '-');

        if (st === 'done') {{
          sp.classList.add('done');
          bar.classList.add('done');
          fill.style.width = '100%';
          lab.textContent = '已完成';
          dl.href = '/download/' + encodeURIComponent(jobId);
          act.classList.add('show');
          return;
        }}
        if (st === 'error') {{
          sp.classList.add('err');
          bar.classList.add('err');
          lab.textContent = '失败';
          errEl.textContent = j.error || '未知错误';
          errEl.classList.add('show');
          return;
        }}
      }} catch (e) {{
        lab.textContent = '无法获取状态: ' + e;
      }}
      setTimeout(tick, 1200);
    }}
    tick();
  </script>
</body>
</html>"""
    )


# 渲染流水线

def run_pipeline(job_id: str, job_dir: str, frames_path: str):
    try:
        audio_dir = os.path.join(job_dir, "audio")
        frames_dir = os.path.join(job_dir, "frames")
        os.makedirs(audio_dir, exist_ok=True)
        os.makedirs(frames_dir, exist_ok=True)

        _job_touch(
            job_id,
            stage="tts",
            stage_label="语音合成中（Edge TTS，可能较慢）",
            progress=12,
        )
        _run(
            ["python3", os.path.join(SCRIPT_DIR, "vlog_audio.py"), frames_path],
            job_dir,
            "TTS",
        )

        _job_touch(
            job_id,
            stage="render",
            stage_label="正在生成画面与字幕",
            progress=48,
        )
        _run(
            ["python3", os.path.join(SCRIPT_DIR, "vlog_render.py"), frames_path],
            job_dir,
            "渲染",
        )

        mp4_path = os.path.join(job_dir, f"{job_id}.mp4")
        _job_touch(
            job_id,
            stage="merge",
            stage_label="正在合成 MP4（ffmpeg）",
            progress=82,
        )
        _run(
            [
                "python3",
                os.path.join(SCRIPT_DIR, "vlog_merge.py"),
                frames_path,
                mp4_path,
            ],
            job_dir,
            "合成",
        )

        _job_touch(
            job_id,
            status="done",
            stage="done",
            stage_label="完成",
            progress=100,
            mp4_path=mp4_path,
            error="",
        )
        print(f"[render] ✅ {job_id} 完成: {mp4_path}")
    except Exception as e:
        _job_touch(
            job_id,
            status="error",
            stage="error",
            stage_label="失败",
            error=str(e),
            mp4_path="",
        )
        print(f"[render] ❌ {job_id} 失败: {e}")
def _run(cmd, cwd, label):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True,text=True)
    if r.returncode != 0:
        err_tail = (r.stderr or "")[-1000:]
        out_tail = (r.stdout or "")[-1000:]
        detail = err_tail or out_tail or f"子进程退出码 {r.returncode}"
        raise Exception(f"{label} 失败:\n{detail}")
    return r.stdout

