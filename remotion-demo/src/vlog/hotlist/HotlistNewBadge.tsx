import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const BADGE_RED = {
  from: "#ff6b7a",
  mid: "#ff4757",
  to: "#ff3344",
} as const;

/** 彗星主体：左长尾渐隐 → 右亮核 */
const COMET_HEAD =
  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 8%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0.38) 60%, rgba(255,255,255,0.58) 75%, rgba(255,255,255,0.82) 88%, rgba(255,255,255,1) 96%, rgba(255,255,255,0.35) 100%)";

/** 彗尾余晖：更宽更淡，叠在主体后方 */
const COMET_TAIL =
  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 12%, rgba(255,255,255,0.1) 28%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.08) 62%, transparent 78%)";

const SWEEP_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

/** 新入榜标签：本体静止，从左到右彗星尾扫光 */
export const HotlistNewBadge: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const h = Math.round(13 * scale);
  const padX = Math.round(4 * scale);
  const fontSize = Math.max(7, Math.round(7.5 * scale));
  const radius = Math.round(6 * scale);

  const enterOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // 扫光时长与间隔分开控制：慢扫 + 短停
  const pauseFrames = Math.max(6, Math.round(fps * 0.22));
  const sweepFrames = Math.max(60, Math.round(fps * 3.5));
  const cycle = pauseFrames * 2 + sweepFrames;
  const local = frame % cycle;

  let shineX = -140;
  if (local >= pauseFrames && local < pauseFrames + sweepFrames) {
    const sweepT = (local - pauseFrames) / sweepFrames;
    shineX = interpolate(sweepT, [0, 1], [-140, 140], { easing: SWEEP_EASING });
  } else if (local >= pauseFrames + sweepFrames) {
    shineX = 140;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        flexShrink: 0,
        opacity: enterOpacity,
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: h,
          padding: `0 ${padX}px`,
          borderRadius: radius,
          fontSize,
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: "#ffffff",
          background: `linear-gradient(118deg, ${BADGE_RED.from} 0%, ${BADGE_RED.mid} 52%, ${BADGE_RED.to} 100%)`,
          lineHeight: 1,
          overflow: "hidden",
          boxShadow: `0 1px ${Math.round(4 * scale)}px rgba(255, 71, 87, 0.38)`,
          border: "1px solid rgba(255, 255, 255, 0.38)",
          textShadow: "0 1px 0 rgba(180, 20, 40, 0.35)",
        }}
      >
        <span style={{ position: "relative", zIndex: 2 }}>NEW</span>

        {/* 彗尾余晖（落后主体，更宽更淡） */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "-40%",
            bottom: "-40%",
            left: 0,
            width: "320%",
            zIndex: 1,
            background: COMET_TAIL,
            transform: `translateX(calc(${shineX}% - 28%))`,
            mixBlendMode: "soft-light",
            pointerEvents: "none",
          }}
        />

        {/* 彗星主体（亮核 + 长尾） */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "-40%",
            bottom: "-40%",
            left: 0,
            width: "280%",
            zIndex: 1,
            background: COMET_HEAD,
            transform: `translateX(${shineX}%)`,
            mixBlendMode: "soft-light",
            pointerEvents: "none",
          }}
        />
      </span>
    </span>
  );
};
