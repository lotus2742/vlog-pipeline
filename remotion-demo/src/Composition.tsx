import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type DemoProps = {
  title?: string;
  subtitle?: string;
};

export const MyComposition: React.FC<DemoProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleY = interpolate(frame, [10, 40], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const progress = spring({
    fps,
    frame: frame - 15,
    config: {
      damping: 12,
      stiffness: 110,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0b1020 0%, #1b2a52 55%, #2f4f9b 100%)",
        color: "#f8fbff",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 920,
          borderRadius: 24,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          padding: "56px 64px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 66,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.05,
          }}
        >
          {title ?? "Remotion Skill Demo"}
        </div>

        <div
          style={{
            marginTop: 18,
            transform: `translateY(${subtitleY}px)`,
            opacity: titleOpacity,
            fontSize: 34,
            fontWeight: 500,
            color: "rgba(235, 244, 255, 0.92)",
          }}
        >
          {subtitle ?? "30fps / 1280x720 / Spring + Interpolate"}
        </div>

        <div
          style={{
            marginTop: 38,
            width: "100%",
            height: 18,
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(progress, 1) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #67e8f9 0%, #22d3ee 50%, #0ea5e9 100%)",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
