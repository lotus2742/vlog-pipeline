import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { useEnter } from "../utils";
import { ClosingHookPanel } from "./closing-hook-panel";
import { OpeningHookPanel } from "./opening-hook-panel";

const CTA_ITEM_RE = /收藏|下期见|关注|💾|🔖|🚀/;

const isCtaListItem = (raw: string) => {
  const s = String(raw || "").trim();
  if (/^[①②③④⑤⑥⑦⑧⑨⑩]/u.test(s)) return false;
  if (/^\d{1,2}[.、)]\s/u.test(s)) return false;
  return CTA_ITEM_RE.test(s);
};
const isBookmarkItem = (raw: string) => /收藏|🔖|💾/.test(String(raw || ""));
const isFollowItem = (raw: string) => /关注|下期见|🚀/.test(String(raw || ""));

export const HookSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = height > width;
  const shinePos = interpolate(localFrame, [8, 96], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shineOpacity = interpolate(localFrame, [0, 10, 96, 120], [0, 0.88, 0.88, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const layoutStyle = String(frame.style || "").toLowerCase();
  const spotlight = layoutStyle === "spotlight";
  const split = layoutStyle === "split";
  const listItems = Array.isArray(frame.list) ? frame.list : [];
  const isClosingHook = listItems.length >= 3;
  const hookLine = String(frame.hookLine || "").trim();
  /** 片尾 CTA：split 或含关注/收藏类 list；开篇默认走 OpeningHookPanel（spotlight + hookLine） */
  const useClosingLayout = split || (isClosingHook && ctaItems.length > 0 && Boolean(hookLine));
  /** 首帧（及无特殊需求的 hook 开篇）：居中舞台 OpeningHookPanel */
  const useOpeningLayout = spotlight && Boolean(hookLine) && !useClosingLayout;
  const topicItems = listItems.filter((t) => !isCtaListItem(t));
  const ctaItems = listItems.filter((t) => isCtaListItem(t));
  const subLen = String(frame.subtitle || "").trim().length;
  /** 开篇副标题很长时缩小字号，避免 720p 竖向溢出 */
  const hookSubFsCenter = subLen > 160 ? 17 : subLen > 110 ? 21 : 32;
  const hookTitleFsCenter = subLen > 160 ? 44 : subLen > 110 ? 52 : 62;
  const hookSubFsSpot = isClosingHook ? 26 : subLen > 160 ? 19 : subLen > 110 ? 24 : 30;
  const listBlock = listItems.length > 0 ? (
    <ul style={{ marginTop: 24, marginBottom: 0, paddingLeft: 24, fontSize: isClosingHook ? 22 : 26, color: colors.muted, lineHeight: isClosingHook ? 1.6 : 1.55 }}>
      {listItems.map((t, i) => (
        <li key={i} style={{ marginBottom: isClosingHook ? 10 : 8 }}>{t}</li>
      ))}
    </ul>
  ) : null;

  const ShineText = ({ text, gradient }: { text?: string; gradient: string }) => (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden" }}>
      <span>{text}</span>
      <span style={{ position: "absolute", inset: 0, color: "transparent", background: gradient, WebkitBackgroundClip: "text", filter: "blur(1.2px)", opacity: shineOpacity, pointerEvents: "none" }}>
        {text}
      </span>
    </span>
  );

  const listAsCards = (
    <>
      {listItems.map((t, i) => (
        <div
          key={i}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(15,23,42,0.32)",
            padding: "12px 14px",
            fontSize: 20,
            lineHeight: 1.45,
            color: colors.muted,
          }}
        >
          <span style={{ color: "#a78bfa", fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
          {t}
        </div>
      ))}
    </>
  );

  const kicker = String(frame.kicker || "").trim();
  const contrast = frame.hookContrast;
  const hasContrast = Boolean(contrast?.highValue && contrast?.lowValue);

  const listAsPills =
    listItems.length > 0 ? (
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {listItems.map((t, i) => (
          <div
            key={i}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(34,211,238,0.45)",
              background: "rgba(34,211,238,0.12)",
              padding: "8px 16px",
              fontSize: 18,
              fontWeight: 700,
              color: "#ecfeff",
              letterSpacing: "0.02em",
            }}
          >
            {t}
          </div>
        ))}
      </div>
    ) : null;

  const PriceDuel = () => {
    if (!hasContrast || !contrast) return null;
    const hi = String(contrast.highValue);
    const lo = String(contrast.lowValue);
    const ratio = String(contrast.ratio || "").trim();
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          {contrast.highLabel ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, marginBottom: 6, letterSpacing: "0.06em" }}>
              {contrast.highLabel}
            </div>
          ) : null}
          <div style={{ fontSize: 52, fontWeight: 900, color: "#fb923c", lineHeight: 1, textShadow: "0 8px 32px rgba(251,146,60,0.35)" }}>
            {hi}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {ratio ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#f8fafc",
                background: "linear-gradient(135deg, #ef4444 0%, #fb923c 100%)",
                borderRadius: 12,
                padding: "8px 12px",
                lineHeight: 1,
                boxShadow: "0 8px 24px rgba(239,68,68,0.35)",
              }}
            >
              {ratio}
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 900, color: "rgba(148,163,184,0.9)" }}>VS</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          {contrast.lowLabel ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, marginBottom: 6, letterSpacing: "0.06em" }}>
              {contrast.lowLabel}
            </div>
          ) : null}
          <div style={{ fontSize: 52, fontWeight: 900, color: "#34d399", lineHeight: 1, textShadow: "0 8px 32px rgba(52,211,153,0.28)" }}>
            {lo}
          </div>
        </div>
      </div>
    );
  };


  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: useClosingLayout || useOpeningLayout ? "stretch" : "center",
        padding: useClosingLayout
          ? portrait
            ? "12px 16px 16px"
            : "20px 32px 24px"
          : useOpeningLayout
            ? portrait
              ? "16px 16px 12px"
              : "28px 32px 16px"
          : split
            ? "40px 36px 48px"
            : "72px 72px 48px",
        overflow: useClosingLayout || useOpeningLayout ? "hidden" : undefined,
        boxSizing: "border-box",
        height: useClosingLayout || useOpeningLayout ? "100%" : undefined,
        opacity,
      }}
    >
      {useClosingLayout ? (
        <div style={{ width: "100%", height: "100%", minHeight: 0 }}>
          <ClosingHookPanel
            frame={frame}
            colors={colors}
            hookLine={hookLine}
            topics={topicItems.length > 0 ? topicItems : listItems.slice(0, 3)}
            bookmarkItems={ctaItems.filter(isBookmarkItem)}
            followItems={ctaItems.filter(isFollowItem)}
            otherCtaItems={ctaItems.filter((t) => !isBookmarkItem(t) && !isFollowItem(t))}
            portrait={portrait}
            height={height}
            localFrame={localFrame}
            shinePos={shinePos}
            ShineText={ShineText}
          />
        </div>
      ) : useOpeningLayout ? (
        <div style={{ width: "100%", height: "100%", minHeight: 0 }}>
          <OpeningHookPanel
            frame={frame}
            colors={colors}
            hookLine={hookLine}
            listItems={listItems}
            portrait={portrait}
            height={height}
            localFrame={localFrame}
            shinePos={shinePos}
            ShineText={ShineText}
          />
        </div>
      ) : split ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            justifyContent: "center",
            gap: 36,
            width: "min(1120px, 94%)",
            maxHeight: "calc(100% - 16px)",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: "1 1 56%", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.14, color: colors.primary, textAlign: "left" }}>
              <ShineText text={frame.title} gradient={`linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.18) ${shinePos - 16}%, rgba(255,255,255,0.5) ${shinePos}%, rgba(255,255,255,0.18) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`} />
            </div>
            {frame.subtitle ? (
              <div style={{ marginTop: 18, fontSize: 24, color: colors.muted, lineHeight: 1.5, textAlign: "left" }}>{frame.subtitle}</div>
            ) : null}
          </div>
          {listItems.length > 0 ? (
            <div
              style={{
                flex: "0 1 40%",
                minWidth: 260,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {listAsCards}
            </div>
          ) : null}
        </div>
      ) : spotlight ? (
        <div
          style={{
            width: "min(980px, 92%)",
            borderRadius: 28,
            padding: hasContrast ? "40px 48px 44px" : isClosingHook ? "44px 50px" : "52px 56px",
            background: hasContrast
              ? "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.28), transparent 58%), rgba(0,0,0,0.28)"
              : "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.35), transparent 55%), rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            textAlign: hasContrast ? "center" : undefined,
          }}
        >
          {kicker ? (
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#22d3ee", marginBottom: 14 }}>
              {kicker}
            </div>
          ) : null}
          {hasContrast ? <PriceDuel /> : null}
          <div style={{ fontSize: hasContrast ? 36 : 58, fontWeight: 800, lineHeight: 1.15, color: colors.primary, marginTop: hasContrast ? 16 : 0 }}>
            <ShineText text={frame.title} gradient={`linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.16) ${shinePos - 16}%, rgba(255,255,255,0.46) ${shinePos}%, rgba(255,255,255,0.16) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`} />
          </div>
          {frame.subtitle ? (
            <div
              style={{
                marginTop: hasContrast ? 14 : isClosingHook ? 16 : 22,
                fontSize: hasContrast ? 22 : hookSubFsSpot,
                color: colors.muted,
                lineHeight: 1.45,
              }}
            >
              {frame.subtitle}
            </div>
          ) : null}
          {isClosingHook ? (
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {listItems.map((t, i) => (
                <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(15,23,42,0.32)", padding: "10px 12px", fontSize: 20, lineHeight: 1.45, color: colors.muted }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
                  {t}
                </div>
              ))}
            </div>
          ) : hasContrast ? (
            listAsPills
          ) : (
            listBlock
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", maxWidth: 980, boxSizing: "border-box", padding: "0 8px" }}>
          <div style={{ fontSize: hookTitleFsCenter, fontWeight: 800, lineHeight: 1.1, color: colors.primary }}>
            <ShineText text={frame.title} gradient={`linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.18) ${shinePos - 16}%, rgba(255,255,255,0.5) ${shinePos}%, rgba(255,255,255,0.18) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`} />
          </div>
          {frame.subtitle ? (
            <div style={{ marginTop: 18, fontSize: hookSubFsCenter, color: colors.muted, lineHeight: 1.45 }}>{frame.subtitle}</div>
          ) : null}
          {listItems.length > 0 ? <div style={{ textAlign: "left", maxWidth: 880, margin: "28px auto 0" }}>{listBlock}</div> : null}
        </div>
      )}
    </AbsoluteFill>
  );
};
