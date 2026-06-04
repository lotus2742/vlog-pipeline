import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useHotlistCaptionLayout } from "../../captionLayout";
import { growthBarRatio } from "../../hotlistLayout";
import type { HotlistTableRow, VlogFrame } from "../../types";
import { staggerOpacity, useEnter } from "../../utils";
import { useHotlistLayout } from "../layoutSpec";
import { HOTLIST_RANK_MEDAL, HOTLIST_THEME } from "../theme";
import { HotlistNewBadge } from "../HotlistNewBadge";

const parseRankNum = (rank: string) => parseInt(String(rank).replace(/\D/g, ""), 10) || 0;

const rankTone = (rank: string) => {
  const n = parseRankNum(rank);
  if (n === 1) return { ...HOTLIST_RANK_MEDAL.gold, medal: true as const };
  if (n === 2) return { ...HOTLIST_RANK_MEDAL.silver, medal: true as const };
  if (n === 3) return { ...HOTLIST_RANK_MEDAL.bronze, medal: true as const };
  return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0", medal: false as const };
};

const cols = [
  { key: "rank" as const, label: "#", w: "44px" },
  { key: "name" as const, label: "项目", w: "1.5fr" },
  { key: "weekly" as const, label: "本周新增", w: "0.95fr" },
  { key: "total" as const, label: "总 Star", w: "0.9fr" },
  { key: "lang" as const, label: "语言", w: "0.75fr" },
];

export const HotlistTableSlide: React.FC<{ frame: VlogFrame }> = ({ frame }) => {
  const { height: canvasH } = useVideoConfig();
  const { zoneH } = useHotlistCaptionLayout();
  const { headerH, sx, sy, padX } = useHotlistLayout();
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const rows = (Array.isArray(frame.hotlistRows) ? frame.hotlistRows : []) as HotlistTableRow[];
  const subtitle = String(frame.subtitle || "").trim();
  const footnote = String(frame.footnote || "").trim();
  const maxWeekly = Math.max(...rows.map((r) => Number(r.weeklyGrowth) || 0), 1);
  /** 宽屏 sx 很大，字号用上限避免表格撑破容器 */
  const fs = (px: number) => Math.round(px * Math.min(sx, 1.35));
  const titleFs = fs(26);
  const subtitleFs = fs(14);
  const headFs = fs(11);
  const rowNameFs = fs(13);
  const rowMetaFs = fs(12);
  const rowLangFs = fs(11);
  const footnoteFs = fs(12);
  const headPadY = 5;
  const rowPadX = Math.round(12 * Math.min(sx, 1.35));
  const barH = 3;
  const padTop = Math.round(12 * sy);
  const padBottom = Math.round(8 * sy);
  const titleBlockH =
    Math.round(titleFs * 1.12) +
    (subtitle ? Math.round(subtitleFs + 4 * sy) : 0) +
    Math.round(8 * sy);
  const footnoteBlockH = footnote ? Math.round(footnoteFs * 1.35 + 6 * sy) : 0;
  const tableHeadH = headPadY * 2 + headFs + 2;
  const contentH = canvasH - zoneH;
  const slideH = contentH - headerH;
  const tableAreaH = Math.max(0, slideH - padTop - padBottom - titleBlockH - footnoteBlockH);
  const rowCount = Math.max(rows.length, 1);
  const rowH = Math.max(24, Math.floor((tableAreaH - tableHeadH) / rowCount));
  const tableH = Math.min(tableHeadH + rowH * rowCount, tableAreaH);

  return (
    <AbsoluteFill
      style={{
        top: headerH,
        height: slideH,
        background: "transparent",
        padding: `${padTop}px ${padX}px ${padBottom}px`,
        boxSizing: "border-box",
        opacity,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flexShrink: 0, marginBottom: Math.round(10 * sy) }}>
        <div style={{ fontSize: titleFs, fontWeight: 900, color: HOTLIST_THEME.title, lineHeight: 1.12 }}>{frame.title}</div>
        {subtitle ? (
          <div style={{ fontSize: subtitleFs, color: HOTLIST_THEME.muted, marginTop: Math.round(5 * sy) }}>{subtitle}</div>
        ) : null}
      </div>

      <div
        style={{
          flexShrink: 0,
          height: tableH,
          maxHeight: tableAreaH,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${HOTLIST_THEME.footerBorder}`,
          background: HOTLIST_THEME.footerBg,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols.map((c) => c.w).join(" "),
            height: tableHeadH,
            boxSizing: "border-box",
            padding: `0 ${rowPadX}px`,
            alignItems: "center",
            background: HOTLIST_THEME.topBar,
            flexShrink: 0,
          }}
        >
          {cols.map((c) => (
            <div
              key={c.key}
              style={{
                fontSize: headFs,
                fontWeight: 700,
                color: "#e2e8f0",
                textAlign: c.key === "rank" ? "center" : "left",
                paddingLeft: c.key === "rank" ? 0 : Math.round(4 * sx),
              }}
            >
              {c.label}
            </div>
          ))}
        </div>

        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {rows.map((row, i) => {
            const rank = String(row.rank ?? i + 1).padStart(2, "0");
            const tone = rankTone(rank);
            const weeklyNum = Number(row.weeklyGrowth) || 0;
            const barPct = growthBarRatio(weeklyNum, maxWeekly);
            const barW = interpolate(localFrame, [8 + i * 2, 28 + i * 2], [0, barPct * 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  height: rowH,
                  boxSizing: "border-box",
                  display: "grid",
                  gridTemplateColumns: cols.map((c) => c.w).join(" "),
                  padding: `0 ${rowPadX}px`,
                  alignItems: "center",
                  background: i % 2 === 0 ? "#ffffff" : HOTLIST_THEME.footerBg,
                  borderBottom: i < rows.length - 1 ? `1px solid ${HOTLIST_THEME.footerBorder}` : undefined,
                  opacity: staggerOpacity(localFrame, Math.min(i, 8), 10),
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: tone.medal ? 34 : 30,
                      textAlign: "center",
                      fontSize: tone.medal ? fs(11) : fs(10),
                      fontWeight: 800,
                      padding: tone.medal ? "3px 7px" : "2px 6px",
                      borderRadius: 5,
                      background: tone.bg,
                      color: tone.color,
                      border: `1.5px solid ${tone.border}`,
                      boxShadow: tone.medal ? `0 1px 0 ${tone.border}40` : undefined,
                    }}
                  >
                    {rank}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: Math.round(6 * sx),
                    paddingLeft: Math.round(4 * sx),
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: rowNameFs,
                      fontWeight: 700,
                      color: HOTLIST_THEME.title,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {row.name}
                  </span>
                  {row.isNew ? <HotlistNewBadge scale={Math.min(sx, 1.35)} /> : null}
                </div>
                <div style={{ paddingLeft: 4, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                  <div style={{ fontSize: rowMetaFs, fontWeight: 700, color: HOTLIST_THEME.growth, lineHeight: 1.1 }}>{row.weekly}</div>
                  <div style={{ height: barH, borderRadius: 999, background: HOTLIST_THEME.progressTrack, overflow: "hidden" }}>
                    <div style={{ width: `${barW}%`, height: "100%", background: HOTLIST_THEME.progressFill, borderRadius: 999 }} />
                  </div>
                </div>
                <div style={{ fontSize: rowMetaFs, color: HOTLIST_THEME.muted, paddingLeft: Math.round(4 * sx), lineHeight: 1.2 }}>{row.total}</div>
                <div
                  style={{
                    fontSize: rowLangFs,
                    color: HOTLIST_THEME.muted,
                    paddingLeft: Math.round(4 * sx),
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {row.lang}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {footnote ? (
        <div
          style={{
            flexShrink: 0,
            marginTop: Math.round(8 * sy),
            fontSize: footnoteFs,
            fontWeight: 600,
            color: HOTLIST_THEME.growth,
            textAlign: "center",
            lineHeight: 1.35,
            opacity: staggerOpacity(localFrame, 9),
          }}
        >
          {footnote}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
