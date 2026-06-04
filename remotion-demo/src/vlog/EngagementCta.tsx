import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const CTA_ITEMS = [
  { label: "点赞", accent: "#fb7185", icon: "♥" },
  { label: "收藏", accent: "#fbbf24", icon: "★" },
  { label: "加关注", accent: "#34d399", icon: "+" },
] as const;

type EngagementCtaProps = {
  isLight?: boolean;
};

export const EngagementCta: React.FC<EngagementCtaProps> = ({ isLight }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const compact = width < 1100 || portrait;

  const enterStart = Math.round(0.6 * fps);
  const enterEnd = Math.round(1.4 * fps);
  const enter = interpolate(frame, [enterStart, enterEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const slideX = interpolate(enter, [0, 1], [compact ? 56 : 72, 0]);
  const floatY = Math.sin((frame / fps) * Math.PI * 2 * 0.55) * (compact ? 2 : 3);

  const cycleFrames = Math.round(1.1 * fps);
  const activeIndex = Math.floor((Math.max(0, frame - enterEnd) / cycleFrames) % CTA_ITEMS.length);
  const shimmerPeriod = Math.round(2.6 * fps);
  const shimmerPhase =
    frame >= enterEnd ? ((frame - enterEnd) % shimmerPeriod) / shimmerPeriod : 0;

  if (enter <= 0.001) {
    return null;
  }

  const iconSize = compact ? 20 : 24;
  const fontSize = compact ? 14 : 16;
  const itemGap = compact ? 8 : 10;
  const chipBg = isLight ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.12)";

  return (
    <div
      style={{
        position: "absolute",
        top: portrait ? 48 : 24,
        right: portrait ? 20 : 28,
        zIndex: 40,
        pointerEvents: "none",
        opacity: enter,
        transform: `translateX(${slideX}px) translateY(${floatY}px)`,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: itemGap,
        background: "transparent",
      }}
    >
      {CTA_ITEMS.map((item, i) => {
        const localFrame = Math.max(0, frame - enterEnd - i * Math.round(0.12 * fps));
        const pop = interpolate(localFrame, [0, Math.round(0.3 * fps)], [0.88, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.5)),
        });
        const isActive = i === activeIndex && frame >= enterEnd;
        const pulse = isActive
          ? interpolate(
              (frame - enterEnd) % cycleFrames,
              [0, cycleFrames * 0.45, cycleFrames],
              [1, 1.08, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          : 1;
        const scale = pop * pulse;
        const shimmerX = interpolate(
          (shimmerPhase + i * 0.22) % 1,
          [0, 1],
          [-130, 130],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const shimmerOpacity =
          frame >= enterEnd
            ? interpolate(shimmerPhase, [0, 0.12, 0.88, 1], [0.55, 1, 1, 0.55], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;

        return (
          <div
            key={item.label}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: compact ? 5 : 7,
              padding: compact ? "5px 8px" : "6px 10px",
              borderRadius: 999,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              background: isActive ? `${item.accent}28` : chipBg,
              border: isActive ? `1px solid ${item.accent}99` : "1px solid rgba(255,255,255,0.18)",
              boxShadow: isActive
                ? `0 4px 16px ${item.accent}44`
                : isLight
                  ? "0 4px 12px rgba(15,23,42,0.08)"
                  : "0 4px 14px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: shimmerOpacity,
                overflow: "hidden",
                borderRadius: 999,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-30%",
                  bottom: "-30%",
                  width: "52%",
                  left: `${shimmerX}%`,
                  transform: "skewX(-22deg)",
                  background: isLight
                    ? "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.85) 45%, transparent 72%)"
                    : "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.42) 45%, transparent 72%)",
                }}
              />
            </div>
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: compact ? 5 : 7,
              }}
            >
              <div
                style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: 999,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: compact ? 12 : 14,
                  fontWeight: 800,
                  color: "#0f172a",
                  background: `linear-gradient(145deg, ${item.accent} 0%, ${item.accent}cc 100%)`,
                  boxShadow: isActive ? `0 0 10px ${item.accent}88` : `0 0 8px ${item.accent}44`,
                }}
              >
                {item.icon}
              </div>
              <div
                style={{
                  fontSize,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  color: isLight ? "#0f172a" : "#f8fafc",
                  whiteSpace: "nowrap",
                  textShadow: isLight ? "none" : "0 1px 6px rgba(0,0,0,0.4)",
                }}
              >
                {item.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
