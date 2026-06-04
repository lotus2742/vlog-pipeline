import type { VlogFrame } from "../types";

export const formatRankLabel = (rank: string) => {
  const n = parseInt(rank, 10);
  if (Number.isFinite(n)) return `第 ${String(n).padStart(2, "0")} 名`;
  return rank ? `第 ${rank} 名` : "";
};

export const kpiMatch = (kpis: VlogFrame["kpis"], keyword: string) =>
  (kpis ?? []).find((k) => String(k.title || "").includes(keyword));

/** 是否为本周增速第一（第 1 名或本周新增等于榜单上限） */
export const isGrowthKing = (
  frame: VlogFrame,
  weeklyNum: number,
  maxWeekly: number,
): boolean => {
  if (frame.isGrowthKing === true) return true;
  const rankNum = parseInt(String(frame.subtitle || "").replace(/\D/g, ""), 10);
  if (rankNum === 1) return true;
  return weeklyNum > 0 && weeklyNum >= maxWeekly;
};

export const parseGrowthNumber = (num?: number, text?: string): number => {
  if (typeof num === "number" && num > 0) return num;
  const s = String(text ?? "").replace(/,/g, "").trim();
  const wan = s.match(/([\d.]+)\s*万/);
  if (wan) return Math.round(parseFloat(wan[1]) * 10000);
  const plain = s.match(/(\d+)/);
  return plain ? parseInt(plain[1], 10) : 0;
};

export const parseAuthor = (label: string) => {
  const raw = String(label || "").trim();
  const paren = raw.match(/^(.+?)（(.+)）$/);
  const name = paren ? paren[1].trim() : raw;
  const title = paren ? paren[2].trim() : "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  return { name, title, initials };
};

/** 将长文案按宽度拆行；maxLines ≤ 0 时不截断，展示全部内容 */
export const wrapTextLines = (text: string, maxCharsPerLine = 26, maxLines = 3): string[] => {
  const t = String(text || "").trim();
  if (!t) return [];
  const limit = maxLines > 0 ? maxLines : Number.POSITIVE_INFINITY;
  const lines: string[] = [];
  let rest = t;
  while (rest.length > 0 && lines.length < limit) {
    if (rest.length <= maxCharsPerLine) {
      lines.push(rest);
      break;
    }
    let cut = maxCharsPerLine;
    const slice = rest.slice(0, maxCharsPerLine + 1);
    const punct = Math.max(
      slice.lastIndexOf("，"),
      slice.lastIndexOf("。"),
      slice.lastIndexOf("、"),
      slice.lastIndexOf(" "),
    );
    if (punct > maxCharsPerLine * 0.45) cut = punct + 1;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest && Number.isFinite(limit) && lines.length >= limit) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[，。]$/, "")}…`;
  }
  return lines;
};
