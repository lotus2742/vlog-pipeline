import "./index.css";
import type { CalculateMetadataFunction } from "remotion";
import { Composition, staticFile } from "remotion";
import { MyComposition } from "./Composition";
import {
  HotlistFramesComposition,
  type VlogFramesProps,
  VlogOrHotlistComposition,
} from "./vlog/HotlistFramesComposition";
import { isHotlistVideo } from "./vlog/hotlist/detect";

const VLOG_LANDSCAPE = { width: 1280, height: 720 } as const;
const VLOG_PORTRAIT = { width: 1080, height: 1920 } as const;

const pickVlogCanvas = (p: VlogFramesProps | undefined) =>
  p?.aspectRatio === "9:16" ? VLOG_PORTRAIT : VLOG_LANDSCAPE;

type StudioCompositionEntry = {
  id: string;
  label?: string;
  props: VlogFramesProps;
};
// studio-compositions.json 改为可选，不再作为 Studio 启动硬依赖。
const studioCompositions: StudioCompositionEntry[] = [];

const defaultVlogSlides: VlogFramesProps["slides"] = [
  {
    id: "preview_hook",
    type: "hook",
    durationInFrames: 90,
    frame: {
      title: "vlog-pipeline · Remotion 预览",
      subtitle: "提交真实 frames.json 后将按多段渲染成片",
      script: "",
    },
  },
  {
    id: "preview_cards",
    type: "cards",
    durationInFrames: 90,
    frame: {
      title: "支持类型",
      script: "",
      cards: [
        { title: "hook / cards", desc: "首屏与信息卡片", color: "" },
        { title: "comparison", desc: "左右对比 + insight", color: "" },
        { title: "bullets / kpi / quote", desc: "清单、指标、引用", color: "" },
      ],
    },
  },
];
const defaultStudioProps: VlogFramesProps = {
  meta: { topic: "Remotion Studio 预览", theme: "purple" },
  slides: defaultVlogSlides,
};
const isValidProps = (data: unknown): data is VlogFramesProps => {
  if (!data || typeof data !== "object") {
    return false;
  }
  const maybe = data as { slides?: unknown };
  return Array.isArray(maybe.slides);
};

/** 每个预览 JSON 独立 loader，避免多 Composition 串请求状态。 */
const createStudioPreviewLoader = (relativePath: string) => {
  let pending: Promise<VlogFramesProps | null> | null = null;
  const previewUrl = staticFile(relativePath);
  return (): Promise<VlogFramesProps | null> => {
    if (pending) {
      return pending;
    }
    const url = `${previewUrl}?t=${Date.now()}`;
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isValidProps(json)) {
          return json;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
    return pending;
  };
};

const loadStudioPreviewLatest = createStudioPreviewLoader("studio-preview/latest.json");
const loadCodingAgentPart = (part: 1 | 2 | 3 | 4 | 5 | 6) =>
  createStudioPreviewLoader(`studio-preview/coding-agent-part${part}.json`);
const loadMcpControversyV2 = createStudioPreviewLoader("studio-preview/mcp-controversy-v2.json");
const loadMcpScalekitEp2 = createStudioPreviewLoader("studio-preview/mcp-scalekit-ep2.json");
const loadAiHotlistEp20 = createStudioPreviewLoader("studio-preview/ai-hotlist-ep20.json");
const loadGitHubAiHotlistEp2 = createStudioPreviewLoader(
  "studio-preview/github-ai-hotlist-ep2.json",
);
const loadGitHubAiHotlistEp3 = createStudioPreviewLoader(
  "studio-preview/github-ai-hotlist-ep3.json",
);
const loadAgencyAgentsV1 = createStudioPreviewLoader("studio-preview/agency-agents-v1.json");
const loadMultiAgentEp2V2 = createStudioPreviewLoader("studio-preview/multi-agent-ep2-v2.json");

const calculateVlogFramesMetadata: CalculateMetadataFunction<VlogFramesProps> = async ({
  props,
  defaultProps,
}) => {
  const slides =
    props.slides && props.slides.length > 0
      ? props.slides
      : (defaultProps?.slides ?? defaultVlogSlides);
  const total = slides.reduce((acc, s) => acc + Math.max(15, Number(s.durationInFrames) || 90), 0);
  const merged: VlogFramesProps = {
    ...defaultProps,
    ...props,
    slides,
  };
  const { width, height } = pickVlogCanvas(merged);
  return {
    durationInFrames: Math.max(60, total),
    width,
    height,
    props: merged,
  };
};

const makeCalculateStudioMetadata = (
  load: () => Promise<VlogFramesProps | null>,
  options?: { forceAspectRatio?: "9:16" },
): CalculateMetadataFunction<VlogFramesProps> => {
  return async ({ props, defaultProps }) => {
    const live = await load();
    const merged = live ?? props ?? defaultProps ?? defaultStudioProps;
    const slides =
      merged.slides && merged.slides.length > 0 ? merged.slides : defaultVlogSlides;
    const total = slides.reduce(
      (acc, s) => acc + Math.max(15, Number(s.durationInFrames) || 90),
      0,
    );
    const out: VlogFramesProps = {
      ...defaultStudioProps,
      ...merged,
      slides,
    };
    const metaAr = (merged.meta as { aspectRatio?: string } | undefined)?.aspectRatio;
    if (!out.aspectRatio && (metaAr === "9:16" || metaAr === "16:9")) {
      out.aspectRatio = metaAr;
    }
    if (options?.forceAspectRatio) {
      out.aspectRatio = options.forceAspectRatio;
    }
    if (isHotlistVideo(out)) {
      out.aspectRatio = "16:9";
      out.videoType = "hotlist";
      if (out.meta) {
        out.meta = { ...out.meta, videoType: "hotlist", aspectRatio: "16:9", engagementCta: false };
      }
    }
    const { width, height } = pickVlogCanvas(out);
    return {
      durationInFrames: Math.max(60, total),
      width,
      height,
      props: out,
    };
  };
};

const calculateStudioMetadata = makeCalculateStudioMetadata(loadStudioPreviewLatest);
const calculateStudioMetadata9x16 = makeCalculateStudioMetadata(loadStudioPreviewLatest, {
  forceAspectRatio: "9:16",
});
const calculateCodingAgentPart = (part: 1 | 2 | 3 | 4 | 5 | 6) =>
  makeCalculateStudioMetadata(loadCodingAgentPart(part));
const calculateMcpControversyV2 = makeCalculateStudioMetadata(loadMcpControversyV2);
const calculateMcpControversyV2_9x16 = makeCalculateStudioMetadata(loadMcpControversyV2, {
  forceAspectRatio: "9:16",
});
const calculateMcpScalekitEp2 = makeCalculateStudioMetadata(loadMcpScalekitEp2);
const calculateAiHotlistEp20 = makeCalculateStudioMetadata(loadAiHotlistEp20);
const calculateGitHubAiHotlistEp2 = makeCalculateStudioMetadata(loadGitHubAiHotlistEp2);
const calculateGitHubAiHotlistEp3 = makeCalculateStudioMetadata(loadGitHubAiHotlistEp3);
const calculateAgencyAgentsV1 = makeCalculateStudioMetadata(loadAgencyAgentsV1);
const calculateMultiAgentEp2V2 = makeCalculateStudioMetadata(loadMultiAgentEp2V2);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SkillDemo"
        component={MyComposition}
        durationInFrames={120}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: "Remotion Skill Demo",
          subtitle: "30fps / 1280x720 / Spring + Interpolate",
        }}
      />
      <Composition
        id="VlogFrames"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          meta: { topic: "Remotion 多段预览", theme: "purple" },
          slides: defaultVlogSlides,
        }}
        calculateMetadata={calculateVlogFramesMetadata}
      />
      <Composition
        id="VlogFrames9x16"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          aspectRatio: "9:16",
          meta: { topic: "Remotion 多段预览（竖屏 9:16）", theme: "purple" },
          slides: defaultVlogSlides,
        }}
        calculateMetadata={calculateVlogFramesMetadata}
      />
      <Composition
        id="VlogFramesStudio"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateStudioMetadata}
      />
      <Composition
        id="VlogFramesStudio9x16"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultStudioProps, aspectRatio: "9:16" }}
        calculateMetadata={calculateStudioMetadata9x16}
      />
      <Composition
        id="CodingAgentPart1"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(1)}
      />
      <Composition
        id="CodingAgentPart2"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(2)}
      />
      <Composition
        id="CodingAgentPart3"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(3)}
      />
      <Composition
        id="CodingAgentPart4"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(4)}
      />
      <Composition
        id="CodingAgentPart5"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(5)}
      />
      <Composition
        id="CodingAgentPart6"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateCodingAgentPart(6)}
      />
      <Composition
        id="McpControversyV2"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMcpControversyV2}
      />
      <Composition
        id="McpControversyV2-9x16"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultStudioProps, aspectRatio: "9:16" }}
        calculateMetadata={calculateMcpControversyV2_9x16}
      />
      <Composition
        id="McpScalekitEp2"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMcpScalekitEp2}
      />
      <Composition
        id="AiHotlistEp20"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateAiHotlistEp20}
      />
      <Composition
        id="GitHubAiHotlistEp2"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateGitHubAiHotlistEp2}
      />
      <Composition
        id="GitHubAiHotlistEp3"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateGitHubAiHotlistEp3}
      />
      <Composition
        id="AgencyAgentsV1"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateAgencyAgentsV1}
      />
      <Composition
        id="MultiAgentEp2V2"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMultiAgentEp2V2}
      />
      <Composition
        id="HotlistFrames"
        component={HotlistFramesComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateVlogFramesMetadata}
      />
      <Composition
        id="HotlistFramesStudio"
        component={VlogOrHotlistComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateStudioMetadata}
      />
      {studioCompositions.map((entry) => (
        <Composition
          key={entry.id}
          id={entry.id}
          component={VlogOrHotlistComposition}
          durationInFrames={300}
          fps={30}
          width={1280}
          height={720}
          defaultProps={entry.props}
          calculateMetadata={calculateVlogFramesMetadata}
        />
      ))}
    </>
  );
};
