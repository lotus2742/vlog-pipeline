import { TopicWatermark } from "../VlogTopicWatermark";

type HotlistWatermarkProps = {
  topic?: string;
  isLight?: boolean;
};

/** 热榜背景水印（meta.topic 驱动） */
export const HotlistWatermark: React.FC<HotlistWatermarkProps> = ({ topic, isLight = true }) => (
  <TopicWatermark topic={topic} layout="hotlist" isLight={isLight} />
);
