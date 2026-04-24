import { AbsoluteFill } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { useEnter } from "../utils";

export const QuoteSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  return (
    <AbsoluteFill style={{ padding: "64px 80px", justifyContent: "center", opacity }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>{frame.title}</div>
      <div style={{ fontSize: 34, fontStyle: "italic", lineHeight: 1.55, color: colors.muted, borderLeft: "5px solid rgba(167,139,250,0.8)", paddingLeft: 28 }}>{frame.quote}</div>
      {frame.attribution ? <div style={{ marginTop: 20, fontSize: 24, color: colors.muted }}>— {frame.attribution}</div> : null}
    </AbsoluteFill>
  );
};
