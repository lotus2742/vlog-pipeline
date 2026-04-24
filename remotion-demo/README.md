# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## vlog-pipeline 集成

本目录包含两个 Composition：

- `SkillDemo`：简单动画示例
- **`VlogFrames`**：读取 `meta` + 多段 `slides`（由 `tools/remotion_renderer.py` 从 `frames.json` 生成 props），按 `hook` / `cards` / `comparison` / `bullets` / `kpi` / `quote` 等类型渲染时间线
- **`VlogFramesStudio`**：默认 props 来自 `src/studio-active-props.json`（由 `tools/remotion_from_frames.py --studio` 覆盖同步），**不渲 MP4**，用有界面浏览器在 Studio 里预览整片时间轴

一键从仓库根目录生成完整成片 demo：

```bash
cd ..   # 回到 vlog-pipeline 根目录
python3 tools/remotion_full_demo.py
```

对指定 JSON 生成 props / 尝试渲染（示例：`tmp/hermes_agent_frames_rich.json`）：

```bash
cd ..
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json --props-only
```

**只用 Studio、不生成 MP4（推荐）**：在仓库根目录执行 `--studio`，会更新 `src/studio-active-props.json`，再启动 Studio 并选中 **`VlogFramesStudio`**（若已在跑，请重启一次以重新打包 JSON）。

```bash
cd ..
python3 tools/remotion_from_frames.py --frames tmp/hermes_agent_frames_rich.json --studio
cd remotion-demo && npm run dev
```

输出：`out/vlog_remotion_full_demo.mp4`（目录已在 `.gitignore` 中忽略）。

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
