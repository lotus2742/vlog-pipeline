import { AbsoluteFill, interpolate } from "remotion";
import type { ThemeText, TopologyLevel, TopologyNode, TopologySpec, VlogFrame } from "../types";
import { SlideInsight } from "./insight";
import { staggerOpacity } from "../utils";

const nodeShell = (accent: string, colors: ThemeText): React.CSSProperties => ({
  borderRadius: 14,
  padding: "12px 14px",
  background: colors.card,
  border: `1.5px solid ${accent}66`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 4,
  minWidth: 0,
  boxSizing: "border-box",
});

const renderNode = (
  node: TopologyNode,
  colors: ThemeText,
  localFrame: number,
  stagger: number,
  compact?: boolean,
) => {
  const accent = String(node.color || "#22d3ee");
  const label = String(node.label || "").trim();
  const title = String(node.title || "").trim();
  return (
    <div style={{ ...nodeShell(accent, colors), opacity: staggerOpacity(localFrame, stagger) }}>
      {label ? (
        <div style={{ fontSize: compact ? 16 : 18, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{label}</div>
      ) : null}
      {title ? (
        <div style={{ fontSize: compact ? 14 : 15, fontWeight: 600, color: colors.muted, lineHeight: 1.3 }}>{title}</div>
      ) : null}
    </div>
  );
};

export const HubTopologySlide: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  opacity: number;
  localFrame: number;
  topology: TopologySpec;
}> = ({ frame, colors, opacity, localFrame, topology }) => {
  const center = topology.center || { label: "调度", title: "拆任务" };
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const cAccent = String(center.color || "#a78bfa");
  const pulse = interpolate(localFrame % 45, [0, 22, 45], [0.92, 1, 0.92]);
  const positions =
    nodes.length === 3
      ? [
          { top: "8%", left: "50%", tx: "-50%" },
          { top: "72%", left: "12%", tx: "0" },
          { top: "72%", left: "88%", tx: "-100%" },
        ]
      : [
          { top: "6%", left: "50%", tx: "-50%" },
          { top: "50%", left: "6%", tx: "0" },
          { top: "50%", left: "94%", tx: "-100%" },
          { top: "78%", left: "50%", tx: "-50%" },
        ];

  return (
    <AbsoluteFill
      style={{
        padding: "48px 52px 40px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 800, color: colors.primary, marginBottom: 6, lineHeight: 1.15, flexShrink: 0 }}>
        {frame.title}
      </div>
      {frame.subtitle ? (
        <div style={{ fontSize: 19, fontWeight: 500, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{frame.subtitle}</div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {nodes.slice(0, positions.length).map((n, i) => {
            const pos = positions[i];
            const x2 = pos.left === "50%" ? 50 : pos.left.includes("12") || pos.left.includes("6") ? 18 : 82;
            const y2 = pos.top.includes("6") || pos.top.includes("8") ? 18 : pos.top.includes("50") ? 50 : 78;
            const lit = interpolate(localFrame, [8 + i * 6, 28 + i * 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={x2}
                y2={y2}
                stroke={String(n.color || "#22d3ee")}
                strokeWidth={1.2}
                strokeOpacity={0.25 + lit * 0.45}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            top: "42%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${pulse})`,
            zIndex: 2,
            ...nodeShell(cAccent, colors),
            padding: "18px 22px",
            boxShadow: `0 0 32px ${cAccent}44`,
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: cAccent, marginBottom: 4 }}>
            CENTER
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: cAccent }}>{center.label}</div>
          {center.title ? (
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.primary, marginTop: 4 }}>{center.title}</div>
          ) : null}
        </div>
        {nodes.slice(0, positions.length).map((n, i) => {
          const pos = positions[i];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                transform: `translateX(${pos.tx})`,
                width: nodes.length >= 4 ? "28%" : "30%",
                maxWidth: 200,
                zIndex: 1,
              }}
            >
              {renderNode(n, colors, localFrame, i + 1, nodes.length >= 4)}
            </div>
          );
        })}
      </div>
      {frame.insight ? <SlideInsight text={frame.insight} colors={colors} marginTop={12} fontSize={20} /> : null}
    </AbsoluteFill>
  );
};

export const MeshTopologySlide: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  opacity: number;
  localFrame: number;
  topology: TopologySpec;
}> = ({ frame, colors, opacity, localFrame, topology }) => {
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const n = Math.max(3, Math.min(nodes.length, 5));
  const ringR = 34;
  const cx = 50;
  const cy = 48;

  return (
    <AbsoluteFill
      style={{
        padding: "48px 52px 40px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 800, color: colors.primary, marginBottom: 6, flexShrink: 0 }}>{frame.title}</div>
      {frame.subtitle ? (
        <div style={{ fontSize: 19, fontWeight: 500, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{frame.subtitle}</div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {Array.from({ length: n }).map((_, i) =>
            Array.from({ length: n }).map((_, j) => {
              if (j <= i) return null;
              const a1 = (i / n) * Math.PI * 2 - Math.PI / 2;
              const a2 = (j / n) * Math.PI * 2 - Math.PI / 2;
              const x1 = cx + ringR * Math.cos(a1);
              const y1 = cy + ringR * Math.sin(a1);
              const x2 = cx + ringR * Math.cos(a2);
              const y2 = cy + ringR * Math.sin(a2);
              const lit = interpolate(localFrame, [10 + i * 4, 40 + i * 4], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <line
                  key={`${i}-${j}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(148,163,184,0.35)"
                  strokeWidth={0.8}
                  strokeOpacity={0.2 + lit * 0.5}
                />
              );
            }),
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            top: "46%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.14em",
            color: "rgba(148,163,184,0.7)",
            zIndex: 0,
          }}
        >
          MESH · 无中心
        </div>
        {nodes.slice(0, n).map((node, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const left = `${cx + ringR * Math.cos(angle)}%`;
          const top = `${cy + ringR * Math.sin(angle)}%`;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                top,
                transform: "translate(-50%, -50%)",
                width: n >= 4 ? "22%" : "26%",
                maxWidth: 168,
                zIndex: 1,
              }}
            >
              {renderNode(node, colors, localFrame, i, n >= 4)}
            </div>
          );
        })}
      </div>
      {frame.insight ? <SlideInsight text={frame.insight} colors={colors} marginTop={12} fontSize={20} /> : null}
    </AbsoluteFill>
  );
};

export const TreeTopologySlide: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  opacity: number;
  localFrame: number;
  topology: TopologySpec;
}> = ({ frame, colors, opacity, localFrame, topology }) => {
  const levels = (Array.isArray(topology.levels) ? topology.levels : []) as TopologyLevel[];
  const accents = ["#a78bfa", "#22d3ee", "#34d399"];

  return (
    <AbsoluteFill
      style={{
        padding: "48px 52px 40px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 800, color: colors.primary, marginBottom: 6, flexShrink: 0 }}>{frame.title}</div>
      {frame.subtitle ? (
        <div style={{ fontSize: 19, fontWeight: 500, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{frame.subtitle}</div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
        {levels.map((lv, i) => {
          const accent = accents[i % accents.length];
          const items = Array.isArray(lv.items) ? lv.items : [];
          const isRoot = i === 0;
          return (
            <div
              key={i}
              style={{
                borderRadius: 16,
                padding: isRoot ? "16px 20px" : "14px 18px",
                background: isRoot ? `linear-gradient(90deg, ${accent}22, rgba(15,23,42,0.5))` : colors.card,
                border: `1.5px solid ${accent}55`,
                opacity: staggerOpacity(localFrame, i),
                marginLeft: i * 28,
                marginRight: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, marginBottom: items.length ? 8 : 0 }}>
                {lv.label ? (
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: accent }}>{lv.label}</span>
                ) : null}
                <span style={{ fontSize: isRoot ? 22 : 20, fontWeight: 800, color: colors.primary }}>{lv.title}</span>
              </div>
              {items.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {items.map((it, j) => (
                    <span
                      key={j}
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: colors.primary,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: `${accent}18`,
                        border: `1px solid ${accent}44`,
                        opacity: staggerOpacity(localFrame, i + j + 1),
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              ) : null}
              {i < levels.length - 1 ? (
                <div style={{ textAlign: "center", marginTop: 6, fontSize: 18, color: accent, opacity: 0.7 }}>↓</div>
              ) : null}
            </div>
          );
        })}
      </div>
      {frame.insight ? <SlideInsight text={frame.insight} colors={colors} marginTop={12} fontSize={20} /> : null}
    </AbsoluteFill>
  );
};
