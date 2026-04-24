import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type VlogFrame = {
  id?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  script?: string;
  style?: string;
  cards?: Array<{ title?: string; label?: string; desc?: string; color?: string }>;
  left?: { label?: string; title?: string; color?: string; points?: string[] };
  right?: { label?: string; title?: string; color?: string; points?: string[] };
  insight?: string;
  items?: Array<{ title?: string; desc?: string }>;
  quote?: string;
  attribution?: string;
  value?: string;
  label?: string;
  unit?: string;
  footnote?: string;
  kpis?: Array<{ title?: string; value?: string; label?: string; unit?: string }>;
  list?: string[];
  trend_title?: string;
  trend_points?: string[];
};

export type SlideSpec = {
  id: string;
  type: string;
  durationInFrames: number;
  frame: VlogFrame;
  audioSrc?: string;
  captions?: Array<{ start: number; end: number; text: string }>;
  captionKeywords?: string[];
};

export type VlogFramesProps = {
  meta?: { topic?: string; theme?: string; voice?: string; rate?: string };
  slides: SlideSpec[];
};

const THEME_BG: Record<string, string> = {
  purple: "linear-gradient(145deg, #12081c 0%, #2a1040 45%, #4c1d95 100%)",
  ocean: "linear-gradient(145deg, #041a24 0%, #0c4a6e 50%, #155e75 100%)",
  dark: "linear-gradient(145deg, #0a0a0a 0%, #171717 50%, #262626 100%)",
  light: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 55%, #cbd5e1 100%)",
};

const THEME_TEXT: Record<string, { primary: string; muted: string; card: string }> = {
  purple: { primary: "#faf5ff", muted: "rgba(250,245,255,0.78)", card: "rgba(255,255,255,0.08)" },
  ocean: { primary: "#ecfeff", muted: "rgba(236,254,255,0.8)", card: "rgba(255,255,255,0.08)" },
  dark: { primary: "#fafafa", muted: "rgba(250,250,250,0.75)", card: "rgba(255,255,255,0.06)" },
  light: { primary: "#0f172a", muted: "rgba(15,23,42,0.72)", card: "rgba(15,23,42,0.06)" },
};

const THEME_ACCENT: Record<string, string> = {
  purple: "rgba(167, 139, 250, 0.26)",
  ocean: "rgba(34, 211, 238, 0.24)",
  dark: "rgba(56, 189, 248, 0.2)",
  light: "rgba(59, 130, 246, 0.16)",
};

function useEnter() {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

const staggerOpacity = (
  frame: number,
  index: number,
  start = 0,
  step = 6,
  duration = 12,
) =>
  interpolate(frame, [start + index * step, start + index * step + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const HookSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const shinePos = interpolate(localFrame, [8, 96], [-40, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shineOpacity = interpolate(localFrame, [0, 10, 96, 120], [0, 0.88, 0.88, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spotlight = String(frame.style || "").toLowerCase() === "spotlight";
  const listItems = Array.isArray(frame.list) ? frame.list : [];
  const isClosingHook = listItems.length >= 3;
  const listBlock =
    listItems.length > 0 ? (
      <ul
        style={{
          marginTop: 24,
          marginBottom: 0,
          paddingLeft: 24,
          fontSize: isClosingHook ? 22 : 26,
          color: colors.muted,
          lineHeight: isClosingHook ? 1.6 : 1.55,
        }}
      >
        {listItems.map((t, i) => (
          <li key={i} style={{ marginBottom: isClosingHook ? 10 : 8 }}>
            {t}
          </li>
        ))}
      </ul>
    ) : null;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 72,
        opacity,
      }}
    >
      {spotlight ? (
        <div
          style={{
            width: "min(980px, 92%)",
            borderRadius: 28,
            padding: isClosingHook ? "44px 50px" : "52px 56px",
            background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.35), transparent 55%), rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.12, color: colors.primary }}>
            <span style={{ position: "relative", display: "inline-block", overflow: "hidden" }}>
              <span>{frame.title}</span>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "transparent",
                  background: `linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.16) ${shinePos - 16}%, rgba(255,255,255,0.46) ${shinePos}%, rgba(255,255,255,0.16) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`,
                  WebkitBackgroundClip: "text",
                  filter: "blur(1.2px)",
                  opacity: shineOpacity,
                  pointerEvents: "none",
                }}
              >
                {frame.title}
              </span>
            </span>
          </div>
          {frame.subtitle ? (
            <div
              style={{
                marginTop: isClosingHook ? 16 : 22,
                fontSize: isClosingHook ? 26 : 30,
                color: colors.muted,
                lineHeight: 1.45,
              }}
            >
              {frame.subtitle}
            </div>
          ) : null}
          {isClosingHook ? (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {listItems.map((t, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(15,23,42,0.32)",
                    padding: "10px 12px",
                    fontSize: 20,
                    lineHeight: 1.45,
                    color: colors.muted,
                  }}
                >
                  <span style={{ color: "#a78bfa", fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                  {t}
                </div>
              ))}
            </div>
          ) : (
            listBlock
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", maxWidth: 980 }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.1, color: colors.primary }}>
            <span style={{ position: "relative", display: "inline-block", overflow: "hidden" }}>
              <span>{frame.title}</span>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "transparent",
                  background: `linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.18) ${shinePos - 16}%, rgba(255,255,255,0.5) ${shinePos}%, rgba(255,255,255,0.18) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`,
                  WebkitBackgroundClip: "text",
                  filter: "blur(1.2px)",
                  opacity: shineOpacity,
                  pointerEvents: "none",
                }}
              >
                {frame.title}
              </span>
            </span>
          </div>
          {frame.subtitle ? (
            <div style={{ marginTop: 20, fontSize: 32, color: colors.muted }}>{frame.subtitle}</div>
          ) : null}
          {listItems.length > 0 ? (
            <div style={{ textAlign: "left", maxWidth: 880, margin: "28px auto 0" }}>{listBlock}</div>
          ) : null}
        </div>
      )}
    </AbsoluteFill>
  );
};

const CardsSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const cards = Array.isArray(frame.cards) ? frame.cards : [];
  return (
    <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>
        {frame.title}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        {cards.map((c, i) => {
          const cardFade = staggerOpacity(localFrame, i);
          return (
            <div
              key={i}
              style={{
                borderRadius: 18,
                padding: "22px 24px",
                background: colors.card,
                border: "1px solid rgba(255,255,255,0.12)",
                opacity: cardFade,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>
                {c.title || c.label || "要点"}
              </div>
              <div style={{ fontSize: 24, color: colors.muted, lineHeight: 1.45 }}>{c.desc}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ComparisonSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const left = frame.left || {};
  const right = frame.right || {};
  const lPts = Array.isArray(left.points) ? left.points : [];
  const rPts = Array.isArray(right.points) ? right.points : [];
  return (
    <AbsoluteFill style={{ padding: "52px 60px", opacity }}>
      <div style={{ fontSize: 42, fontWeight: 800, color: colors.primary, marginBottom: 26 }}>
        {frame.title}
      </div>
      <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            borderRadius: 20,
            padding: 24,
            background: colors.card,
            border: "1px solid rgba(34,211,238,0.25)",
            opacity: staggerOpacity(localFrame, 0),
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: "#22d3ee", marginBottom: 14 }}>
            {left.label || left.title || "左侧"}
          </div>
          {lPts.length ? (
            <ul style={{ margin: 0, paddingLeft: 22, color: colors.muted, fontSize: 24, lineHeight: 1.55 }}>
              {lPts.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: colors.muted, fontSize: 22 }}>（无要点，见下方结论）</div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 20,
            padding: 24,
            background: colors.card,
            border: "1px solid rgba(251,146,60,0.25)",
            opacity: staggerOpacity(localFrame, 1),
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fb923c", marginBottom: 14 }}>
            {right.label || right.title || "右侧"}
          </div>
          {rPts.length ? (
            <ul style={{ margin: 0, paddingLeft: 22, color: colors.muted, fontSize: 24, lineHeight: 1.55 }}>
              {rPts.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: colors.muted, fontSize: 22 }}>（无要点，见下方结论）</div>
          )}
        </div>
      </div>
      {frame.insight ? (
        <div
          style={{
            marginTop: 22,
            fontSize: 24,
            color: colors.muted,
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            opacity: staggerOpacity(localFrame, 2),
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const BulletsSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const items = Array.isArray(frame.items) ? frame.items : [];
  return (
    <AbsoluteFill style={{ padding: "56px 72px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>
        {frame.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              opacity: staggerOpacity(localFrame, i),
            }}
          >
            <div
              style={{
                minWidth: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(167,139,250,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                color: "#e9d5ff",
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: colors.primary }}>{it.title}</div>
              <div style={{ fontSize: 23, color: colors.muted, marginTop: 6, lineHeight: 1.5 }}>
                {it.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const KpiSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const kpis = Array.isArray(frame.kpis) ? frame.kpis : [];
  const trendPts = Array.isArray(frame.trend_points) ? frame.trend_points : [];
  const showDashboard =
    kpis.length >= 3 && (Boolean(frame.trend_title?.trim()) || trendPts.length > 0);
  const pulse = interpolate(localFrame % 90, [0, 45, 89], [0.88, 1, 0.88], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (kpis.length && showDashboard) {
    return (
      <AbsoluteFill style={{ padding: "44px 40px", opacity }}>
        <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, marginBottom: 16 }}>
          {frame.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignContent: "flex-start",
            }}
          >
            {kpis.map((k, i) => (
              <div
                key={i}
                style={{
                  minWidth: 130,
                  flex: "1 1 44%",
                  borderRadius: 16,
                  padding: "14px 14px",
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: staggerOpacity(localFrame, i),
                }}
              >
                <div style={{ fontSize: 16, color: colors.muted }}>{k.title}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#34d399", marginTop: 4 }}>
                  {k.value}
                  {k.unit ? <span style={{ fontSize: 18, fontWeight: 600 }}> {k.unit}</span> : null}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              flex: "1 1 auto",
              borderRadius: 18,
              padding: "14px 14px 12px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                padding: "0 2px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  fontWeight: 700,
                  color: "rgba(148,163,184,0.95)",
                }}
              >
                TREND PANEL
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#34d399",
                  boxShadow: "0 0 10px rgba(52,211,153,0.9)",
                  transform: `scale(${pulse})`,
                }}
              />
            </div>

            {frame.trend_title ? (
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: colors.primary,
                  marginBottom: 8,
                  lineHeight: 1.35,
                }}
              >
                {frame.trend_title}
              </div>
            ) : null}

            <div
              style={{
                position: "relative",
                height: 68,
                borderRadius: 12,
                marginBottom: 12,
                background:
                  "linear-gradient(180deg, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.14) 100%)",
                border: "1px solid rgba(148,163,184,0.2)",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 240 68"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                <defs>
                  <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <polyline
                  points={`0,54 36,${46 - pulse * 1.5} 72,${38 - pulse * 2} 108,42 144,${26 - pulse * 2.5} 180,30 216,${16 - pulse * 2} 240,20`}
                  fill="none"
                  stroke="url(#trendLine)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trendPts.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: 10,
                    background: "rgba(15,23,42,0.24)",
                    border: "1px solid rgba(148,163,184,0.18)",
                    opacity: staggerOpacity(localFrame, i, 16),
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      marginTop: 8,
                      background: i === 0 ? "#34d399" : i === 1 ? "#22d3ee" : "#a78bfa",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 16,
                      color: colors.muted,
                      lineHeight: 1.45,
                    }}
                  >
                    {p}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (kpis.length) {
    return (
      <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>
          {frame.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {kpis.map((k, i) => (
            <div
              key={i}
              style={{
                minWidth: 200,
                flex: "1 1 200px",
                borderRadius: 18,
                padding: "24px 26px",
                background: colors.card,
                border: "1px solid rgba(255,255,255,0.1)",
                opacity: staggerOpacity(localFrame, i),
              }}
            >
              <div style={{ fontSize: 22, color: colors.muted }}>{k.title}</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399", marginTop: 8 }}>
                {k.value}
                {k.unit ? <span style={{ fontSize: 24, fontWeight: 600 }}> {k.unit}</span> : null}
              </div>
              {k.label ? <div style={{ fontSize: 20, color: colors.muted, marginTop: 6 }}>{k.label}</div> : null}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ padding: "56px 64px", justifyContent: "center", opacity }}>
      <div style={{ fontSize: 28, color: colors.muted, marginBottom: 12 }}>{frame.label}</div>
      <div style={{ fontSize: 72, fontWeight: 900, color: "#34d399" }}>
        {frame.value}
        {frame.unit ? <span style={{ fontSize: 36 }}> {frame.unit}</span> : null}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, marginTop: 20 }}>{frame.title}</div>
      {frame.footnote ? (
        <div style={{ fontSize: 22, color: colors.muted, marginTop: 16 }}>{frame.footnote}</div>
      ) : null}
    </AbsoluteFill>
  );
};

const QuoteSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  return (
    <AbsoluteFill style={{ padding: "64px 80px", justifyContent: "center", opacity }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>
        {frame.title}
      </div>
      <div
        style={{
          fontSize: 34,
          fontStyle: "italic",
          lineHeight: 1.55,
          color: colors.muted,
          borderLeft: "5px solid rgba(167,139,250,0.8)",
          paddingLeft: 28,
        }}
      >
        {frame.quote}
      </div>
      {frame.attribution ? (
        <div style={{ marginTop: 20, fontSize: 24, color: colors.muted }}>— {frame.attribution}</div>
      ) : null}
    </AbsoluteFill>
  );
};

const GenericSlide: React.FC<{ frame: VlogFrame; colors: (typeof THEME_TEXT)["purple"] }> = ({
  frame,
  colors,
}) => {
  const opacity = useEnter();
  const script = String(frame.script || "").slice(0, 280);
  return (
    <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 20 }}>
        {frame.title || frame.type}
      </div>
      <div style={{ fontSize: 26, color: colors.muted, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
        {script}
      </div>
    </AbsoluteFill>
  );
};

const SlideBody: React.FC<{ slide: SlideSpec; themeKey: string }> = ({ slide, themeKey }) => {
  const colors = THEME_TEXT[themeKey] ?? THEME_TEXT.purple;
  const f = slide.frame;
  switch (slide.type) {
    case "hook":
      return <HookSlide frame={f} colors={colors} />;
    case "cards":
      return <CardsSlide frame={f} colors={colors} />;
    case "comparison":
      return <ComparisonSlide frame={f} colors={colors} />;
    case "bullets":
      return <BulletsSlide frame={f} colors={colors} />;
    case "kpi":
      return <KpiSlide frame={f} colors={colors} />;
    case "quote":
      return <QuoteSlide frame={f} colors={colors} />;
    default:
      return <GenericSlide frame={f} colors={colors} />;
  }
};

const SlideCaption: React.FC<{ slide: SlideSpec }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cues = Array.isArray(slide.captions) ? slide.captions : [];
  const active = cues.find((c) => t >= c.start && t <= c.end);
  if (!active) {
    return null;
  }

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 30,
          maxWidth: "88%",
          borderRadius: 12,
          background: "rgba(0,0,0,0.65)",
          border: "1px solid rgba(255,255,255,0.16)",
          padding: "10px 16px",
          color: "#f8fafc",
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
          textShadow: "0 2px 12px rgba(0,0,0,0.55)",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};

export const VlogFramesComposition: React.FC<VlogFramesProps> = ({ meta, slides }) => {
  const frame = useCurrentFrame();
  const themeKey = String(meta?.theme || "purple").toLowerCase();
  const bg = THEME_BG[themeKey] ?? THEME_BG.purple;
  const isLight = themeKey === "light";
  const accent = THEME_ACCENT[themeKey] ?? THEME_ACCENT.purple;
  const glowShift = interpolate(frame % 240, [0, 120, 239], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const motifShiftX = Math.sin(frame / 90) * 9;
  const motifShiftY = Math.cos(frame / 110) * 6;
  const nodePulse = interpolate(frame % 80, [0, 40, 79], [0.7, 1, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanlineY = (frame * 2.2) % 720;

  let from = 0;
  return (
    <AbsoluteFill
      style={{
        background: bg,
        fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",
        color: isLight ? "#0f172a" : "#fafafa",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 18% 14%, rgba(56,189,248,0.2), transparent 40%), radial-gradient(circle at 84% 72%, rgba(168,85,247,0.24), transparent 42%)",
          opacity: isLight ? 0.45 : 1,
          transform: `translate3d(${glowShift * 14}px, ${-glowShift * 9}px, 0)`,
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: isLight ? 0.16 : 0.22,
          transform: `translate3d(${motifShiftX}px, ${motifShiftY}px, 0)`,
        }}
      >
        <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="aiStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.5)" />
            </linearGradient>
          </defs>

          <text x="80" y="170" fill="rgba(148,163,184,0.28)" fontSize="92" fontWeight="800">
            AI AGENT
          </text>
          <text x="880" y="620" fill="rgba(148,163,184,0.2)" fontSize="74" fontWeight="800">
            HERMES
          </text>

          <rect x="962" y="128" width="190" height="170" rx="28" fill="none" stroke="url(#aiStroke)" strokeWidth="2.8" />
          <circle cx="1008" cy="185" r="14" fill="none" stroke="url(#aiStroke)" strokeWidth="2.8" />
          <circle cx="1104" cy="185" r="14" fill="none" stroke="url(#aiStroke)" strokeWidth="2.8" />
          <rect x="1038" y="226" width="34" height="12" rx="6" fill="url(#aiStroke)" />
          <line x1="1057" y1="128" x2="1057" y2="94" stroke="url(#aiStroke)" strokeWidth="2.8" />
          <circle cx="1057" cy="88" r="8" fill="none" stroke="url(#aiStroke)" strokeWidth="2.8" />

          <polyline points="78,542 160,542 192,506 254,506" fill="none" stroke="url(#aiStroke)" strokeWidth="2.2" />
          <polyline points="254,506 286,470 356,470" fill="none" stroke="url(#aiStroke)" strokeWidth="2.2" />
          <circle cx="160" cy="542" r={5 * nodePulse} fill="rgba(34,211,238,0.9)" />
          <circle cx="254" cy="506" r={5 * nodePulse} fill="rgba(34,211,238,0.9)" />
          <circle cx="356" cy="470" r={5 * nodePulse} fill="rgba(34,211,238,0.9)" />

          <polyline points="1180,420 1120,420 1090,454 1036,454" fill="none" stroke="url(#aiStroke)" strokeWidth="2.2" />
          <polyline points="1036,454 996,492 918,492" fill="none" stroke="url(#aiStroke)" strokeWidth="2.2" />
          <circle cx="1120" cy="420" r={5 * nodePulse} fill="rgba(167,139,250,0.95)" />
          <circle cx="1036" cy="454" r={5 * nodePulse} fill="rgba(167,139,250,0.95)" />
          <circle cx="918" cy="492" r={5 * nodePulse} fill="rgba(167,139,250,0.95)" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: isLight ? 0.2 : 0.12,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.07) 48%, transparent 100%)",
          transform: `translateY(${scanlineY}px)`,
          opacity: isLight ? 0.22 : 0.28,
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 108,
            height: 108,
            borderLeft: `2px solid ${accent}`,
            borderTop: `2px solid ${accent}`,
            borderTopLeftRadius: 16,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 20,
            top: 20,
            width: 108,
            height: 108,
            borderRight: `2px solid ${accent}`,
            borderTop: `2px solid ${accent}`,
            borderTopRightRadius: 16,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 20,
            bottom: 20,
            width: 108,
            height: 108,
            borderLeft: `2px solid ${accent}`,
            borderBottom: `2px solid ${accent}`,
            borderBottomLeftRadius: 16,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            width: 108,
            height: 108,
            borderRight: `2px solid ${accent}`,
            borderBottom: `2px solid ${accent}`,
            borderBottomRightRadius: 16,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "20px 36px", height: 64, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.85,
            borderBottom: `1px solid ${accent}`,
            paddingBottom: 8,
            transform: `scale(${0.998 + Math.sin(frame / 45) * 0.002})`,
          }}
        >
          <span style={{ fontWeight: 600 }}>{meta?.topic || "vlog-pipeline"}</span>
        </div>
      </AbsoluteFill>

      {slides.map((slide) => {
        const dur = Math.max(15, slide.durationInFrames);
        const isLastSlide = slide.id === slides[slides.length - 1]?.id;
        const seq = (
          <Sequence key={slide.id} from={from} durationInFrames={dur}>
            {slide.audioSrc ? <Audio src={staticFile(slide.audioSrc)} /> : null}
            <AbsoluteFill style={{ top: isLastSlide ? -36 : 24 }}>
              <SlideBody slide={slide} themeKey={themeKey} />
            </AbsoluteFill>
            <SlideCaption slide={slide} />
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};
