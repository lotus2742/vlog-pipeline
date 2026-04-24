import "./index.css";
import type { CalculateMetadataFunction } from "remotion";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import studioActivePropsUntyped from "./studio-active-props.json";
import {
  type VlogFramesProps,
  VlogFramesComposition,
} from "./vlog/VlogFramesComposition";

const studioActiveProps = studioActivePropsUntyped as VlogFramesProps;

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

const calculateVlogFramesMetadata: CalculateMetadataFunction<VlogFramesProps> = async ({
  props,
  defaultProps,
}) => {
  const slides =
    props.slides && props.slides.length > 0
      ? props.slides
      : (defaultProps?.slides ?? defaultVlogSlides);
  const total = slides.reduce((acc, s) => acc + Math.max(15, Number(s.durationInFrames) || 90), 0);
  return {
    durationInFrames: Math.max(60, total),
    props: {
      ...defaultProps,
      ...props,
      slides,
    },
  };
};

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
        component={VlogFramesComposition}
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
        id="VlogFramesStudio"
        component={VlogFramesComposition}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={studioActiveProps}
        calculateMetadata={calculateVlogFramesMetadata}
      />
    </>
  );
};
