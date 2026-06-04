import type { ThemeText } from "../types";

export const SlideInsight: React.FC<{
  text?: string;
  colors: ThemeText;
  /** 与上方内容的间距；默认 30，嵌入 flex 列时可传 0 */
  marginTop?: number;
  /** 内边距；默认 20px 28px */
  padding?: string;
  fontSize?: number;
}> = ({ text, colors, marginTop = 30, padding = "20px 28px", fontSize = 26 }) => {
  const insight = String(text || "").trim();
  if (!insight) {
    return null;
  }
  return (
    <div
      style={{
        marginTop,
        flexShrink: 0,
        fontSize,
        fontWeight: 700,
        color: colors.primary,
        padding,
        borderRadius: 14,
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.14)",
        lineHeight: 1.42,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {insight}
    </div>
  );
};
