# vlog-pipeline

一个面向中文口播短视频的本地渲染流水线：  
`frames.json -> 校验 -> 配音 -> 画面渲染 -> ffmpeg 合成 MP4`

## 1. 项目能力

- 输入：符合规范的 `frames.json`（`meta + frames` 结构）
- 输出：带字幕语音的成片 `mp4`
- 运行方式：
  - 命令行分步执行
  - 启动 `FastAPI` 服务后通过 HTTP 异步渲染
- 内置校验：`validate_frames.py` 会校验结构、字段、长度、内容约束

## 2. 环境要求

- macOS（当前脚本已针对 macOS 字体和依赖做适配）
- Python 3
- `ffmpeg` / `ffprobe`
- 中文字体（优先 Noto Sans CJK，找不到会尝试 PingFang）

## 3. 快速开始

### 3.1 一键安装依赖

```bash
bash setup.sh
```

安装脚本会完成：

- Python 依赖：`fastapi uvicorn pillow edge-tts`
- `ffmpeg` 检查/安装
- 中文字体检查

### 3.2 启动渲染服务

```bash
uvicorn render_server:app --host 0.0.0.0 --port 8765
```

启动后可访问：

- 首页：`GET /`
- 任务页：`GET /watch/{job_id}`
- 状态：`GET /status/{job_id}`
- 下载：`GET /download/{job_id}`

### 3.3 渲染引擎选择（默认 Remotion Studio）

服务支持双引擎路由（含 `auto` 兼容模式），但当前默认工作流建议如下：

- 默认：`remotion`，并优先走 **Remotion Studio 预览**（先看时间线效果，再决定是否导出 MP4）。
- `legacy`：仅在你明确要求“legacy 视频 / legacy 工作流”时使用（`vlog_audio.py -> vlog_render.py -> vlog_merge.py`）。
- `auto`：历史兼容模式（优先 Remotion，异常时回退 legacy）。

可通过环境变量控制（如需固定默认引擎，建议设置为 `remotion`）：

```bash
export RENDER_ENGINE=remotion
export REMOTION_ENABLED=true
export REMOTION_FAILOVER_TO_LEGACY=false
export REMOTION_PROJECT_DIR=/path/to/remotion-project
export REMOTION_COMPOSITION_ID=SkillDemo
```

## 4. 当前推荐流程（按你项目现状）

## Step A：生成并自动校验 `frames.json`

你可以把任意“生成 JSON 的命令”交给 `run_frames.sh`，它会自动调用 `one_click_frames.py` 做重试与校验。

```bash
./run_frames.sh "cp langchain_setup_frames.json {output}" ./tmp/day7_frames.json
```

也可以直接调用：

```bash
python3 one_click_frames.py \
  --generate-cmd "cp langchain_setup_frames.json {output}" \
  --output ./tmp/day7_frames.json \
  --max-retries 3
```

若只想单独校验：

```bash
python3 validate_frames.py ./tmp/day7_frames.json --pretty
```

## Step B：提交渲染任务（HTTP）

```bash
curl -X POST http://localhost:8765/render \
  -H "Content-Type: application/json" \
  -d @./tmp/day7_frames.json
```

返回示例（简化）：

```json
{
  "job_id": "xxx",
  "status": "pending",
  "watch_url": "/watch/xxx"
}
```

## Step C：查看进度与下载

- 浏览器打开：`http://localhost:8765/watch/{job_id}`
- 轮询状态：`GET /status/{job_id}`
- 完成后下载：`GET /download/{job_id}`

## Step D：Agent 一体化入口（校验 + 渲染 + 轮询）

当你希望 Agent 自动跑完整链路，而不是手动 `curl` 与轮询时：

```bash
python3 tools/agent_pipeline.py --frames ./tmp/day7_frames.json
```

默认建议：不传 `--engine` 时按 **Remotion + Studio 预览优先** 执行。  
仅在你明确要 legacy 时再显式指定 `--engine legacy`。

默认且强制将每次执行结果追加到 `metrics/runs.jsonl`（JSONL）。  
可通过 `--metrics-file` 指定输出位置。

手动指定引擎：

```bash
python3 tools/agent_pipeline.py --frames ./tmp/day7_frames.json --engine remotion
python3 tools/agent_pipeline.py --frames ./tmp/day7_frames.json --engine legacy
```

生成「完整 Remotion 多段成片」本地 demo（依赖 `remotion-demo` 已 `npm i`，且本机 Remotion 渲染环境可用）：

```bash
python3 tools/remotion_full_demo.py
```

对任意已通过校验的 `frames.json`（例如 `tmp/hermes_agent_frames_rich.json`）生成 Remotion props，并尝试渲染 MP4：

```bash
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json
```

本机 headless 易失败时，可只导出 props；若要用 **有界面 Chromium（Remotion Studio）** 预览，请同步到项目内 JSON 后选 `VlogFramesStudio`：

```bash
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json --studio
cd remotion-demo && npm run dev
```

仅写 `out/*.json`、不覆盖 Studio 用文件时：

```bash
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json --props-only
```

成片默认输出：`remotion-demo/out/vlog_remotion_full_demo.mp4`。若未跑通 TTS，脚本仍会按每帧 `script` 长度估算时长并渲染。

无论 MP4 是否渲染成功，脚本都会在 `remotion-demo/out/vlog_remotion_full_demo_props.json` 写入本次 Remotion 的完整 input props（含每段 `durationInFrames` 与完整 `frame` 数据）。仓库内另有静态样例：`remotion-demo/sample-vlog-frames-props.json`（无配音时长的估算版），便于对照。

说明：Remotion 4 的 CLI 渲染依赖 headless Chrome；在 **低于 macOS 15** 的部分环境中可能出现浏览器进程 `SIGSEGV`，此时 props 仍可用于在较新系统、`npm run dev` 预览或 CI/Linux 上执行 `npx remotion render`。

仅提交任务不等待完成：

```bash
python3 tools/agent_pipeline.py --frames ./tmp/day7_frames.json --no-wait
```

将结果 JSON 写入文件（同时仍会打印到终端）：

```bash
python3 tools/agent_pipeline.py --frames ./tmp/day7_frames.json --result-file ./tmp/last_render_result.json
```

返回为结构化 JSON，包含：

- `ok`：是否成功
- `stage`：当前阶段（`validate/submitted/poll/done/error/timeout`）
- `job_id`：渲染任务 ID
- `watch_url`：浏览器查看进度地址
- `download_url`：下载地址
- `last_status`：轮询到的最新任务状态（含 `stage/progress/stage_label`）
- `error_code/error_message/validation_errors`：失败原因与修复线索

汇总埋点统计（成功率、平均耗时、P95、失败码 TopN）：

```bash
python3 tools/metrics_report.py
```

## 5. 离线分步命令（不经过 HTTP）

给定 `frames.json`（例如 `./tmp/day7_frames.json`）：

```bash
# 1) 生成配音与字幕（audio/*.mp3 + audio/*.srt）
python3 vlog_audio.py ./tmp/day7_frames.json

# 2) 渲染每帧图片（frames/frame_*.png）
python3 vlog_render.py ./tmp/day7_frames.json

# 3) 合成最终视频
python3 vlog_merge.py ./tmp/day7_frames.json ./tmp/day7.mp4
```

## 6. `frames.json` 关键约束（由校验器执行）

- 根结构必须是：`meta + frames`
- `meta.topic` 不能为空
- `meta.voice` 必须在白名单内（如 `zh-CN-XiaoyiNeural` 等）
- `meta.rate` 必须是百分比字符串（如 `+5%`）
- `frames` 数量：`3 ~ 20`
- 首帧和尾帧 `type` 必须是 `hook`
- 当前允许类型：`hook / cards / comparison / bullets / kpi / quote`（首尾仍为 `hook`）
- `script` 长度限制：`20 ~ 300` 字
- 禁止在 `title/script` 中使用部分特殊字符（见 `validate_frames.py`）

## 7. 目录说明

- `render_server.py`：渲染服务入口（异步任务、进度、下载）
- `validate_frames.py`：`frames.json` 校验器（CLI + 可被导入）
- `one_click_frames.py`：生成-校验-重试闭环
- `run_frames.sh`：一条命令封装
- `vlog_audio.py`：Edge TTS + SRT 生成
- `vlog_render.py`：静态帧渲染（Pillow）
- `vlog_merge.py`：ffmpeg 分段合并输出 MP4
- `tmp/`：临时文件目录（已在 `.gitignore` 忽略）

## 8. 常见问题

- 字体报错：先执行 `bash setup.sh`，确认已安装 Noto CJK 或系统可用中文字体
- 合成失败：确认 `ffmpeg` / `ffprobe` 可执行
- 渲染失败 422：根据返回的 `errors` 修复 `frames.json` 字段与内容
- 配音偶发失败：`vlog_audio.py` 内已做重试与备用音色回退

