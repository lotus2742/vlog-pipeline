/** 榜单视频固定浅色主题（对齐 optimized-slide-v4.svg） */
export const HOTLIST_THEME = {
  bg: "#ffffff",
  topBar: "#1e293b",
  topBarBtn: "#374151",
  topBarAccent: "#10b981",
  title: "#111827",
  body: "#374151",
  muted: "#6b7280",
  mutedLight: "#9ca3af",
  star: "#f59e0b",
  growth: "#10b981",
  rankBadge: "#f59e0b",
  footerBg: "#f8fafc",
  footerBorder: "#e5e7eb",
  footerText: "#4b5563",
  avatarBg: "#e5e7eb",
  avatarText: "#6b7280",
  progressTrack: "#e5e7eb",
  progressFill: "#10b981",
  captionBg: "rgba(30,41,59,0.88)",
} as const;

export const HOTLIST_TAG_PALETTE = [
  { bg: "#ede9fe", color: "#7c3aed" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#ccfbf1", color: "#0d9488" },
  { bg: "#fee2e2", color: "#b91c1c" },
] as const;

export const LANG_CHIP = { bg: "#ccfbf1", color: "#0d9488" } as const;

/** 总结表前三名序号：金 / 银 / 铜 */
export const HOTLIST_RANK_MEDAL = {
  gold: { bg: "#fef9c3", color: "#a16207", border: "#eab308" },
  silver: { bg: "#e2e8f0", color: "#334155", border: "#94a3b8" },
  bronze: { bg: "#ffedd5", color: "#c2410c", border: "#f97316" },
} as const;
