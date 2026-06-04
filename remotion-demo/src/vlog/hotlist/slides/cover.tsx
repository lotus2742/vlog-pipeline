import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { VlogFrame } from "../../types";
import { staggerOpacity, useEnter } from "../../utils";
import { useHotlistLayout } from "../layoutSpec";
import { HOTLIST_THEME } from "../theme";

const CAPTION_RESERVE = 88;
/** 左右主内容区整体下移，避免与顶栏争抢垂直空间 */
const CONTENT_PUSH_DOWN = 56;

const WEEK_IN_LABEL = /[（(](第\s*\d+\s*周)[)）]/;

/** 期次行后的「第N周」；优先 kicker，否则从 label 括号内提取 */
const resolveCoverWeek = (frame: VlogFrame) => {
  const kicker = String(frame.kicker || "").trim();
  const labelRaw = String(frame.label || "").trim();
  if (kicker) {
    return { week: kicker, label: labelRaw };
  }
  const match = labelRaw.match(WEEK_IN_LABEL);
  if (!match) {
    return { week: "", label: labelRaw };
  }
  const week = match[1].replace(/\s/g, "");
  const label = labelRaw.replace(WEEK_IN_LABEL, "").trim();
  return { week, label };
};

const formatWeekParen = (week: string) => {
  const inner = week.replace(/^[（(]/, "").replace(/[)）]$/, "").trim();
  if (!inner) return "";
  return `（${inner}）`;
};

export const HotlistCoverSlide: React.FC<{ frame: VlogFrame }> = ({ frame }) => {
  const { headerH, sx, sy } = useHotlistLayout();
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const theme = String(frame.insight || "").trim();
  const threshold = String(frame.footnote || "").trim();
  const dataSource = String(frame.hookLine || "").trim();
  const padX = 56 * sx;
  const { week: weekLabel, label: periodLabel } = resolveCoverWeek(frame);
  const weekDisplay = weekLabel ? formatWeekParen(weekLabel) : "";

  return (
    <AbsoluteFill
      style={{
        top: headerH,
        height: `calc(100% - ${headerH}px)`,
        background: "transparent",
        boxSizing: "border-box",
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${24 * sy}px ${padX}px ${CAPTION_RESERVE * sy}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120 * sx,
          marginTop: CONTENT_PUSH_DOWN * sy,
          display: "flex",
          alignItems: "center",
          gap: 48 * sx,
        }}
      >
        {/* 左侧：主标题 */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <div
            style={{
              fontSize: 11 * sx,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: HOTLIST_THEME.growth,
              marginBottom: 12 * sy,
            }}
          >
            GITHUB AI HOTLIST
          </div>
          <div
            style={{
              fontSize: 36 * sx,
              fontWeight: 800,
              color: HOTLIST_THEME.title,
              lineHeight: 1.15,
            }}
          >
            {frame.title}
          </div>
          {frame.subtitle || weekDisplay ? (
            <div
              style={{
                marginTop: 14 * sy,
                display: "flex",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: `${4 * sx}px`,
              }}
            >
              {frame.subtitle ? (
                <span
                  style={{
                    fontSize: 18 * sx,
                    fontWeight: 700,
                    color: "#b45309",
                    lineHeight: 1.3,
                  }}
                >
                  {frame.subtitle}
                </span>
              ) : null}
              {weekDisplay ? (
                <span
                  style={{
                    fontSize: 13 * sx,
                    fontWeight: 500,
                    color: HOTLIST_THEME.muted,
                    lineHeight: 1.3,
                  }}
                >
                  {weekDisplay}
                </span>
              ) : null}
            </div>
          ) : null}
          {periodLabel ? (
            <div style={{ marginTop: 8 * sy, fontSize: 13 * sx, color: HOTLIST_THEME.muted, lineHeight: 1.4 }}>
              {periodLabel}
            </div>
          ) : null}
        </div>

        {/* 右侧：主题与入榜说明 */}
        {(theme || threshold) ? (
          <div
            style={{
              flex: `0 0 ${360 * sx}px`,
              width: 360 * sx,
              maxWidth: "42%",
              padding: `${22 * sy}px ${24 * sx}px`,
              borderRadius: 12 * sx,
              background: HOTLIST_THEME.footerBg,
              border: `1px solid ${HOTLIST_THEME.footerBorder}`,
              opacity: staggerOpacity(localFrame, 1),
            }}
          >
            {theme ? (
              <div
                style={{
                  fontSize: 15 * sx,
                  fontWeight: 600,
                  color: HOTLIST_THEME.title,
                  lineHeight: 1.5,
                }}
              >
                {theme}
              </div>
            ) : null}
            {threshold ? (
              <div
                style={{
                  marginTop: theme ? 12 * sy : 0,
                  fontSize: 12 * sx,
                  color: HOTLIST_THEME.muted,
                  lineHeight: 1.45,
                  paddingTop: theme ? 12 * sy : 0,
                  borderTop: theme ? `1px solid ${HOTLIST_THEME.footerBorder}` : undefined,
                }}
              >
                {threshold}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {dataSource ? (
        <div
          style={{
            position: "absolute",
            right: padX,
            top: 10 * sy,
            maxWidth: 480 * sx,
            textAlign: "right",
            fontSize: 10 * sx,
            lineHeight: 1.45,
            color: HOTLIST_THEME.mutedLight,
            opacity: staggerOpacity(localFrame, 1),
          }}
        >
          {dataSource}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
