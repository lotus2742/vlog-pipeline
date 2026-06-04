import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { growthBarRatio } from "../../hotlistLayout";
import type { VlogFrame } from "../../types";
import { staggerOpacity, useEnter } from "../../utils";
import { SVG_CONTENT, useHotlistLayout } from "../layoutSpec";
import { HOTLIST_TAG_PALETTE, HOTLIST_THEME, LANG_CHIP } from "../theme";
import { HotlistNewBadge } from "../HotlistNewBadge";
import {
  formatRankLabel,
  isGrowthKing,
  kpiMatch,
  parseAuthor,
  parseGrowthNumber,
} from "../utils";

/** 项目详情页 — 按 optimized-slide-v4.svg 绝对坐标排版 */
export const HotlistProjectSlide: React.FC<{ frame: VlogFrame }> = ({ frame }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const L = useHotlistLayout();
  const { sx, sy, cx, cy, width, padX } = L;
  const c = SVG_CONTENT;

  const kpis = Array.isArray(frame.kpis) ? frame.kpis : [];
  const tags = Array.isArray(frame.list) ? frame.list : [];
  const rank = String(frame.subtitle || "").trim();
  const authorRaw = String(frame.label || "").trim();
  const { name: authorName, title: authorTitle, initials } = parseAuthor(authorRaw);
  const totalVal = kpiMatch(kpis, "总")?.value ?? "";
  const langVal = kpiMatch(kpis, "语言")?.value ?? "";
  const weeklyVal = kpiMatch(kpis, "本周")?.value ?? "";
  const weeklyNum = parseGrowthNumber(frame.weeklyGrowth, weeklyVal);
  const maxWeekly = Math.max(parseGrowthNumber(frame.weeklyGrowthMax), weeklyNum, 1);
  const barPct = growthBarRatio(weeklyNum, maxWeekly, { headroom: 1.25, cap: 0.9 });
  const barScale = interpolate(localFrame, [8, 42], [0, barPct], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isKing = isGrowthKing(frame, weeklyNum, maxWeekly);
  const insight = String(frame.insight || "").trim();
  const rightPad = padX;
  const colW = c.rightCol.barW * sx;
  const colLeft = Math.min(cx(c.rightCol.x), width - rightPad - colW);
  const leftColMaxW = Math.max(200 * sx, colLeft - cx(c.desc.x) - 12 * sx);
  const descFs = 14 * sx;
  const descLineH = c.desc.lineHeight * sy;
  const barW = colW;
  const barFillW = barW * barScale;
  const pctLabel = `${Math.round(barPct * 100)}%`;
  const metricFs = Math.min(32 * sx, colW * 0.55);
  const labelFs = 13 * sx;
  return (
    <AbsoluteFill style={{ background: "transparent", opacity, overflow: "hidden" }}>
      {/* 排名徽章 */}
      {rank ? (
        <div
          style={{
            position: "absolute",
            left: cx(c.rank.x),
            top: cy(c.rank.y),
            width: c.rank.w * sx,
            height: c.rank.h * sy,
            borderRadius: c.rank.radius * sx,
            background: HOTLIST_THEME.rankBadge,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: staggerOpacity(localFrame, 0),
          }}
        >
          <span style={{ fontSize: 16 * sx, fontWeight: 700, color: "#ffffff" }}>{formatRankLabel(rank)}</span>
        </div>
      ) : null}

      {/* 项目名称 + Star：纵向流式，间距随项目名换行自动撑开 */}
      <div
        style={{
          position: "absolute",
          left: cx(c.projectName.x),
          top: cy(c.projectName.y),
          maxWidth: leftColMaxW,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: c.projectNameStarGap * sy,
          opacity: staggerOpacity(localFrame, 0),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8 * sx,
            fontSize: 24 * sx,
            fontWeight: 700,
            color: HOTLIST_THEME.title,
            lineHeight: 1.15,
            wordBreak: "break-word",
          }}
        >
          <span>{frame.title}</span>
          {frame.isNew ? <HotlistNewBadge scale={sx} /> : null}
        </div>

        {totalVal || langVal ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * sx,
              flexWrap: "wrap",
            }}
          >
            {totalVal ? (
              <span style={{ fontSize: 15 * sx, fontWeight: 700, color: HOTLIST_THEME.star }}>★ {totalVal}</span>
            ) : null}
            {langVal ? (
              <span
                style={{
                  fontSize: 12 * sx,
                  fontWeight: 600,
                  color: LANG_CHIP.color,
                  background: LANG_CHIP.bg,
                  padding: `${4 * sy}px ${14 * sx}px`,
                  borderRadius: 12 * sx,
                  lineHeight: 1.2,
                }}
              >
                {langVal}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 描述 + 标签 + 作者：流式纵向排列，随内容自动撑开间距 */}
      <div
        style={{
          position: "absolute",
          left: cx(c.desc.x),
          top: cy(c.desc.y),
          maxWidth: leftColMaxW,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: c.descTagGap * sy,
          zIndex: 2,
          opacity: staggerOpacity(localFrame, 1),
        }}
      >
        {insight ? (
          <p
            style={{
              margin: 0,
              fontSize: descFs,
              lineHeight: `${descLineH}px`,
              color: HOTLIST_THEME.body,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {insight}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: c.tags.gap * sx,
              rowGap: c.tags.gap * sy,
              maxWidth: leftColMaxW,
            }}
          >
            {tags.map((t, i) => {
              const pal = HOTLIST_TAG_PALETTE[i % HOTLIST_TAG_PALETTE.length];
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: c.tags.h * sy,
                    padding: `0 ${14 * sx}px`,
                    borderRadius: c.tags.radius * sy,
                    fontSize: 12 * sx,
                    fontWeight: 600,
                    color: pal.color,
                    background: pal.bg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        ) : null}

        {authorRaw ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12 * sx,
              opacity: staggerOpacity(localFrame, 2),
            }}
          >
            <div
              style={{
                width: c.author.avatarR * 2 * sx,
                height: c.author.avatarR * 2 * sx,
                borderRadius: "50%",
                background: HOTLIST_THEME.avatarBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12 * sx,
                fontWeight: 600,
                color: HOTLIST_THEME.avatarText,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 14 * sx, fontWeight: 500, color: HOTLIST_THEME.body, lineHeight: 1.3 }}>
                {authorName}
              </div>
              {authorTitle ? (
                <div style={{ fontSize: 12 * sx, color: HOTLIST_THEME.mutedLight, marginTop: 2 * sy, lineHeight: 1.3 }}>
                  {authorTitle}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* 右侧增速区 */}
      <div
        style={{
          position: "absolute",
          left: colLeft,
          top: cy(c.rightCol.y),
          width: colW,
          maxWidth: width - colLeft - rightPad,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          zIndex: 3,
          overflow: "hidden",
        }}
      >
        {isKing ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: c.kingBadge.w * sx,
              maxWidth: "100%",
              height: c.kingBadge.h * sy,
              padding: `0 ${10 * sx}px`,
              borderRadius: c.kingBadge.radius * sx,
              background: HOTLIST_THEME.growth,
              marginBottom: 10 * sy,
              flexShrink: 0,
              opacity: staggerOpacity(localFrame, 0),
            }}
          >
            <span style={{ fontSize: 12 * sx, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap" }}>
              本周增速王
            </span>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            opacity: staggerOpacity(localFrame, 1),
          }}
        >
        <div
          style={{
            fontSize: metricFs,
            fontWeight: 700,
            color: HOTLIST_THEME.growth,
            lineHeight: 1,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          +{weeklyVal || weeklyNum.toLocaleString()}
        </div>

        <div
          style={{
            marginTop: 6 * sy,
            fontSize: labelFs,
            color: HOTLIST_THEME.muted,
            lineHeight: 1,
          }}
        >
          本周涨星
        </div>

        <div
          style={{
            marginTop: 10 * sy,
            width: barW,
            height: c.rightCol.barH * sy,
            borderRadius: 5 * sy,
            background: HOTLIST_THEME.progressTrack,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: barFillW,
              height: "100%",
              borderRadius: 5 * sy,
              background: HOTLIST_THEME.progressFill,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 6 * sy,
            width: "100%",
            maxWidth: barW,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10 * sx,
            color: HOTLIST_THEME.mutedLight,
            overflow: "hidden",
          }}
        >
          <span>0</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span style={{ color: HOTLIST_THEME.growth, fontWeight: 600 }}>{pctLabel}</span>
        </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
