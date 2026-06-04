import { AbsoluteFill, useVideoConfig } from "remotion";
import { buildTopicWatermarkMetrics, diagonalWatermarkRotation } from "./formatTopicWatermark";
import { SVG_ARTBOARD } from "./hotlist/layoutSpec";

type TopicWatermarkProps = {
  topic?: string;
  layout?: "vlog" | "hotlist";
  isLight?: boolean;
};

/**
 * 背景斜放水印：沿画面对角线居中，文案来自 meta.topic，低对比不挡正文。
 */
export const TopicWatermark: React.FC<TopicWatermarkProps> = ({
  topic,
  layout = "vlog",
  isLight = false,
}) => {
  const { width, height } = useVideoConfig();
  const headerH = SVG_ARTBOARD.headerH;
  const hotlistSx = width / SVG_ARTBOARD.width;
  const vlogScale = Math.min(width / 1280, height / 720);

  const scale = layout === "hotlist" ? hotlistSx : vlogScale;
  const rotation = diagonalWatermarkRotation(width, height);

  const { lines, primarySize, secondarySize, fillOpacity } = buildTopicWatermarkMetrics(topic, scale);
  const ink = isLight ? "15, 23, 42" : "148, 163, 184";
  const color = `rgba(${ink}, ${fillOpacity})`;
  const ghostColor = `rgba(${ink}, ${fillOpacity * 0.45})`;
  const diagonal = Math.hypot(width, height);

  const blockStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: layout === "hotlist" ? `calc(50% + ${headerH * 0.18}px)` : "50%",
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6 * scale,
    textAlign: "center",
    userSelect: "none",
    maxWidth: diagonal * 0.82,
  };

  const lineStyle = (i: number): React.CSSProperties => ({
    fontSize: i === 0 ? primarySize : secondarySize,
    fontWeight: 800,
    letterSpacing: i === 0 ? "0.08em" : "0.05em",
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    maxWidth: diagonal * 0.75,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ ...blockStyle, filter: "blur(6px)", opacity: 0.65 }}>
        {lines.map((line, i) => (
          <div key={`g-${i}`} style={{ ...lineStyle(i), color: ghostColor }}>
            {line}
          </div>
        ))}
      </div>
      <div style={blockStyle}>
        {lines.map((line, i) => (
          <div key={`w-${i}`} style={{ ...lineStyle(i), color }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
