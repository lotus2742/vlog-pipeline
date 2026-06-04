import { AbsoluteFill } from "remotion";
import { HOTLIST_HEADER_DESIGN_H, useHotlistLayout } from "./layoutSpec";
import { HOTLIST_THEME } from "./theme";

type HotlistChromeProps = {
  topic?: string;
};

/** 顶部导航条 — 高度与内部元素随 headerH 同比缩放 */
export const HotlistChrome: React.FC<HotlistChromeProps> = ({ topic }) => {
  const { sx, headerH, width } = useHotlistLayout();
  const title = String(topic || "GitHub AI 项目周榜").trim();
  const hs = headerH / HOTLIST_HEADER_DESIGN_H;
  const btnH = Math.round(28 * hs);
  const btnY = (headerH - btnH) / 2;
  const titleFs = Math.min(15 * sx * hs, 20);
  const btnFs = 12 * hs;
  const plusFs = 16 * hs;
  const btnRadius = 6 * hs;
  const likeW = 68 * sx * hs;
  const starW = 58 * sx * hs;
  const plusW = 34 * sx * hs;
  const btnGap = 10 * sx;
  const edgePad = 24 * sx;
  const plusLeft = Math.max(edgePad, width - edgePad - plusW);
  const starLeft = Math.max(edgePad, plusLeft - btnGap - starW);
  const likeLeft = Math.max(edgePad + 160 * sx, starLeft - btnGap - likeW);
  const titleRight = Math.max(12 * sx, width - likeLeft + 12 * sx);

  return (
    <AbsoluteFill
      style={{
        height: headerH,
        bottom: "auto",
        background: HOTLIST_THEME.topBar,
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 24 * sx,
          top: 0,
          height: headerH,
          display: "flex",
          alignItems: "center",
          right: titleRight,
          fontSize: titleFs,
          fontWeight: 600,
          color: "#ffffff",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: likeLeft,
          top: btnY,
          width: likeW,
          height: btnH,
          borderRadius: btnRadius,
          background: HOTLIST_THEME.topBarBtn,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: btnFs,
          color: "#d1d5db",
          fontWeight: 500,
        }}
      >
        👍 2.3k
      </div>
      <div
        style={{
          position: "absolute",
          left: starLeft,
          top: btnY,
          width: starW,
          height: btnH,
          borderRadius: btnRadius,
          background: HOTLIST_THEME.topBarBtn,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: btnFs,
          color: "#d1d5db",
          fontWeight: 500,
        }}
      >
        ⭐ 收藏
      </div>
      <div
        style={{
          position: "absolute",
          left: plusLeft,
          top: btnY,
          width: plusW,
          height: btnH,
          borderRadius: btnRadius,
          background: HOTLIST_THEME.topBarAccent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: plusFs,
          fontWeight: 700,
          color: "#ffffff",
        }}
      >
        +
      </div>
    </AbsoluteFill>
  );
};
