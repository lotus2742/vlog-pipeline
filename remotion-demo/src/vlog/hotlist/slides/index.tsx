import type { SlideSpec } from "../../types";
import { HotlistCoverSlide } from "./cover";
import { HotlistOutroSlide } from "./outro";
import { HotlistProjectSlide } from "./project";
import { HotlistTableSlide } from "./table";

export const HotlistSlideBody: React.FC<{ slide: SlideSpec }> = ({ slide }) => {
  const f = slide.frame;
  switch (slide.type) {
    case "hotlist-cover":
      return <HotlistCoverSlide frame={f} />;
    case "hotlist-project":
      return <HotlistProjectSlide frame={f} />;
    case "hotlist-outro":
      return <HotlistOutroSlide frame={f} />;
    case "hotlist-table":
      return <HotlistTableSlide frame={f} />;
    default:
      return <HotlistProjectSlide frame={f} />;
  }
};
