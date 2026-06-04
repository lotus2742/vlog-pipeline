const MAX_LINES = 2;
const MAX_CHARS_PER_LINE = 18;

const truncateLine = (text: string): string => {
  const t = text.trim();
  if (t.length <= MAX_CHARS_PER_LINE) return t;
  return `${t.slice(0, MAX_CHARS_PER_LINE - 1)}…`;
};

const wrapLongLine = (text: string, maxLines: number): string[] => {
  const chars = [...text.trim()];
  const lines: string[] = [];
  let buf = "";
  for (const ch of chars) {
    const next = buf + ch;
    if (next.length > MAX_CHARS_PER_LINE && buf) {
      lines.push(buf);
      buf = ch;
      if (lines.length >= maxLines) break;
    } else {
      buf = next;
    }
  }
  if (lines.length < maxLines && buf) lines.push(buf);
  if (lines.length > maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = truncateLine(last);
    return lines.slice(0, maxLines);
  }
  return lines.map(truncateLine);
};

/** 从 JSON meta.topic 拆成 1–2 行水印文案 */
export const formatTopicWatermarkLines = (topic?: string): string[] => {
  const raw = String(topic ?? "").trim();
  if (!raw) return ["vlog-pipeline"];

  const bySep = raw
    .split(/\s*[·•｜|—–\-]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySep.length >= 2) {
    return bySep.slice(0, MAX_LINES).map(truncateLine);
  }

  const byColon = raw.split(/[：:]/).map((s) => s.trim()).filter(Boolean);
  if (byColon.length >= 2 && byColon[0].length <= MAX_CHARS_PER_LINE + 2) {
    return [truncateLine(byColon[0]), truncateLine(byColon.slice(1).join("："))].slice(0, MAX_LINES);
  }

  if (raw.length <= MAX_CHARS_PER_LINE) return [raw];
  return wrapLongLine(raw, MAX_LINES);
};

export type TopicWatermarkMetrics = {
  lines: string[];
  primarySize: number;
  secondarySize: number;
  fillOpacity: number;
};

export const buildTopicWatermarkMetrics = (
  topic: string | undefined,
  scale = 1,
): TopicWatermarkMetrics => {
  const lines = formatTopicWatermarkLines(topic);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const totalChars = lines.join("").length;

  let primarySize = 64 * scale;
  let secondarySize = 48 * scale;
  if (longest > 12) {
    primarySize *= 0.9;
    secondarySize *= 0.9;
  }
  if (longest > 16) {
    primarySize *= 0.82;
    secondarySize *= 0.82;
  }
  if (totalChars > 28) {
    primarySize *= 0.88;
    secondarySize *= 0.88;
  }

  const fillOpacity =
    totalChars > 30 ? 0.032 : totalChars > 20 ? 0.038 : lines.length > 1 ? 0.042 : 0.048;

  return {
    lines,
    primarySize,
    secondarySize,
    fillOpacity,
  };
};

/** 与画面对角线平行的旋转角（左下 → 右上） */
export const diagonalWatermarkRotation = (width: number, height: number): number =>
  -(Math.atan2(height, width) * 180) / Math.PI;
