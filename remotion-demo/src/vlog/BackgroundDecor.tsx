import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { BIG_DIPPER_STARS, GEMINI_STARS, LIBRA_STARS, STAR_NOISE_POINTS } from "./constants";
import { TopicWatermark } from "./VlogTopicWatermark";

type Props = {
  frame: number;
  isLight: boolean;
  cinematic: boolean;
  /** 防摩尔纹：大色块光晕 + 暗角，无网格/扫描线/细星点 */
  safe?: boolean;
  accent: string;
  noiseFactor: number;
  lowNoiseMode: boolean;
  topic?: string;
};

const CornerFrameAndTopic: React.FC<{ accent: string; topic?: string; frame: number }> = ({
  accent,
  topic,
  frame,
}) => (
  <>
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 20, top: 20, width: 108, height: 108, borderLeft: `2px solid ${accent}`, borderTop: `2px solid ${accent}`, borderTopLeftRadius: 16 }} />
      <div style={{ position: "absolute", right: 20, top: 20, width: 108, height: 108, borderRight: `2px solid ${accent}`, borderTop: `2px solid ${accent}`, borderTopRightRadius: 16 }} />
      <div style={{ position: "absolute", left: 20, bottom: 20, width: 108, height: 108, borderLeft: `2px solid ${accent}`, borderBottom: `2px solid ${accent}`, borderBottomLeftRadius: 16 }} />
      <div style={{ position: "absolute", right: 20, bottom: 20, width: 108, height: 108, borderRight: `2px solid ${accent}`, borderBottom: `2px solid ${accent}`, borderBottomRightRadius: 16 }} />
    </AbsoluteFill>
    <AbsoluteFill style={{ padding: "18px 36px", height: 64, justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 18,
          opacity: 0.82,
          borderBottom: `1px solid ${accent}`,
          height: 40,
          transform: `scale(${0.998 + Math.sin(frame / 45) * 0.002})`,
        }}
      >
        <span style={{ fontStyle: "italic", fontWeight: 600, letterSpacing: 0.4 }}>{topic || "vlog-pipeline"}</span>
      </div>
    </AbsoluteFill>
  </>
);

/** 大尺度光晕 + 暗角，避免细网格/星点/扫描线在抖音二次压缩后出现摩尔纹 */
const SafeCinematicBackground: React.FC<Props> = ({ frame, isLight, accent, topic }) => {
  const glowShift = interpolate(frame % 360, [0, 180, 359], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <AbsoluteFill
        style={{
          background: isLight
            ? `radial-gradient(ellipse 90% 70% at 15% 12%, rgba(56,189,248,0.14), transparent 72%),
               radial-gradient(ellipse 85% 65% at 90% 85%, rgba(99,102,241,0.12), transparent 70%)`
            : `radial-gradient(ellipse 90% 70% at 14% 16%, rgba(56,189,248,0.26), transparent 72%),
               radial-gradient(ellipse 85% 68% at 86% 80%, rgba(168,85,247,0.24), transparent 70%),
               radial-gradient(ellipse 60% 50% at 50% 108%, rgba(52,211,153,0.10), transparent 68%)`,
          transform: `translate3d(${glowShift * 10}px, ${-glowShift * 6}px, 0)`,
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: isLight
            ? "radial-gradient(ellipse at center, transparent 50%, rgba(15,23,42,0.18) 100%)"
            : "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.42) 100%)",
        }}
      />
      <TopicWatermark topic={topic} layout="vlog" isLight={isLight} />
      <CornerFrameAndTopic accent={accent} topic={topic} frame={frame} />
    </>
  );
};

export const BackgroundDecor: React.FC<Props> = (props) => {
  if (props.safe) {
    return <SafeCinematicBackground {...props} />;
  }

  const {
    frame,
    isLight,
    cinematic,
    accent,
    noiseFactor,
    lowNoiseMode,
    topic,
  } = props;
  const { height: vh } = useVideoConfig();
  const glowShift = interpolate(frame % 240, [0, 120, 239], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const motifShiftX = Math.sin(frame / 90) * 9;
  const motifShiftY = Math.cos(frame / 110) * 6;
  const gridShift = Math.sin(frame / 180) * 8;
  const nodePulse = interpolate(frame % 80, [0, 40, 79], [0.7, 1, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scanlineY = (frame * 2.2) % Math.max(1, vh);
  const starNoisePulse = 0.82 + 0.18 * Math.sin(frame / 70);
  const robotBobY = Math.sin(frame / 48) * 2.4;
  const robotNodDeg = Math.sin(frame / 64) * 2.2;
  const antennaSwingDeg = Math.sin(frame / 36) * 6.5;
  const eyeBlink = Math.pow((Math.sin((frame + 9) / 11) + 1) / 2, 10);
  const eyeGlow = 0.45 + eyeBlink * 0.45;
  const eyeScaleY = 0.72 + eyeBlink * 0.5;

  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 18% 14%, rgba(56,189,248,0.2), transparent 40%), radial-gradient(circle at 84% 72%, rgba(168,85,247,0.24), transparent 42%)", opacity: (cinematic ? (isLight ? 0.28 : 0.72) : isLight ? 0.45 : 1) * noiseFactor, transform: `translate3d(${glowShift * 14}px, ${-glowShift * 9}px, 0)` }} />
      <AbsoluteFill style={{ pointerEvents: "none", opacity: (cinematic ? (isLight ? 0.1 : 0.14) : isLight ? 0.16 : 0.22) * noiseFactor, transform: cinematic ? `translate3d(${motifShiftX * 0.65}px, ${motifShiftY * 0.65}px, 0)` : `translate3d(${motifShiftX}px, ${motifShiftY}px, 0)`, filter: cinematic ? "blur(0.4px)" : undefined }}>
        <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="aiStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.5)" />
            </linearGradient>
          </defs>
          <g transform={`translate(0 ${robotBobY.toFixed(2)}) rotate(${robotNodDeg.toFixed(2)} 1057 213)`}>
            <rect x="962" y="128" width="190" height="170" rx="28" fill="none" stroke="url(#aiStroke)" strokeWidth="2.8" />
            <ellipse cx="1008" cy="185" rx="14" ry={Math.max(4.2, 14 * eyeScaleY)} fill={`rgba(186,230,253,${eyeGlow * 0.28})`} stroke="url(#aiStroke)" strokeWidth="2.6" />
            <ellipse cx="1104" cy="185" rx="14" ry={Math.max(4.2, 14 * (eyeScaleY * 0.96))} fill={`rgba(186,230,253,${eyeGlow * 0.26})`} stroke="url(#aiStroke)" strokeWidth="2.6" />
            <rect x="1038" y="226" width="34" height="12" rx="6" fill="url(#aiStroke)" />
            <g transform={`rotate(${antennaSwingDeg.toFixed(2)} 1057 128)`}>
              <line x1="1057" y1="128" x2="1057" y2="94" stroke="url(#aiStroke)" strokeWidth="2.8" />
              <circle cx="1057" cy="88" r={8 + eyeBlink * 1.6} fill={`rgba(125,211,252,${0.08 + eyeBlink * 0.12})`} stroke="url(#aiStroke)" strokeWidth="2.8" />
            </g>
          </g>

          <polyline points={GEMINI_STARS.map((s) => `${s.x},${s.y}`).join(" ")} fill="none" stroke="url(#aiStroke)" strokeWidth="1.8" opacity={0.82} />
          <line x1={GEMINI_STARS[1].x} y1={GEMINI_STARS[1].y} x2={GEMINI_STARS[5].x} y2={GEMINI_STARS[5].y} stroke="url(#aiStroke)" strokeWidth="1.4" opacity={0.62} />
          {GEMINI_STARS.map((s, i) => {
            const tw = (Math.sin((frame + i * 31) / (8 + (i % 2) * 2)) + 1) / 2;
            const blink = Math.pow(tw, 2.1);
            const r = (1.8 + blink * 1.6) * (0.9 + nodePulse * 0.12);
            return <g key={`gemini-${i}`}><circle cx={s.x} cy={s.y} r={r + 2.2} fill={`rgba(34,211,238,${0.05 + blink * 0.1})`} /><circle cx={s.x} cy={s.y} r={r} fill={`rgba(167,243,255,${0.35 + blink * 0.5})`} /></g>;
          })}

          <polyline points={LIBRA_STARS.map((s) => `${s.x},${s.y}`).join(" ")} fill="none" stroke="url(#aiStroke)" strokeWidth="1.8" opacity={0.82} />
          <line x1={LIBRA_STARS[0].x} y1={LIBRA_STARS[0].y} x2={LIBRA_STARS[4].x} y2={LIBRA_STARS[4].y} stroke="url(#aiStroke)" strokeWidth="1.4" opacity={0.62} />
          {LIBRA_STARS.map((s, i) => {
            const tw = (Math.sin((frame + i * 27) / (9 + (i % 3))) + 1) / 2;
            const blink = Math.pow(tw, 2.2);
            const r = (1.8 + blink * 1.7) * (0.9 + nodePulse * 0.12);
            return <g key={`libra-${i}`}><circle cx={s.x} cy={s.y} r={r + 2.2} fill={`rgba(167,139,250,${0.05 + blink * 0.1})`} /><circle cx={s.x} cy={s.y} r={r} fill={`rgba(233,213,255,${0.34 + blink * 0.5})`} /></g>;
          })}

          {STAR_NOISE_POINTS.map((s, i) => {
            const blink = 0.74 + 0.26 * Math.sin((frame + s.phase) / (13 + (i % 5) * 2));
            return <circle key={`star-noise-${i}`} cx={s.x} cy={s.y} r={s.r} fill={`rgba(255,255,255,${s.a * blink * starNoisePulse})`} />;
          })}

          {BIG_DIPPER_STARS.map((s, i) => {
            const breathe = 0.8 + 0.2 * Math.sin((frame + i * 19) / 24);
            const twinkleRaw = (Math.sin((frame + i * 37) / (7 + (i % 3))) + 1) / 2;
            const twinkle = Math.pow(twinkleRaw, 2.2);
            const sparkleRaw = (Math.sin((frame + i * 53) / (17 + (i % 2) * 4)) + 1) / 2;
            const sparkle = Math.pow(sparkleRaw, 6);
            const base = (2.9 + twinkle * 1.4 + sparkle * 1.2) * breathe;
            const glow = 0.34 + twinkle * 0.42 + sparkle * 0.28;
            const flare = 0.12 + twinkle * 0.18 + sparkle * 0.22;
            const diamondPoints = `${s.x},${s.y - base} ${s.x + base},${s.y} ${s.x},${s.y + base} ${s.x - base},${s.y}`;
            return (
              <g key={`big-dipper-${i}`}>
                <circle cx={s.x} cy={s.y} r={base + 3.6} fill={`rgba(255,255,255,${0.05 + twinkle * 0.06 + sparkle * 0.08})`} />
                <polygon points={diamondPoints} fill={`rgba(255,255,255,${glow})`} />
                <line x1={s.x - base * 1.7} y1={s.y} x2={s.x + base * 1.7} y2={s.y} stroke={`rgba(255,255,255,${flare})`} strokeWidth={0.85 + twinkle * 0.35 + sparkle * 0.3} strokeLinecap="round" />
                <line x1={s.x} y1={s.y - base * 1.7} x2={s.x} y2={s.y + base * 1.7} stroke={`rgba(255,255,255,${flare})`} strokeWidth={0.85 + twinkle * 0.35 + sparkle * 0.3} strokeLinecap="round" />
                <line x1={s.x - base * 1.25} y1={s.y - base * 1.25} x2={s.x + base * 1.25} y2={s.y + base * 1.25} stroke={`rgba(255,255,255,${flare * 0.85})`} strokeWidth={0.65 + twinkle * 0.28 + sparkle * 0.24} strokeLinecap="round" />
                <line x1={s.x + base * 1.25} y1={s.y - base * 1.25} x2={s.x - base * 1.25} y2={s.y + base * 1.25} stroke={`rgba(255,255,255,${flare * 0.85})`} strokeWidth={0.65 + twinkle * 0.28 + sparkle * 0.24} strokeLinecap="round" />
              </g>
            );
          })}
          <polyline points={`${BIG_DIPPER_STARS[0].x},${BIG_DIPPER_STARS[0].y} ${BIG_DIPPER_STARS[1].x},${BIG_DIPPER_STARS[1].y} ${BIG_DIPPER_STARS[2].x},${BIG_DIPPER_STARS[2].y} ${BIG_DIPPER_STARS[3].x},${BIG_DIPPER_STARS[3].y} ${BIG_DIPPER_STARS[0].x},${BIG_DIPPER_STARS[0].y}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.15" />
          <polyline points={`${BIG_DIPPER_STARS[3].x},${BIG_DIPPER_STARS[3].y} ${BIG_DIPPER_STARS[4].x},${BIG_DIPPER_STARS[4].y} ${BIG_DIPPER_STARS[5].x},${BIG_DIPPER_STARS[5].y} ${BIG_DIPPER_STARS[6].x},${BIG_DIPPER_STARS[6].y}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.15" />
        </svg>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)", backgroundSize: "48px 48px", opacity: (cinematic ? (isLight ? 0.12 : 0.08) : isLight ? 0.2 : 0.12) * noiseFactor, transform: cinematic ? `translate3d(${gridShift}px, 0, 0)` : undefined }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.07) 48%, transparent 100%)", transform: `translateY(${scanlineY}px)`, opacity: (cinematic ? (isLight ? 0.1 : 0.14) : isLight ? 0.22 : 0.28) * noiseFactor }} />

      {cinematic ? (
        <>
          <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.22) 100%)", opacity: (isLight ? 0.22 : 0.5) * (lowNoiseMode ? 1.06 : 1) }} />
          <AbsoluteFill style={{ pointerEvents: "none", opacity: (isLight ? 0.03 : 0.045) * noiseFactor, mixBlendMode: "soft-light", backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8) 0.8px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.7) 0.7px, transparent 1px), radial-gradient(circle at 60% 35%, rgba(255,255,255,0.55) 0.6px, transparent 1px)", backgroundSize: "160px 160px, 210px 210px, 130px 130px" }} />
        </>
      ) : null}

      <TopicWatermark topic={topic} layout="vlog" isLight={isLight} />
      <CornerFrameAndTopic accent={accent} topic={topic} frame={frame} />
    </>
  );
};
