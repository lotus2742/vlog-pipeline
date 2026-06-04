import { interpolate, useCurrentFrame } from "remotion";
import type { SectionProgressSpec } from "./types";

type SectionProgressBarProps = {
  spec: SectionProgressSpec;
  isLight?: boolean;
};

/** 顶部章节进度条，如「痛点 1/3」 */
export const SectionProgressBar: React.FC<SectionProgressBarProps> = ({ spec, isLight = false }) => {
  const localFrame = useCurrentFrame();
  const label = String(spec.label || "章节").trim();
  const current = Math.max(1, Math.min(spec.current, spec.total));
  const total = Math.max(1, spec.total);
  const opacity = interpolate(localFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fillW = `${(current / total) * 100}%`;
  const ink = isLight ? "#0f172a" : "#e2e8f0";
  const track = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)";
  const fill = isLight ? "#7c3aed" : "#a78bfa";

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        width: "min(420px, 72%)",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: ink,
        }}
      >
        <span>
          {label} {current}/{total}
        </span>
        <span style={{ opacity: 0.65, fontWeight: 600 }}>{Math.round((current / total) * 100)}%</span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: track,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: fillW,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${fill} 0%, #22d3ee 100%)`,
            boxShadow: `0 0 12px ${fill}66`,
          }}
        />
      </div>
    </div>
  );
};
