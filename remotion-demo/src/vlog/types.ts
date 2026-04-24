export type VlogFrame = {
  id?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  script?: string;
  style?: string;
  cards?: Array<{ title?: string; label?: string; desc?: string; color?: string }>;
  left?: { label?: string; title?: string; color?: string; points?: string[] };
  right?: { label?: string; title?: string; color?: string; points?: string[] };
  insight?: string;
  items?: Array<{ title?: string; desc?: string }>;
  quote?: string;
  attribution?: string;
  value?: string;
  label?: string;
  unit?: string;
  footnote?: string;
  kpis?: Array<{ title?: string; value?: string; label?: string; unit?: string }>;
  list?: string[];
  trend_title?: string;
  trend_points?: string[];
};

export type SlideSpec = {
  id: string;
  type: string;
  durationInFrames: number;
  frame: VlogFrame;
  audioSrc?: string;
  captions?: Array<{ start: number; end: number; text: string }>;
  captionKeywords?: string[];
};

export type VlogMeta = {
  topic?: string;
  theme?: string;
  voice?: string;
  rate?: string;
  bgStyle?: string;
};

export type VlogFramesProps = {
  meta?: VlogMeta;
  slides: SlideSpec[];
};

export type ThemeText = { primary: string; muted: string; card: string };
