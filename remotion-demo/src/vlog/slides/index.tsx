import { THEME_TEXT } from "../constants";
import type { SlideSpec } from "../types";
import { DouyinTextSlide } from "./douyin-text";
import { BenchmarkSlide } from "./benchmark";
import { FailureModesSlide } from "./failure-modes";
import { BulletsSlide } from "./bullets";
import { CardsSlide } from "./cards";
import { ComparisonSlide } from "./comparison";
import { GenericSlide } from "./generic";
import { HookSlide } from "./hook";
import { KpiSlide } from "./kpi";
import { QuoteSlide } from "./quote";
import { TimelineSlide } from "./timeline";
export { SlideCaption } from "./caption";

export const SlideBody: React.FC<{ slide: SlideSpec; themeKey: string }> = ({ slide, themeKey }) => {
  const colors = THEME_TEXT[themeKey as keyof typeof THEME_TEXT] ?? THEME_TEXT.purple;
  const f = slide.frame;
  switch (slide.type) {
    case "hook": return <HookSlide frame={f} colors={colors} />;
    case "cards": return <CardsSlide frame={f} colors={colors} />;
    case "comparison": return <ComparisonSlide frame={f} colors={colors} />;
    case "douyin-text": return <DouyinTextSlide frame={f} colors={colors} captions={slide.captions} />;
    case "benchmark": return <BenchmarkSlide frame={f} colors={colors} />;
    case "failure-modes": return <FailureModesSlide frame={f} colors={colors} />;
    case "bullets": return <BulletsSlide frame={f} colors={colors} />;
    case "kpi": return <KpiSlide frame={f} colors={colors} />;
    case "quote": return <QuoteSlide frame={f} colors={colors} />;
    case "timeline": return <TimelineSlide frame={f} colors={colors} />;
    default: return <GenericSlide frame={f} colors={colors} />;
  }
};
