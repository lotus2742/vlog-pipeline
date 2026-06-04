import { AbsoluteFill, Audio, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { staggerOpacity } from "../utils";

type CaptionCue = { start: number; end: number; text: string };

const secToFrame = (sec: number, fps: number) => Math.round(sec * fps);

/** 在字幕中按关键词找首次出现时间（秒），用于口播对齐动效 */
const findCaptionStart = (captions: CaptionCue[] | undefined, keywords: string[]): number | undefined => {
  if (!captions?.length) return undefined;
  for (const kw of keywords) {
    const hit = captions.find((c) => String(c.text || "").includes(kw));
    if (hit) return hit.start;
  }
  return undefined;
};

/** dual-compare 口播对齐时间轴（秒 → 帧） */
const buildDualCompareTimeline = (captions: CaptionCue[] | undefined, fps: number, rowCount: number) => {
  const row0 = findCaptionStart(captions, ["MCP管工具"]) ?? 0;
  const row1 = findCaptionStart(captions, ["MCP是手"]) ?? row0 + 2.3;
  const row2 = findCaptionStart(captions, ["两个合在一起", "合在一起"]) ?? row1 + 1.8;
  const agentHex = findCaptionStart(captions, ["完整的Agent系统", "Agent系统。"]) ?? row2 + 3.5;
  const reveal = findCaptionStart(captions, ["回到刚才"]) ?? row2 + 6.5;
  const finale = findCaptionStart(captions, ["全程零人工", "全程 0 人工"]) ?? reveal + 3.9;
  const rowStarts = [row0, row1, row2].slice(0, rowCount);
  while (rowStarts.length < rowCount) {
    rowStarts.push(rowStarts[rowStarts.length - 1]! + 2);
  }
  return {
    rowStarts: rowStarts.map((s) => secToFrame(s, fps)),
    fusionStart: secToFrame(row2, fps),
    agentHexStart: secToFrame(agentHex, fps),
    revealStart: secToFrame(reveal, fps),
    finaleStart: secToFrame(finale, fps),
  };
};

/** progression 三步递进 · 口播对齐 */
const buildProgressionTimeline = (captions: CaptionCue[] | undefined, fps: number, stepCount: number) => {
  const s0 = findCaptionStart(captions, ["单模型只能聊天", "简单理一下"]) ?? 0;
  const s1 = findCaptionStart(captions, ["加上工具调用", "工具调用"]) ?? s0 + 2.9;
  const s2 = findCaptionStart(captions, ["多个Agent", "组在一起协作"]) ?? s1 + 3.4;
  const highlight = findCaptionStart(captions, ["那就是Agent系统", "Agent系统。"]) ?? s2 + 2.6;
  const starts = [s0, s1, s2].slice(0, stepCount);
  while (starts.length < stepCount) {
    starts.push(starts[starts.length - 1]! + 2.5);
  }
  return {
    stepStarts: starts.map((s) => secToFrame(s, fps)),
    highlightStart: secToFrame(highlight, fps),
  };
};

const SFX_CLICK = "https://remotion.media/mouse-click.wav";
const SFX_DING = "https://remotion.media/ding.wav";
const SFX_BOOM = "https://remotion.media/vine-boom.wav";

const FONT =
  "system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', 'Source Han Sans SC', sans-serif";
const MONO = "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const CYAN = "#00f0ff";
const RED_HOOK = "#ff2a6d";
const MAGENTA = "#ff00ff";

const typewriterChars = (frame: number, text: string, start = 0, cps = 8) => {
  const count = Math.min(text.length, Math.floor(Math.max(0, frame - start) / cps) + 1);
  return text.slice(0, count);
};

const TypewriterSfx: React.FC<{ text: string; start?: number; cps?: number; volume?: number }> = ({
  text,
  start = 0,
  cps = 8,
  volume = 0.18,
}) => {
  const frame = useCurrentFrame();
  const charCount = Math.min(text.length, Math.floor(Math.max(0, frame - start) / cps) + 1);
  const prevCharCount = Math.min(text.length, Math.floor(Math.max(0, frame - 1 - start) / cps) + 1);
  if (charCount <= prevCharCount || charCount === 0) {
    return null;
  }
  return <Audio src={SFX_CLICK} volume={volume} />;
};

/** 编码友好：低密度、慢速、无 blur 光晕，减轻压缩后摩尔纹 */
const PARTICLE_GRID_PX = 56;
const PARTICLE_DRIFT = { periodX: 180, periodY: 220, ampX: 2, ampY: 1.5 };
const PARTICLE_POINTS = [
  { x: 8, y: 12 }, { x: 38, y: 8 }, { x: 72, y: 14 },
  { x: 12, y: 55 }, { x: 48, y: 65 }, { x: 88, y: 42 },
  { x: 25, y: 62 }, { x: 68, y: 38 }, { x: 50, y: 50 },
  { x: 35, y: 85 },
];

const DouyinParticleBg: React.FC<{ converge?: boolean; burst?: boolean; burstStart?: number }> = ({
  converge,
  burst,
  burstStart = 0,
}) => {
  const localFrame = useCurrentFrame();
  const convergeT = converge ? interpolate(localFrame, [0, 24], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const burstT = burst
    ? interpolate(localFrame, [burstStart, burstStart + 36], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const gridDriftX = Math.sin(localFrame / PARTICLE_DRIFT.periodX) * PARTICLE_DRIFT.ampX;
  const gridDriftY = Math.cos(localFrame / PARTICLE_DRIFT.periodY) * PARTICLE_DRIFT.ampY;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.11) 1px, transparent 1px)",
          backgroundSize: `${PARTICLE_GRID_PX}px ${PARTICLE_GRID_PX}px`,
          opacity: 0.55,
          transform: `translate3d(${gridDriftX}px, ${gridDriftY}px, 0)`,
        }}
      />
      {PARTICLE_POINTS.map((p, i) => {
        const dx = burst ? (p.x - 50) * burstT * 1.5 : (50 - p.x) * convergeT * 0.3;
        const dy = burst ? (p.y - 50) * burstT * 1.5 : (50 - p.y) * convergeT * 0.3;
        const pulse = 0.65 + 0.35 * Math.sin((localFrame + i * 12) / 24);
        return (
          <MotionDot
            key={i}
            x={p.x + dx}
            y={p.y + dy}
            pulse={pulse}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const MotionDot: React.FC<{ x: number; y: number; pulse: number }> = ({ x, y, pulse }) => (
  <div
    style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: `rgba(0,240,255,${0.2 + pulse * 0.22})`,
    }}
  />
);

const HexNode: React.FC<{ lit: boolean; size?: number; label?: string }> = ({ lit, size = 22, label }) => (
  <svg width={size} height={size + (label ? 14 : 0)} viewBox={`0 0 32 ${label ? 46 : 32}`} display="block" style={{ flexShrink: 0 }}>
    <polygon
      points="16,2 28,9 28,23 16,30 4,23 4,9"
      fill={lit ? "rgba(0,240,255,0.15)" : "transparent"}
      stroke={lit ? CYAN : "rgba(255,255,255,0.35)"}
      strokeWidth="2"
    />
    <circle cx="16" cy="16" r="3" fill={lit ? CYAN : "rgba(255,255,255,0.4)"} />
    {label ? (
      <text x="16" y="42" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="7" fontWeight="600">
        {label}
      </text>
    ) : null}
  </svg>
);

const AgentSystemHex: React.FC<{ size: number; breathe: number }> = ({ size, breathe }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <polygon
      points="40,4 68,20 68,52 40,68 12,52 12,20"
      fill="rgba(0,240,255,0.08)"
      stroke="#ffffff"
      strokeWidth="2.5"
      opacity={0.75 + breathe * 0.25}
    />
    <text x="40" y="46" textAnchor="middle" fill={CYAN} fontSize="18" fontWeight="900" opacity={0.9 + breathe * 0.1}>
      AS
    </text>
  </svg>
);

const McpDiagram: React.FC<{ localFrame: number; size: number; variant?: "full" | "compact" }> = ({
  localFrame,
  size,
  variant = "compact",
}) => {
  if (variant === "full") {
    const agentOp = staggerOpacity(localFrame, 0, 0, 10, 14);
    const bridgeOp = staggerOpacity(localFrame, 1, 14, 10, 14);
    const toolOp = staggerOpacity(localFrame, 2, 28, 12, 16);
    const lineGrow = interpolate(localFrame, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const tools = [
      { emoji: "🔧", label: "工具" },
      { emoji: "📊", label: "数据" },
      { emoji: "🌐", label: "API" },
    ];
    const w = size;
    const h = size * 0.72;
    return (
      <svg width={w} height={h} viewBox="0 0 320 236" style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <marker id="mcpFullArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill={CYAN} />
          </marker>
        </defs>
        <text x="160" y="28" textAnchor="middle" fontSize="34" opacity={agentOp}>
          👋
        </text>
        <text x="160" y="48" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="13" fontWeight="600" opacity={agentOp}>
          Agent 的手
        </text>
        <g opacity={agentOp} transform="translate(128, 54)">
          <polygon points="32,4 56,16 56,40 32,52 8,40 8,16" fill="rgba(0,240,255,0.14)" stroke={CYAN} strokeWidth="2.5" />
          <circle cx="32" cy="28" r="5" fill={CYAN} />
          <text x="32" y="68" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="800">
            Agent
          </text>
        </g>
        <line
          x1="160"
          y1="118"
          x2="160"
          y2={118 + 14 * lineGrow}
          stroke={CYAN}
          strokeWidth="3"
          markerEnd="url(#mcpFullArrow)"
          opacity={bridgeOp}
        />
        <rect
          x="118"
          y="132"
          width="84"
          height="26"
          rx="13"
          fill="rgba(0,240,255,0.12)"
          stroke={CYAN}
          strokeWidth="1.5"
          opacity={bridgeOp}
        />
        <text x="160" y="150" textAnchor="middle" fill={CYAN} fontSize="14" fontWeight="800" opacity={bridgeOp}>
          MCP 协议
        </text>
        <line
          x1="160"
          y1="158"
          x2="160"
          y2={158 + 12 * lineGrow}
          stroke={CYAN}
          strokeWidth="2.5"
          markerEnd="url(#mcpFullArrow)"
          opacity={toolOp}
        />
        <text x="160" y="182" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="12" fontWeight="600" opacity={toolOp}>
          发现 · 调用 · 拿结果
        </text>
        {tools.map((tool, i) => {
          const cx = 72 + i * 88;
          const delay = i * 6;
          const op = staggerOpacity(localFrame, i, 34 + delay, 10, 14);
          return (
            <g key={tool.label} opacity={op} transform={`translate(${cx - 28}, 188)`}>
              <rect x="0" y="0" width="56" height="28" rx="8" fill="rgba(0,240,255,0.08)" stroke="rgba(0,240,255,0.35)" strokeWidth="1.5" />
              <text x="28" y="19" textAnchor="middle" fontSize="14">
                {tool.emoji}
              </text>
              <text x="28" y="42" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="11" fontWeight="700">
                {tool.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const toolSlide = interpolate(localFrame, [20, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineGrow = interpolate(localFrame, [8, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const agentOp = staggerOpacity(localFrame, 0, 0, 8, 12);
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 120 132" style={{ display: "block", margin: "0 auto" }}>
      <g opacity={agentOp} transform={`translate(44, ${4 + toolSlide * 4})`}>
        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="rgba(0,240,255,0.12)" stroke={CYAN} strokeWidth="2" />
        <circle cx="16" cy="16" r="3" fill={CYAN} />
        <text x="16" y="42" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="600">
          Agent
        </text>
      </g>
      <line x1="60" y1="48" x2="60" y2={48 + 24 * lineGrow} stroke={CYAN} strokeWidth="2.5" markerEnd="url(#mcpArrow)" />
      <defs>
        <marker id="mcpArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={CYAN} />
        </marker>
      </defs>
      <text x="60" y="88" textAnchor="middle" fontSize="20" opacity={0.5 + toolSlide * 0.5}>
        🔧
      </text>
      <text x="60" y="104" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontWeight="600">
        工具
      </text>
    </svg>
  );
};

const A2aDiagram: React.FC<{ localFrame: number; size: number; variant?: "full" | "compact" }> = ({
  localFrame,
  size,
  variant = "compact",
}) => {
  if (variant === "full") {
    const slideL = interpolate(localFrame, [0, 18], [-24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const slideR = interpolate(localFrame, [0, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const bridgeOp = staggerOpacity(localFrame, 1, 16, 10, 14);
    const lineGrow = interpolate(localFrame, [20, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const bubblePulse = (Math.sin(localFrame / 14) + 1) / 2;
    const w = size;
    const h = size * 0.58;
    const agentNode = (cx: number, label: string) => (
      <g transform={`translate(${cx - 32}, 52)`}>
        <polygon points="32,4 56,16 56,40 32,52 8,40 8,16" fill="rgba(255,0,255,0.1)" stroke={MAGENTA} strokeWidth="2.5" />
        <circle cx="32" cy="28" r="5" fill={MAGENTA} />
        <text x="32" y="68" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="800">
          {label}
        </text>
      </g>
    );
    return (
      <svg width={w} height={h} viewBox="0 0 320 186" style={{ display: "block", margin: "0 auto" }}>
        <text x="160" y="28" textAnchor="middle" fontSize="34" opacity={bridgeOp}>
          👄
        </text>
        <text x="160" y="48" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="13" fontWeight="600" opacity={bridgeOp}>
          Agent 的嘴
        </text>
        <g transform={`translate(${slideL}, 0)`}>{agentNode(72, "Agent A")}</g>
        <g transform={`translate(${slideR}, 0)`}>{agentNode(248, "Agent B")}</g>
        <line x1="108" y1="80" x2={108 + 104 * lineGrow} y2="80" stroke={MAGENTA} strokeWidth="3" opacity={bridgeOp} />
        {lineGrow > 0.4 ? (
          <>
            <polygon points="104,76 112,80 104,84" fill={MAGENTA} />
            <polygon points="216,76 208,80 216,84" fill={MAGENTA} />
          </>
        ) : null}
        <rect
          x="118"
          y="66"
          width="84"
          height="26"
          rx="13"
          fill="rgba(255,0,255,0.12)"
          stroke={MAGENTA}
          strokeWidth="1.5"
          opacity={bridgeOp}
        />
        <text x="160" y="84" textAnchor="middle" fill={MAGENTA} fontSize="14" fontWeight="800" opacity={bridgeOp}>
          A2A 协议
        </text>
        <ellipse
          cx="160"
          cy="118"
          rx={34 + bubblePulse * 4}
          ry={18 + bubblePulse * 2}
          fill="rgba(255,0,255,0.15)"
          stroke={MAGENTA}
          strokeWidth="1.5"
          opacity={staggerOpacity(localFrame, 2, 32, 10, 14)}
        />
        <text
          x="160"
          y="123"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="13"
          fontWeight="700"
          opacity={staggerOpacity(localFrame, 2, 32, 10, 14)}
        >
          委托 · 同步 · 传消息
        </text>
        <text x="160" y="158" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="12" fontWeight="600" opacity={bridgeOp}>
          Agent 之间能沟通、能协作
        </text>
      </svg>
    );
  }

  const slideL = interpolate(localFrame, [0, 15], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideR = interpolate(localFrame, [0, 15], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineGrow = interpolate(localFrame, [16, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bubbleX = 60 + Math.sin(localFrame / 12) * 18 * lineGrow;
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 160 88" style={{ display: "block", margin: "0 auto" }}>
      <g transform={`translate(${slideL}, 0)`}>
        <polygon points="24,12 40,20 40,44 24,52 8,44 8,20" fill="rgba(255,0,255,0.08)" stroke={MAGENTA} strokeWidth="2" />
        <circle cx="24" cy="32" r="3" fill={MAGENTA} />
        <text x="24" y="66" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="7" fontWeight="600">
          Agent A
        </text>
      </g>
      <g transform={`translate(${slideR}, 0)`}>
        <polygon points="136,12 152,20 152,44 136,52 120,44 120,20" fill="rgba(255,0,255,0.08)" stroke={MAGENTA} strokeWidth="2" />
        <circle cx="136" cy="32" r="3" fill={MAGENTA} />
        <text x="136" y="66" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="7" fontWeight="600">
          Agent B
        </text>
      </g>
      <line x1="48" y1="32" x2={48 + 64 * lineGrow} y2="32" stroke={MAGENTA} strokeWidth="2.5" />
      {lineGrow > 0.5 ? (
        <>
          <polygon points={`${44},28 ${52},32 ${44},36`} fill={MAGENTA} />
          <polygon points={`${108 + 64 * lineGrow},28 ${100 + 64 * lineGrow},32 ${108 + 64 * lineGrow},36`} fill={MAGENTA} />
          <ellipse cx={bubbleX} cy="32" rx="10" ry="7" fill="rgba(255,0,255,0.25)" stroke={MAGENTA} strokeWidth="1.5" />
        </>
      ) : null}
    </svg>
  );
};

const EffectComparePanel: React.FC<{
  left?: { title?: string; steps?: string[]; timing?: string };
  right?: { title?: string; steps?: string[]; timing?: string; result?: string };
  localFrame: number;
  portrait: boolean;
  compact?: boolean;
  frosted?: boolean;
  /** CTA 等场景：展示最终对比态，不循环闪烁 */
  snapshot?: boolean;
}> = ({ left, right, localFrame, portrait, compact, frosted, snapshot }) => {
  const fs = compact ? (portrait ? 11 : 12) : portrait ? 15 : 17;
  const titleFs = compact ? fs + 2 : fs + 4;
  const leftSteps = left?.steps || [];
  const leftStart = 8;
  const rightStart = leftStart + leftSteps.length * 14 + 20;
  const resultStart = rightStart + (right?.timing ? 18 : 12) + 16;
  const expandStart = resultStart + 30;
  const expanded = !compact && !snapshot && localFrame >= expandStart;

  return (
    <ComparePanelWrap expanded={expanded} frosted={frosted}>
      <div style={{ display: "flex", flexDirection: expanded ? "column" : portrait ? "column" : "row", gap: compact ? 8 : 12, width: "100%" }}>
        <CompareSide
          side={left}
          tone="red"
          fs={fs}
          titleFs={titleFs}
          localFrame={localFrame}
          start={leftStart}
          stagger={!snapshot}
          flash={!snapshot}
          snapshot={snapshot}
        />
        <CompareSide
          side={right}
          tone="cyan"
          fs={fs}
          titleFs={titleFs}
          localFrame={localFrame}
          start={rightStart}
          snapshot={snapshot}
        />
      </div>
      {right?.result && (snapshot || localFrame >= resultStart) ? (
        <CompareResultLine
          text={right.result}
          localFrame={localFrame}
          start={snapshot ? 0 : resultStart}
          expanded={expanded}
          portrait={portrait}
          compact={compact}
          snapshot={snapshot}
        />
      ) : null}
    </ComparePanelWrap>
  );
};

const ComparePanelWrap: React.FC<{ expanded?: boolean; frosted?: boolean; children: React.ReactNode }> = ({
  expanded,
  frosted,
  children,
}) => (
  <div
    style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      opacity: frosted ? 0.8 : 1,
      backdropFilter: frosted ? "blur(12px)" : undefined,
      transform: expanded ? "scale(1.02)" : undefined,
    }}
  >
    {children}
  </div>
);

const CompareSide: React.FC<{
  side?: { title?: string; steps?: string[]; timing?: string };
  tone: "red" | "cyan";
  fs: number;
  titleFs: number;
  localFrame: number;
  start: number;
  stagger?: boolean;
  flash?: boolean;
  snapshot?: boolean;
}> = ({ side, tone, fs, titleFs, localFrame, start, stagger, flash, snapshot }) => {
  const isCyan = tone === "cyan";
  const bg = isCyan ? "rgba(0,240,255,0.1)" : "rgba(255,42,109,0.08)";
  const border = isCyan ? "rgba(0,240,255,0.35)" : "rgba(255,42,109,0.35)";
  const titleColor = isCyan ? CYAN : RED_HOOK;
  const steps = side?.steps || [];
  return (
    <div style={{ flex: isCyan ? 1.1 : 1, padding: "12px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
      <SidePanelTitle side={side} titleFs={titleFs} titleColor={titleColor} />
      {steps.map((step, i) => {
        const lineStart = stagger ? start + i * 14 : start;
        const visible = snapshot || localFrame >= lineStart;
        const elapsed = localFrame - lineStart;
        const flashPulse =
          flash && visible && !snapshot
            ? interpolate(elapsed, [0, 3, 10], [0, 0.32, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;
        return (
          <div
            key={i}
            style={{
              fontSize: fs,
              fontWeight: 600,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
              opacity: visible ? 1 : 0,
              borderRadius: 4,
              padding: "2px 6px",
              margin: "0 -6px",
              boxShadow: flashPulse > 0 ? `inset 0 0 0 1px rgba(255,42,109,${0.25 + flashPulse * 0.35})` : undefined,
              background: flashPulse > 0 ? `rgba(255,42,109,${flashPulse * 0.18})` : "transparent",
            }}
          >
            {visible ? (snapshot || !stagger ? step : typewriterChars(localFrame, step, lineStart, 3)) : null}
          </div>
        );
      })}
      {side?.timing && (snapshot || localFrame >= start + steps.length * (stagger ? 14 : 0) + 8) ? (
        <div style={{ marginTop: 8, fontSize: fs, fontWeight: 700, color: isCyan ? "#4ade80" : "rgba(255,255,255,0.55)" }}>
          {side.timing}
        </div>
      ) : null}
    </div>
  );
};

const SidePanelTitle: React.FC<{ side?: { title?: string }; titleFs: number; titleColor: string }> = ({
  side,
  titleFs,
  titleColor,
}) => (
  <div style={{ fontSize: titleFs, fontWeight: 900, color: titleColor, marginBottom: 8 }}>{side?.title}</div>
);

const CompareResultLine: React.FC<{
  text: string;
  localFrame: number;
  start: number;
  expanded?: boolean;
  portrait?: boolean;
  compact?: boolean;
  snapshot?: boolean;
}> = ({ text, localFrame, start, expanded, portrait, compact, snapshot }) => {
  const scale = snapshot
    ? 1
    : spring({ frame: localFrame - start, fps: 30, config: { damping: 11, stiffness: 220 } });
  return (
    <div
      style={{
        marginTop: expanded ? 16 : 10,
        textAlign: "center",
        transform: snapshot ? undefined : `scale(${0.7 + scale * 0.3})`,
        fontSize: compact ? (portrait ? 14 : 15) : portrait ? 28 : 32,
        fontWeight: 900,
        color: CYAN,
        textShadow: `0 0 14px ${CYAN}66`,
      }}
    >
      {text}
      {!snapshot && localFrame === start ? <Audio src={SFX_DING} volume={0.38} /> : null}
    </div>
  );
};

/** 「🤖 搜索Agent」→ emoji + 名称 */
const parseAgentLabel = (label: string) => {
  const trimmed = String(label || "").trim();
  const space = trimmed.indexOf(" ");
  if (space > 0) {
    const head = trimmed.slice(0, space);
    const name = trimmed.slice(space + 1).trim();
    if (head.length <= 4 && name) return { emoji: head, name };
  }
  return { emoji: null, name: trimmed };
};

const SlamText: React.FC<{ text: string; color: string; fs: number; localFrame: number; glow?: boolean }> = ({
  text,
  color,
  fs,
  localFrame,
  glow,
}) => {
  const scale = spring({
    frame: localFrame,
    fps: 30,
    config: { damping: 14, stiffness: 220, mass: 0.7 },
  });
  const shake = interpolate(localFrame, [0, 6, 12], [0, -4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        transform: `scale(${0.72 + scale * 0.28}) translateX(${shake}px)`,
        fontSize: fs,
        fontWeight: 900,
        color,
        lineHeight: 1.22,
        textAlign: "center",
        letterSpacing: "0.02em",
        textShadow: glow ? `0 0 12px ${color}88, 0 0 24px ${color}44` : undefined,
      }}
    >
      {text}
    </div>
  );
};

const Divider: React.FC<{ width?: string }> = ({ width = "min(680px, 88%)" }) => (
  <div
    style={{
      width,
      height: 2,
      background: "rgba(255,255,255,0.28)",
      margin: "14px auto",
    }}
  />
);

const highlightPythonLine = (line: string): React.ReactNode => {
  if (!line.trim()) return "\u00a0";
  if (line.trim().startsWith("#")) {
    return <span style={{ color: "#6a9955" }}>{line}</span>;
  }
  const kw = /^(from|import|def|class|return|async|await)\b/;
  if (kw.test(line.trim())) {
    const m = line.match(/^(\s*)(\S+)(.*)$/);
    if (m) {
      return (
        <>
          {m[1]}
          <span style={{ color: "#569cd6" }}>{m[2]}</span>
          <span style={{ color: "#d4d4d4" }}>{m[3]}</span>
        </>
      );
    }
  }
  if (line.includes("=") && !line.includes("==")) {
    const parts = line.split("=");
    return (
      <>
        <span style={{ color: "#9cdcfe" }}>{parts[0]}</span>
        <span style={{ color: "#d4d4d4" }}>=</span>
        <span style={{ color: "#ce9178" }}>{parts.slice(1).join("=")}</span>
      </>
    );
  }
  if (line.includes('"')) {
    return <span style={{ color: "#ce9178" }}>{line}</span>;
  }
  return <span style={{ color: "#d4d4d4" }}>{line}</span>;
};

const CodeEditorBlock: React.FC<{
  lines: string[];
  visibleLines: number;
  highlightLine?: number;
  label?: string;
  compact?: boolean;
  frosted?: boolean;
}> = ({ lines, visibleLines, highlightLine, label = "agent_demo.py", compact, frosted }) => {
  const pad = compact ? "8px 10px" : "10px 12px";
  const fontSize = compact ? 11 : 13;
  const gutterW = 28;

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(0,240,255,0.2)",
        boxShadow: frosted ? "0 8px 32px rgba(0,0,0,0.5)" : "0 10px 28px rgba(0,0,0,0.45)",
        opacity: frosted ? 0.82 : 1,
        backdropFilter: frosted ? "blur(12px)" : undefined,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "5px 10px" : "7px 12px",
          background: "#323232",
          borderBottom: "1px solid rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ display: "flex", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#b3b3b3", fontFamily: MONO }}>{label}</span>
      </div>
      <div style={{ display: "flex", background: "#1e1e1e", fontFamily: MONO, fontSize, lineHeight: 1.55 }}>
        <div
          style={{
            width: gutterW,
            padding: pad,
            paddingRight: 6,
            textAlign: "right",
            color: "#6e7681",
            fontSize: fontSize - 1,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          {lines.slice(0, visibleLines).map((_, li) => (
            <div key={li}>{li + 1}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: pad, minWidth: 0 }}>
          {lines.slice(0, visibleLines).map((line, li) => {
            const lineNo = li + 1;
            const hl = highlightLine === lineNo;
            return (
              <div
                key={li}
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: hl ? "rgba(255,200,0,0.22)" : undefined,
                  margin: hl ? "0 -8px" : undefined,
                  padding: hl ? "0 8px" : undefined,
                  borderRadius: hl ? 4 : undefined,
                }}
              >
                {highlightPythonLine(line)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const DouyinTextSlide: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  captions?: CaptionCue[];
}> = ({ frame, captions }) => {
  const localFrame = useCurrentFrame();
  const { height, width, fps } = useVideoConfig();
  const portrait = height > width;
  const style = String(frame.style || "typewriter-slam").toLowerCase();
  const accent = frame.douyinColor === "red" ? RED_HOOK : "#ffffff";
  const muted = "rgba(255,255,255,0.88)";
  const basePad = portrait ? "48px 36px" : "56px 64px";

  if (style === "typewriter-slam") {
    const titleLine = String(frame.title || "").trim();
    const subtitleLine = String(frame.subtitle || "").trim();
    const rawLines = frame.list?.length ? frame.list : [titleLine, subtitleLine].filter(Boolean);
    const lines = rawLines.length ? rawLines : [""];
    const fs = portrait ? 52 : 58;
    const subFs = portrait ? 28 : 32;
    let cursor = 4;
    const rendered = lines.map((line, i) => {
      const chars = typewriterChars(localFrame, line, cursor, 3);
      const lineStart = cursor;
      cursor += line.length * 3 + 8;
      return { line, chars, lineStart, isSubtitle: i > 0 && Boolean(subtitleLine) };
    });
    const totalText = lines.join("");
    const slamStart = cursor;
    const isRed = frame.douyinColor === "red";
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg converge={isRed} />
        <TypewriterSfx text={totalText} start={4} cps={3} />
        {localFrame === slamStart ? <Audio src={SFX_BOOM} volume={0.35} /> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", position: "relative", zIndex: 1 }}>
          {rendered.map(({ line, chars, lineStart, isSubtitle }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SlamText
                text={chars}
                color={isSubtitle ? "#ffffff" : accent}
                fs={isSubtitle ? subFs : fs}
                localFrame={isSubtitle ? Math.max(0, localFrame - lineStart) : Math.max(0, localFrame - slamStart)}
                glow={!isSubtitle && isRed}
              />
              {localFrame > lineStart && chars.length < line.length ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: (isSubtitle ? subFs : fs) * 0.72,
                    background: isSubtitle ? "#ffffff" : accent,
                    marginLeft: 4,
                    opacity: Math.floor(localFrame / 8) % 2 === 0 ? 1 : 0,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "stagger-lines") {
    const lines = Array.isArray(frame.list) ? frame.list : [];
    const fs = portrait ? 34 : 38;
    const instant = frame.instant === true;
    const step = instant ? 0 : 18;
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ display: "flex", flexDirection: "column", gap: portrait ? 28 : 32, position: "relative", zIndex: 1 }}>
          {lines.map((line, i) => {
            const lineStart = instant ? 0 : i * step;
            const visible = instant || localFrame >= lineStart;
            const chars = visible ? (instant ? line : typewriterChars(localFrame, line, lineStart, 2)) : "";
            return (
              <div
                key={i}
                style={{
                  opacity: instant ? 1 : staggerOpacity(localFrame, i, 0, step, 10),
                  fontSize: fs,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.45,
                }}
              >
                {chars}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "pop-lines") {
    const lines = frame.list?.length ? frame.list : ([frame.title, frame.subtitle].filter(Boolean) as string[]);
    const fs = portrait ? 56 : 64;
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", position: "relative", zIndex: 1 }}>
          {lines.map((line, i) => {
            const start = i * 20;
            const show = localFrame >= start;
            const scale = show
              ? spring({ frame: localFrame - start, fps: 30, config: { damping: 12, stiffness: 180 } })
              : 0;
            return (
              <div
                key={i}
                style={{
                  transform: `scale(${0.5 + scale * 0.5})`,
                  opacity: show ? 1 : 0,
                  fontSize: i === 0 ? fs * 0.72 : fs,
                  fontWeight: 900,
                  color: i === 0 ? "rgba(255,255,255,0.75)" : "#ffffff",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {line}
                {show && localFrame === start ? <Audio src={SFX_BOOM} volume={0.28} /> : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "checklist-demo") {
    const title = String(frame.title || "").trim();
    const items = frame.checklistItems || [];
    const suspense = frame.suspense === true;
    const waitingText = String(frame.waitingText || "⏳ 正在生成结果...").trim();
    const finale = suspense ? "" : String(frame.finaleText || "").trim();
    const footer = suspense ? "" : String(frame.subtitle || "").trim();
    const fs = portrait ? 28 : 30;
    const rowStart = 24;
    const rowStep = 22;
    const allDoneFrame = rowStart + items.length * rowStep + 10;
    const footerStart = suspense ? allDoneFrame + 8 : rowStart + items.length * rowStep;
    const finaleStart = suspense ? 0 : footerStart + footer.length * 2 + 20;
    const rawProgress = items.reduce((acc, item, i) => {
      const start = rowStart + i * rowStep;
      const label = String(item.label || "");
      const status = String(item.status || "");
      const { name } = parseAgentLabel(label);
      const line = `${name}：${status}`;
      const checkFrame = start + line.length * 2 + 6;
      if (localFrame >= checkFrame) return acc + 1 / items.length;
      if (localFrame >= start) return acc + 0.15 / items.length;
      return acc;
    }, 0);
    const progressFill = suspense ? Math.min(0.95, rawProgress) : Math.min(1, rawProgress);
    const showNetwork = suspense ? localFrame >= allDoneFrame : localFrame >= finaleStart + 8;
    const networkFade = suspense
      ? 0.65
      : interpolate(localFrame, [finaleStart + 8, finaleStart + 38], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", fontFamily: FONT }}>
        <DouyinParticleBg burst={localFrame >= finaleStart} />
        <div style={{ width: "min(760px, 92%)", margin: "0 auto", display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 6,
              flexShrink: 0,
              borderRadius: 3,
              background: "rgba(0,240,255,0.15)",
              alignSelf: "stretch",
              minHeight: 120,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${progressFill * 100}%`,
                background: `linear-gradient(180deg, ${CYAN}88, ${CYAN})`,
                borderRadius: 3,
                boxShadow: `0 0 12px ${CYAN}66`,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: fs + 2,
                fontWeight: 700,
                color: "#ffffff",
                opacity: staggerOpacity(localFrame, 0, 0, 8, 12),
              }}
            >
              {typewriterChars(localFrame, title, 0, 3)}
            </div>
            <Divider />
            {items.map((item, i) => {
              const start = rowStart + i * rowStep;
              const label = String(item.label || "");
              const status = String(item.status || "");
              const done = item.done !== false;
              const { emoji, name } = parseAgentLabel(label);
              const line = `${name}：${status}`;
              const chars = typewriterChars(localFrame, line, start, 2);
              const checkFrame = start + line.length * 2 + 6;
              const showCheck = done && localFrame >= checkFrame;
              const nodeLit = showCheck;
              const nodeSize = portrait ? 20 : 22;
              const rowH = Math.max(nodeSize, fs * 1.35);
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: rowH,
                  }}
                >
                  <div
                    style={{
                      width: nodeSize + 4,
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <HexNode lit={nodeLit} size={nodeSize} />
                  </div>
                  {emoji ? (
                    <div
                      style={{
                        width: fs + 6,
                        height: rowH,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: fs,
                        lineHeight: 1,
                      }}
                    >
                      {emoji}
                    </div>
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: fs,
                        fontWeight: 600,
                        color: muted,
                        lineHeight: 1.35,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "nowrap",
                      }}
                    >
                      <span style={{ whiteSpace: "nowrap" }}>{chars}</span>
                      {showCheck ? (
                        <span
                          style={{
                            color: "#22c55e",
                            fontWeight: 900,
                            fontSize: fs + 4,
                            transform: `scale(${spring({ frame: localFrame - checkFrame, fps: 30, config: { damping: 10, stiffness: 260 } })})`,
                            display: "inline-flex",
                            alignItems: "center",
                            flexShrink: 0,
                            textShadow: showCheck && localFrame < checkFrame + 6 ? `0 0 8px ${CYAN}` : undefined,
                          }}
                        >
                          ✓
                          {localFrame === checkFrame ? <Audio src={SFX_DING} volume={0.4} /> : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {showNetwork ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: "28%",
                  width: "100%",
                  height: "40%",
                  opacity: networkFade * 0.5,
                  pointerEvents: "none",
                }}
                viewBox="0 0 300 80"
              >
                <line x1="30" y1="40" x2="150" y2="20" stroke={CYAN} strokeWidth="1.5" opacity="0.6" />
                <line x1="30" y1="40" x2="150" y2="60" stroke={CYAN} strokeWidth="1.5" opacity="0.6" />
                <line x1="150" y1="20" x2="270" y2="40" stroke={CYAN} strokeWidth="1.5" opacity="0.6" />
                <line x1="150" y1="60" x2="270" y2="40" stroke={CYAN} strokeWidth="1.5" opacity="0.6" />
              </svg>
            ) : null}
            <Divider />
            {suspense ? (
              <div
                style={{
                  fontSize: fs,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.72)",
                  opacity: localFrame >= allDoneFrame ? 1 : 0.5,
                }}
              >
                {localFrame >= allDoneFrame ? waitingText : "正在处理中..."}
              </div>
            ) : (
              <div
                style={{
                  fontSize: fs,
                  fontWeight: 600,
                  color: muted,
                  opacity: staggerOpacity(localFrame, items.length + 1, footerStart, 12, 14),
                }}
              >
                {typewriterChars(localFrame, footer, footerStart, 2)}
              </div>
            )}
            {finale && localFrame >= finaleStart ? (
              <div
                style={{
                  marginTop: 36,
                  textAlign: "center",
                  transform: `scale(${spring({ frame: localFrame - finaleStart, fps: 30, config: { damping: 11, stiffness: 200 } })})`,
                }}
              >
                <div
                  style={{
                    fontSize: portrait ? 56 : 64,
                    fontWeight: 900,
                    color: RED_HOOK,
                    letterSpacing: "0.04em",
                    textShadow: `0 0 16px ${RED_HOOK}66`,
                  }}
                >
                  {finale}
                  {localFrame === finaleStart ? <Audio src={SFX_BOOM} volume={0.38} /> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "flash-big") {
    const text = String(frame.title || "").trim();
    const fs = portrait ? 48 : 54;
    const scale = spring({ frame: localFrame, fps: 30, config: { damping: 13, stiffness: 240 } });
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        {localFrame === 0 ? <Audio src={SFX_BOOM} volume={0.42} /> : null}
        <div
          style={{
            transform: `scale(${0.55 + scale * 0.45})`,
            fontSize: fs,
            fontWeight: 900,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.35,
            letterSpacing: "0.03em",
            position: "relative",
            zIndex: 1,
            textShadow: `0 0 20px ${CYAN}44`,
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "progression") {
    const steps = frame.progressionSteps || [];
    const sequential = steps.some((s) => s.line);
    if (sequential) {
      const fs = portrait ? 30 : 34;
      const lastIdx = steps.length - 1;
      const { stepStarts, highlightStart } = buildProgressionTimeline(captions, fps, steps.length);
      const burst = localFrame >= highlightStart;
      return (
        <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
          <DouyinParticleBg burst={burst} burstStart={highlightStart} />
          {localFrame === highlightStart ? <Audio src={SFX_BOOM} volume={0.28} /> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "min(860px, 94%)", position: "relative", zIndex: 1 }}>
            {steps.map((step, i) => {
              const start = stepStarts[i] ?? i * 45;
              const nextStart = stepStarts[i + 1] ?? Number.POSITIVE_INFINITY;
              const isLast = i === lastIdx;
              const visible = localFrame >= start;
              const elapsed = Math.max(0, localFrame - start);

              const enterSpring = spring({
                frame: elapsed,
                fps,
                config: { damping: 12, stiffness: 200 },
              });
              const enterOp = staggerOpacity(localFrame, 0, start, 1, 18);

              const pastBlend =
                i < lastIdx && localFrame >= nextStart
                  ? interpolate(localFrame, [nextStart, nextStart + 22], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.out(Easing.cubic),
                    })
                  : 0;

              const highlighted = isLast && localFrame >= highlightStart;
              const highlightSpring = highlighted
                ? spring({ frame: localFrame - highlightStart, fps, config: { damping: 11, stiffness: 220 } })
                : 0;

              const enterScale = 0.88 + enterSpring * 0.12;
              const pastScale = 1 - pastBlend * 0.18;
              const highlightScale = highlighted ? 1 + highlightSpring * 0.06 : 1;
              const scale = visible ? enterScale * pastScale * highlightScale : 0.88;
              const translateY = -pastBlend * 8;
              const opacity = visible ? enterOp * (1 - pastBlend * 0.4) : 0;

              const baseFs = isLast && visible ? fs + 6 : fs;
              const fontSize = highlighted ? baseFs + highlightSpring * 2 : baseFs;
              const fontWeight = isLast && visible ? 900 : 700;
              const color = isLast && visible ? CYAN : pastBlend > 0.01 ? "rgba(255,255,255,0.55)" : "#ffffff";
              const textShadow =
                isLast && visible ? `0 0 ${12 + highlightSpring * 10}px ${CYAN}66` : undefined;

              const text = [step.prefix, step.line].filter(Boolean).join("：");
              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    fontSize,
                    fontWeight,
                    color,
                    textShadow,
                    textAlign: "center",
                    lineHeight: 1.35,
                  }}
                >
                  {visible ? text : null}
                  {localFrame === start && i > 0 ? <Audio src={SFX_DING} volume={0.22} /> : null}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      );
    }
    const fsTop = portrait ? 32 : 36;
    const fsBot = portrait ? 26 : 28;
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ display: "flex", flexDirection: "column", gap: 48, width: "min(860px, 94%)", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {steps.map((step, i) => {
              const start = i * 28;
              const op = staggerOpacity(localFrame, i, 0, 28, 16);
              return (
                <div key={i} style={{ flex: 1, textAlign: "center", opacity: op, position: "relative" }}>
                  <div style={{ fontSize: fsTop, fontWeight: 900, color: "#ffffff" }}>{step.top}</div>
                  {i < steps.length - 1 ? (
                    <span
                      style={{
                        position: "absolute",
                        right: -12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 28,
                        color: CYAN,
                        fontWeight: 900,
                        opacity: localFrame >= start + 14 ? 1 : 0,
                      }}
                    >
                      →
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {steps.map((step, i) => {
              const op = staggerOpacity(localFrame, i, 40, 28, 16);
              return (
                <div key={i} style={{ flex: 1, textAlign: "center", opacity: op }}>
                  <div
                    style={{
                      fontSize: fsBot,
                      fontWeight: 700,
                      color: i === steps.length - 1 ? CYAN : "rgba(255,255,255,0.82)",
                      textShadow: i === steps.length - 1 ? `0 0 10px ${CYAN}55` : undefined,
                    }}
                  >
                    {step.bottom}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "protocol") {
    const icon = frame.protocolIcon === "mouth" ? "mouth" : "hand";
    const title = String(frame.title || "").trim();
    const meta = String(frame.protocolMeta || frame.subtitle || "").trim();
    const equationRaw = String(frame.equation || frame.quote || "").trim();
    const emojiMatch = equationRaw.match(/([\u{1F300}-\u{1FAFF}\u2600-\u27BF])/u);
    const equationEmoji = emojiMatch?.[1] || (icon === "hand" ? "👋" : "👄");
    const equationText = equationRaw.replace(/([\u{1F300}-\u{1FAFF}\u2600-\u27BF])/gu, "").trim();
    const titleOp = staggerOpacity(localFrame, 0, 0, 8, 14);
    const diagramOp = staggerOpacity(localFrame, 0, 0, 10, 16);
    const eqOp = staggerOpacity(localFrame, 2, 28, 10, 16);
    const metaOp = staggerOpacity(localFrame, 3, 40, 8, 14);
    const emojiBounce = spring({ frame: Math.max(0, localFrame - 40), fps: 30, config: { damping: 8, stiffness: 280 } });
    const accent = icon === "hand" ? CYAN : MAGENTA;
    const diagramWidth = portrait ? 300 : 340;

    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ textAlign: "center", width: "min(780px, 92%)", position: "relative", zIndex: 1 }}>
          <div
            style={{
              opacity: diagramOp,
              marginBottom: 20,
              padding: portrait ? "18px 14px 10px" : "22px 20px 12px",
              borderRadius: 18,
              border: `1px solid ${accent}40`,
              background: `linear-gradient(160deg, ${accent}12 0%, rgba(0,0,0,0.35) 100%)`,
              boxShadow: `0 0 48px ${accent}18`,
            }}
          >
            {icon === "hand" ? (
              <McpDiagram localFrame={localFrame} size={diagramWidth} variant="full" />
            ) : (
              <A2aDiagram localFrame={localFrame} size={diagramWidth} variant="full" />
            )}
          </div>
          <div
            style={{
              opacity: titleOp,
              fontSize: portrait ? 52 : 60,
              fontWeight: 900,
              color: "#ffffff",
              marginBottom: 16,
              textShadow: `0 0 12px ${accent}44`,
            }}
          >
            {title}
          </div>
          <div style={{ opacity: eqOp, marginBottom: 14 }}>
            <div
              style={{
                fontSize: portrait ? 30 : 36,
                fontWeight: 800,
                color: accent,
                lineHeight: 1.4,
              }}
            >
              {equationText}
              <span
                style={{
                  display: "inline-block",
                  transform: `scale(${0.85 + emojiBounce * 0.25})`,
                  marginLeft: 2,
                }}
              >
                {equationEmoji}
              </span>
            </div>
          </div>
          <div
            style={{
              opacity: metaOp,
              fontSize: portrait ? 22 : 24,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {meta}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "dual-compare") {
    const rows = frame.compareRows || [];
    const reveal = frame.reveal;
    const fs = portrait ? 32 : 36;
    const tl = buildDualCompareTimeline(captions, fps, rows.length);
    const { rowStarts, fusionStart, agentHexStart, revealStart, finaleStart } = tl;
    const slideIn = interpolate(localFrame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
    const inReveal = Boolean(reveal) && localFrame >= revealStart;
    const fusionFlash = interpolate(localFrame, [fusionStart, fusionStart + 8, fusionStart + 16], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const breathe = (Math.sin(localFrame / 20) + 1) / 2;
    const progressEnd = Math.max(revealStart + 18, finaleStart - 6);
    const revealProgress = inReveal
      ? interpolate(localFrame, [revealStart, progressEnd], [0.95, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", fontFamily: FONT }}>
        <DouyinParticleBg
          burst={inReveal && localFrame >= finaleStart - 3}
          converge={inReveal && localFrame >= finaleStart + 12}
        />
        {!inReveal ? (
          <>
            <div
              style={{
                position: "absolute",
                left: "6%",
                top: "16%",
                transform: `translateX(${interpolate(slideIn, [0, 1], [-40, 0])}px)`,
                opacity: slideIn * 0.85,
              }}
            >
              <McpDiagram localFrame={localFrame} size={portrait ? 72 : 88} />
            </div>
            <div
              style={{
                position: "absolute",
                right: "4%",
                top: "18%",
                transform: `translateX(${interpolate(slideIn, [0, 1], [40, 0])}px)`,
                opacity: slideIn * 0.85,
              }}
            >
              <A2aDiagram localFrame={localFrame} size={portrait ? 100 : 120} />
            </div>
          </>
        ) : null}
        {slideIn > 0.3 ? (
          <svg style={{ position: "absolute", left: "20%", top: "30%", width: "60%", height: 40, opacity: 0.35 }} viewBox="0 0 200 20">
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={40 + i * 60 + ((localFrame + i * 18) % 56) * 0.5}
                cy={10}
                r="2.5"
                fill={i % 2 === 0 ? CYAN : MAGENTA}
              />
            ))}
          </svg>
        ) : null}
        {fusionFlash > 0.5 ? (
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,${fusionFlash * 0.25}) 0%, transparent 60%)`,
              pointerEvents: "none",
            }}
          />
        ) : null}
        {localFrame >= agentHexStart && !inReveal ? (
          <div style={{ position: "absolute", left: "50%", top: "10%", transform: "translateX(-50%)", opacity: 0.9 }}>
            <AgentSystemHex size={portrait ? 72 : 88} breathe={breathe} />
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: portrait ? 28 : 32,
            width: "min(820px, 92%)",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            marginTop: portrait ? 80 : 100,
          }}
        >
          {inReveal ? (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
                <div
                  style={{
                    width: 6,
                    height: 80,
                    borderRadius: 3,
                    background: "rgba(0,240,255,0.15)",
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${revealProgress * 100}%`,
                      background: `linear-gradient(180deg, ${CYAN}88, ${CYAN})`,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div style={{ flex: 1, fontSize: fs, fontWeight: 600, color: muted }}>
                  {typewriterChars(localFrame, String(reveal?.footer || ""), revealStart, 2)}
                </div>
              </div>
              {localFrame >= finaleStart ? (
                <div
                  style={{
                    textAlign: "center",
                    transform: `scale(${spring({ frame: localFrame - finaleStart, fps, config: { damping: 11, stiffness: 200 } })})`,
                  }}
                >
                  <div
                    style={{
                      fontSize: portrait ? 56 : 64,
                      fontWeight: 900,
                      color: RED_HOOK,
                      letterSpacing: "0.04em",
                      textShadow: `0 0 16px ${RED_HOOK}66`,
                    }}
                  >
                    {String(reveal?.finaleText || "")}
                    {localFrame === finaleStart ? <Audio src={SFX_BOOM} volume={0.38} /> : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            rows.map((row, i) => {
            const text = String(row.left || "").trim();
            const start = rowStarts[i] ?? i * 22;
            const isFinale = i === rows.length - 1;
            const op = localFrame >= start ? staggerOpacity(localFrame, 0, start, 15, 14) : 0;
            const scale = isFinale
              ? spring({ frame: Math.max(0, localFrame - start), fps, config: { damping: 12, stiffness: 200 } })
              : 1;
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    transform: isFinale ? `scale(${0.85 + scale * 0.15})` : undefined,
                    fontSize: isFinale ? fs + 8 : fs,
                    fontWeight: isFinale ? 900 : 700,
                    color: isFinale ? CYAN : "#ffffff",
                    lineHeight: 1.45,
                    textAlign: "center",
                    textShadow: isFinale ? `0 0 12px ${CYAN}55` : undefined,
                  }}
                >
                  {typewriterChars(localFrame, text, start, 2)}
                  {isFinale && localFrame === start ? <Audio src={SFX_BOOM} volume={0.32} /> : null}
                </div>
              );
          })
          )}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "roadmap-flash") {
    const lines = Array.isArray(frame.list) ? frame.list : [];
    const compact = frame.roadmapCompact === true;
    const fs = compact ? (portrait ? 40 : 44) : portrait ? 38 : 42;
    const step = compact ? 22 : 16;
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", position: "relative", zIndex: 1 }}>
          {lines.map((line, i) => {
            const start = i * step;
            const scale = spring({
              frame: Math.max(0, localFrame - start),
              fps: 30,
              config: { damping: 14, stiffness: 220 },
            });
            return (
              <div
                key={i}
                style={{
                  transform: `scale(${0.7 + scale * 0.3})`,
                  opacity: localFrame >= start ? 1 : 0,
                  fontSize: compact && i === 0 ? fs + 8 : i === lines.length - 1 && !compact ? fs + 12 : fs,
                  fontWeight: 900,
                  color: compact && i === 0 ? CYAN : i === lines.length - 1 && !compact ? CYAN : "#ffffff",
                  textAlign: "center",
                  textShadow: i === lines.length - 1 ? `0 0 14px ${CYAN}55` : undefined,
                }}
              >
                {line}
                {localFrame === start ? <Audio src={SFX_CLICK} volume={0.22} /> : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "effect-compare") {
    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div style={{ width: "min(760px, 94%)", position: "relative", zIndex: 1 }}>
          <EffectComparePanel
            left={frame.compareLeft}
            right={frame.compareRight}
            localFrame={localFrame}
            portrait={portrait}
          />
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "code-demo") {
    const lines = frame.codeLines || [];
    const highlightLine = frame.codeHighlightLine;
    const output = String(frame.codeOutput || "").trim();
    const titleLines = frame.codeTitleLines || [];
    const label = String(frame.codeLabel || "agent_demo.py").trim();
    const lineCps = 4;
    const codeEnd = lines.length * lineCps + 10;
    const outputStart = codeEnd + 8;
    const shrinkStart = outputStart + output.length * 2 + 24;
    const titleStart = shrinkStart + 20;
    const visibleLines = Math.min(lines.length, Math.floor(Math.max(0, localFrame) / lineCps));
    const hlFlash = highlightLine
      ? interpolate(localFrame, [highlightLine * lineCps, highlightLine * lineCps + 30], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
    const shrunk = localFrame >= shrinkStart;
    const editorScale = shrunk ? 0.55 : 1;
    const editorX = shrunk ? -28 : 0;

    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div
          style={{
            width: "min(720px, 94%)",
            display: "flex",
            flexDirection: shrunk ? "row" : "column",
            alignItems: shrunk ? "center" : "stretch",
            gap: shrunk ? 20 : 16,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              flex: shrunk ? "0 0 48%" : undefined,
              transform: `scale(${editorScale}) translateX(${editorX}%)`,
              transformOrigin: shrunk ? "left center" : "center top",
            }}
          >
            <CodeEditorBlock
              lines={lines}
              visibleLines={Math.max(visibleLines, shrunk ? lines.length : visibleLines)}
              highlightLine={highlightLine}
              label={label}
              compact={shrunk}
            />
            {localFrame >= outputStart && !shrunk ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#0d0d0d",
                  borderRadius: 8,
                  border: "1px solid rgba(34,197,94,0.35)",
                  fontFamily: MONO,
                  fontSize: 14,
                  color: "#4ade80",
                  opacity: staggerOpacity(localFrame, 0, outputStart, 10, 12),
                }}
              >
                {typewriterChars(localFrame, output, outputStart, 2)}
                {localFrame === outputStart ? <Audio src={SFX_DING} volume={0.35} /> : null}
              </div>
            ) : null}
            {highlightLine && hlFlash > 0 && hlFlash < 1 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `rgba(255,200,0,${0.08 * (1 - hlFlash)})`,
                  pointerEvents: "none",
                  borderRadius: 10,
                }}
              />
            ) : null}
          </div>
          {shrunk && titleLines.length ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
              {titleLines.map((line, i) => {
                const start = titleStart + i * 18;
                const scale = spring({
                  frame: Math.max(0, localFrame - start),
                  fps: 30,
                  config: { damping: 12, stiffness: 200 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      transform: `scale(${0.6 + scale * 0.4})`,
                      opacity: localFrame >= start ? 1 : 0,
                      fontSize: portrait ? (i === 0 ? 40 : 32) : i === 0 ? 48 : 38,
                      fontWeight: 900,
                      color: i === 0 ? CYAN : "#ffffff",
                      lineHeight: 1.25,
                      textShadow: i === 0 ? `0 0 14px ${CYAN}55` : undefined,
                    }}
                  >
                    {line}
                    {localFrame === start ? <Audio src={SFX_BOOM} volume={0.3} /> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }

  if (style === "cta-split") {
    const lines = Array.isArray(frame.list) ? frame.list : [];
    const useCompare = frame.ctaCompareSnapshot === true;
    const codeLines = frame.codeLines || [];
    const label = String(frame.codeLabel || "agent_demo.py").trim();
    const fs = portrait ? 34 : 38;
    let cursor = 12;
    const coinLineIdx = lines.findIndex((l) => l.includes("就是赚到") || l.includes("白嫖"));
    const coinFrame = coinLineIdx >= 0 ? coinLineIdx * 18 + 12 : -1;

    return (
      <AbsoluteFill style={{ padding: basePad, justifyContent: "center", fontFamily: FONT }}>
        <DouyinParticleBg />
        <div
          style={{
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            gap: portrait ? 24 : 28,
            width: "min(860px, 94%)",
            margin: "0 auto",
            alignItems: "stretch",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ flex: portrait ? undefined : "0 0 42%", minWidth: 0, transform: useCompare ? "scale(0.88)" : undefined, transformOrigin: "center center" }}>
            {useCompare ? (
              <EffectComparePanel
                left={frame.compareLeft || { title: "❌ 不用Agent", steps: ["打开浏览器 → 搜索..."], timing: "⏱ 5分钟+" }}
                right={frame.compareRight || { title: "✅ 用Agent", steps: ['一句话："帮我查股价"'], timing: "⏱ 3秒 ✓", result: "✓ 股价: 150.2元" }}
                localFrame={0}
                portrait={portrait}
                compact
                frosted
                snapshot
              />
            ) : (
              <CodeEditorBlock lines={codeLines} visibleLines={codeLines.length} label={label} compact frosted />
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, justifyContent: "center" }}>
            {lines.map((line, i) => {
              const start = cursor;
              cursor += line.length * 2 + 10;
              const chars = typewriterChars(localFrame, line, start, 2);
              const hasCoin = line.includes("就是赚到") || line.includes("白嫖");
              return (
                <div
                  key={i}
                  style={{
                    fontSize: i === lines.length - 1 ? fs + 10 : fs,
                    fontWeight: 900,
                    color: hasCoin ? "#fbbf24" : "#ffffff",
                    lineHeight: 1.3,
                    textShadow: hasCoin ? "0 0 12px rgba(251,191,36,0.5)" : undefined,
                    position: "relative",
                  }}
                >
                  {chars}
                  {hasCoin && coinFrame >= 0 && localFrame >= coinFrame
                    ? ["🪙", "🪙", "🪙"].map((c, ci) => (
                        <span
                          key={ci}
                          style={{
                            position: "absolute",
                            right: -8 - ci * 12,
                            top: -8 - ci * 6,
                            fontSize: 18,
                            opacity: interpolate(localFrame, [coinFrame + ci * 4, coinFrame + ci * 4 + 20], [0, 0.9], {
                              extrapolateRight: "clamp",
                            }),
                            transform: `translateY(${interpolate(localFrame, [coinFrame + ci * 4, coinFrame + ci * 4 + 24], [0, 24], { extrapolateRight: "clamp" })}px)`,
                          }}
                        >
                          {c}
                        </span>
                      ))
                    : null}
                </div>
              );
            })}
            {localFrame >= cursor + 8 ? (
              <div
                style={{
                  marginTop: 12,
                  alignSelf: "flex-start",
                  padding: "12px 28px",
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${RED_HOOK}, #ff6b9d)`,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#fff",
                  boxShadow: `0 0 20px ${RED_HOOK}66`,
                  transform: `scale(${0.92 + 0.08 * Math.sin(localFrame / 10)})`,
                }}
              >
                + 关注
              </div>
            ) : null}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ padding: basePad, justifyContent: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#fff" }}>{frame.title}</div>
    </AbsoluteFill>
  );
};
