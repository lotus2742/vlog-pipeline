# Studio 分镜 Spec（JSON）

每期视频维护一份 `*.json`，用通用脚本生成 Remotion 预览数据。

## 链路（与之前一致）

```bash
# 1. spec → latest.json（或 spec.output 指定路径）
python3 tools/build_studio_from_spec.py tools/studio-specs/mcp-ep3-compare-v2.json

# 2. 配音 + 写回时长 / captions / audioSrc
python3 vlog_audio.py remotion-demo/public/studio-preview/latest.json --studio-bundle mcp-ep3-compare-v2

# 3. Remotion Studio 选 VlogFramesStudio 预览
```

## Spec 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `meta` | 是 | 主题、theme、voice、rate 等 |
| `slides` | 是 | 镜头数组 |
| `output` | 否 | 输出路径，默认 `latest.json` |
| `bundle` | 否 | 提示 `vlog_audio --studio-bundle` 名称 |
| `idPrefix` | 否 | slide id 前缀，默认 `slide` |
| `fps` | 否 | 默认 30 |
| `segSec` | 否 | 各镜占位秒数，TTS 后会覆盖 |
| `copyToLatest` | 否 | 为 true 时额外复制到 `latest.json` |
| `videoType` | 否 | 默认 `vlog` |

### `meta.bgStyle`（背景）

| 值 | 说明 |
|----|------|
| `cinematic` | 完整电影感：网格、星点、扫描线、SVG 装饰（B 站/高清大屏友好） |
| `cinematic-safe` | **防摩尔纹电影感**：大色块光晕 + 暗角 + 模糊水印字 + 四角框；**无**细网格/星点/扫描线，适合抖音二次压缩 |
| `minimal` / `douyin` | 纯黑底 `#0a0a0f`，无装饰 |
| `classic` | 榜单等白底场景（hotlist 自动覆盖） |

每个 `slides[]` 项：

| 字段 | 必填 | 说明 |
|------|------|------|
| `type` | 是 | `hook` / `comparison` / `benchmark` / `kpi` / `timeline` / `cards` / … |
| `slug` | 否 | id 片段，默认 `lens01`… |
| `voiceScript` | 建议 | 口播全文 |
| `frame` | 是 | 画面字段（title、benchmarkRows、pillars 等） |
| `durationSec` | 否 | 覆盖 `segSec[i]` |

`frame` 字段与 Remotion 组件约定一致（原各期 `build_*.py` 已移除，统一维护 spec）。

### 首帧 hook 默认版式（Remotion · 无特殊需求时）

第一镜 `type: "hook"` 默认使用 **OpeningHookPanel（居中舞台）**，与片尾 `ClosingHookPanel` 区分。

| 字段 | 必填 | 说明 |
|------|------|------|
| `frame.style` | 是 | 固定 `"spotlight"` |
| `frame.kicker` | 建议 | 系列/期数，如 `多Agent协作 · 第1讲` |
| `frame.title` | 是 | 问句式或结论式主标题 |
| `frame.hookLine` | 是 | 核心金句（横线夹持展示） |
| `frame.list` | 建议 | **2~3 条**预告，格式 `标签：正文`，如 `今天：单 Agent 三个天花板` |
| `voiceScript` | 是 | 口播全文 |

**不要**在首帧使用 `style: "split"` 或把 `list` 写成 4 条以上（会误走片尾 CTA 布局）。  
片尾 hook 用 `style: "split"` + 三选一 list + `hookLine` 下期预告。

示例（见 `multi-agent-ep1-v4.json` 第一镜）：

```json
{
  "slug": "hook",
  "type": "hook",
  "voiceScript": "……",
  "frame": {
    "style": "spotlight",
    "kicker": "多Agent协作 · 第1讲",
    "title": "让 Agent 干复杂活，总差点意思？",
    "hookLine": "不是模型菜，是架构不对",
    "list": ["今天：单 Agent 三个天花板", "第三个最隐蔽"]
  }
}
```

## 已有 spec

- `mcp-ep3-compare-v2.json` — MCP 第 3 期（输出 `latest.json`）
- `mcp-ep4-enterprise-douyin.json` — MCP 第 4 期 · 企业落地（抖音版，9 镜）
- `mcp-ep5-security-v2.json` — MCP 第 5 期 · 安全漏洞（中视频 v2，9 镜）
- `mcp-ep6-future-trends-v3.json` — MCP 第 6 期 · 未来趋势与路线图（抖音优化 v3，9 镜）
- `mcp-scalekit-ep2.json` — MCP 第 2 期（默认也输出 `latest.json`，改 spec 里 `output` 即可）
- `agent-ep1-douyin.json` — Agent 系列第 1 期 · 为什么需要Agent系统（抖音爆款版，12 镜，9:16 纯黑底）
- `github-ai-hotlist-ep2.json` — GitHub AI 周 Star 增速 Top 10 第 2 期（榜单 hotlist，13 镜，输出 `github-ai-hotlist-ep2.json`，不覆盖 `latest.json`）
- `github-ai-hotlist-ep3.json` — GitHub AI 周 Star 增速 Top 10 第 3 期（榜单 hotlist，13 镜，输出 `github-ai-hotlist-ep3.json`，Studio 选 `GitHubAiHotlistEp3`）
- `agency-agents-v1.json` — agency-agents 项目分享（17 镜，dark 主题 16:9，输出 `agency-agents-v1.json`，Studio 选 `AgencyAgentsV1` 或 `VlogFramesStudio`）
- `multi-agent-ep1-v4.json` — 多Agent协作第1讲 · 单Agent三个天花板（8 镜，16:9，输出 `multi-agent-ep1-v4.json`，Studio 选 `VlogFramesStudio`）
- `multi-agent-ep2-v2.json` — 多Agent协作第2期 · 三大架构怎么选（9 镜，16:9，输出 `multi-agent-ep2-v2.json`，Studio 选 `MultiAgentEp2V2` 或 `VlogFramesStudio`）

`studio-preview/` 目录保留运行时 `latest.json`（**`VlogFramesStudio` 固定读此文件**）；当前多 Agent 系列默认指向第 2 期，构建时请用 `multi-agent-ep2-v2.json`（`copyToLatest: true`），勿用第 1 期 spec 覆盖 `latest.json`。榜单等专题可单独输出 JSON，在 Studio 选对应 Composition 预览。
