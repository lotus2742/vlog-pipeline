/** 抖音爆款文字镜（type=douyin-text） */
export type DouyinChecklistItem = {
  label: string;
  status?: string;
  done?: boolean;
};

export type DouyinProgressionStep = {
  top?: string;
  bottom?: string;
  /** 完整单行，如「单模型 = 聊天机器人」 */
  line?: string;
  /** 步骤前缀，如「第一步」 */
  prefix?: string;
};

export type DouyinEffectCompareSide = {
  title?: string;
  steps?: string[];
  timing?: string;
  result?: string;
};

export type DouyinRevealPhase = {
  footer?: string;
  finaleText?: string;
};

export type TieredBulletBlock = { label?: string; desc: string };
export type TieredBulletsContent = {
  conclusion: TieredBulletBlock;
  definition: TieredBulletBlock;
  /** 底栏小标题，默认「本质特征」 */
  traitsHeading?: string;
  traits: Array<{ title?: string; desc?: string }>;
};

/** bullets 单条：可选以代码编辑器样式展示伪代码（desc 可用 \\n 换行） */
export type BulletFrameItem = {
  title?: string;
  desc?: string;
  code?: boolean;
  /** 编辑器顶栏标签，如 react_loop.pseudo */
  codeLabel?: string;
};

/** 拓扑图节点（comparison + style=hub|mesh|tree） */
export type TopologyNode = {
  label?: string;
  title?: string;
  color?: string;
};

export type TopologyLevel = {
  label?: string;
  title?: string;
  items?: string[];
};

export type TopologySpec = {
  center?: TopologyNode;
  nodes?: TopologyNode[];
  levels?: TopologyLevel[];
};

/** 三栏横评卡（与 comparison + style=triple 配合） */
export type TriplePillar = {
  title: string;
  lines?: string[];
  /** 手机类比等副标题，显示在方案名下方 */
  foot?: string;
  /** 高亮该栏（如口播主线方案） */
  highlight?: boolean;
  /** 高亮角标文案；不设则仅边框高亮、不显示角标 */
  highlightLabel?: string;
};

/** 热榜总结表行（hook + style=hotlist-table） */
export type HotlistTableRow = {
  rank?: string;
  name?: string;
  weekly?: string;
  total?: string;
  lang?: string;
  weeklyGrowth?: number;
  weeklyGrowthMax?: number;
  /** 本周新入榜 */
  isNew?: boolean;
};

/** 基准/总结表列定义（与 type=benchmark 配合） */
export type BenchmarkTableColumn = {
  key: string;
  label: string;
  w?: string;
};

/** 基准测试对比表行（与 type=benchmark 配合） */
export type BenchmarkTableRow = {
  /** 高亮该行（如 MCP / 待验证场景） */
  highlight?: boolean;
  /** 指标对比模式 */
  scheme?: string;
  token?: string;
  monthlyCost?: string;
  successRate?: string;
  /** 总结表模式 */
  scene?: string;
  verdict?: string;
  note?: string;
};

/** MCP 失败场景条目（与 type=failure-modes 配合） */
export type FailureModeItem = {
  rank?: number;
  title: string;
  desc: string;
  /** high | medium | low */
  frequency?: "high" | "medium" | "low";
  frequencyLabel?: string;
};

/** 纵向时间轴 / 里程碑（与 type=timeline 配合） */
export type TimelineMilestone = {
  /** 左侧阶段标签，如「本月」「3个月」 */
  label?: string;
  title?: string;
  desc: string;
};

export type VlogFrame = {
  id?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  script?: string;
  /** 口播全文覆盖（优先于自动简略）；与 narration 二选一即可 */
  voiceScript?: string;
  /** 同 voiceScript，兼容命名 */
  narration?: string;
  style?: string;
  cards?: Array<{ title?: string; label?: string; desc?: string; color?: string }>;
  left?: { label?: string; title?: string; color?: string; points?: string[]; example?: string };
  right?: { label?: string; title?: string; color?: string; points?: string[]; example?: string };
  /** 多组左右对照（与左右栏大屏并存时优先渲染为多行 VS） */
  compareRows?: Array<{ left?: string; right?: string; center?: string }>;
  /** 三栏并列（如三款工具定价+定位）；与 type=comparison、style=triple 同用 */
  pillars?: TriplePillar[];
  /** 架构拓扑（comparison + style=hub|mesh|tree） */
  topology?: TopologySpec;
  insight?: string;
  /** 竖屏 3 秒金句（20–36 字），优先于 insight 展示 */
  hookLine?: string;
  /** 开篇角标，如「MCP 系列 · 第 3 期」 */
  kicker?: string;
  /** 开篇价格/数字对峙（hook 专用） */
  hookContrast?: {
    highValue: string;
    lowValue: string;
    highLabel?: string;
    lowLabel?: string;
    ratio?: string;
  };
  /** 榜单项目页底部口播摘要（白底卡片脚注区） */
  commentary?: string;
  /** 与 items 二选一；存在时优先渲染三层结构 */
  tieredBullets?: TieredBulletsContent;
  items?: BulletFrameItem[];
  quote?: string;
  attribution?: string;
  /** 人物肖像（相对 public/ 路径，如 portraits/garry-tan.jpg） */
  imageSrc?: string;
  value?: string;
  label?: string;
  unit?: string;
  footnote?: string;
  kpis?: Array<{ title?: string; value?: string; label?: string; unit?: string; highlight?: boolean; /** bars 版式：卡片内失败原因 */ note?: string }>;
  list?: string[];
  trend_title?: string;
  trend_points?: string[];
  /** 时间轴节点（type=timeline） */
  milestones?: TimelineMilestone[];
  /** Top N 榜单表格（hook + style=hotlist-table） */
  hotlistRows?: HotlistTableRow[];
  /** ScaleKit 等基准测试对比表（type=benchmark） */
  benchmarkRows?: BenchmarkTableRow[];
  /** 自定义表头；缺省为 Token/成本/成功率 四列 */
  benchmarkColumns?: BenchmarkTableColumn[];
  /** 表头角标，如 SCALEKIT BENCHMARK / CONCLUSION */
  benchmarkTag?: string;
  /** 典型失败场景（type=failure-modes） */
  failureModes?: FailureModeItem[];
  /** 本周新增 Star 数值（用于增速进度条） */
  weeklyGrowth?: number;
  /** 榜单内本周新增上限（第 1 名），用于进度条比例 */
  weeklyGrowthMax?: number;
  /** 是否显示「本周增速王」徽章（默认第 1 名或本周新增最高） */
  isGrowthKing?: boolean;
  /** 本周新入榜（项目名旁显示 NEW 标签） */
  isNew?: boolean;
  /** douyin-text：红/白强调色 */
  douyinColor?: "red" | "white";
  /** douyin-text checklist-demo 清单项 */
  checklistItems?: DouyinChecklistItem[];
  /** douyin-text 结尾大字（如「全程 0 人工」） */
  finaleText?: string;
  /** douyin-text progression 三步递进 */
  progressionSteps?: DouyinProgressionStep[];
  /** douyin-text protocol 图标 hand | mouth */
  protocolIcon?: "hand" | "mouth";
  /** douyin-text protocol 来源说明 */
  protocolMeta?: string;
  /** douyin-text protocol 等式文案 */
  equation?: string;
  /** douyin-text code-demo 代码行 */
  codeLines?: string[];
  /** douyin-text code-demo 高亮行号（1-based） */
  codeHighlightLine?: number;
  /** douyin-text code-demo 终端输出 */
  codeOutput?: string;
  /** douyin-text 代码窗顶栏标签 */
  codeLabel?: string;
  /** douyin-text code-demo 收尾大字行 */
  codeTitleLines?: string[];
  /** douyin-text checklist-demo 悬念模式（进度条停95%） */
  suspense?: boolean;
  /** douyin-text checklist-demo 悬念底部文案 */
  waitingText?: string;
  /** douyin-text stagger-lines 三行同时出现 */
  instant?: boolean;
  /** douyin-text effect-compare 左侧 */
  compareLeft?: DouyinEffectCompareSide;
  /** douyin-text effect-compare 右侧 */
  compareRight?: DouyinEffectCompareSide;
  /** douyin-text dual-compare 结果揭晓段 */
  reveal?: DouyinRevealPhase;
  /** douyin-text roadmap-flash 紧凑两行 */
  roadmapCompact?: boolean;
  /** douyin-text cta-split 左侧展示效果对比缩略 */
  ctaCompareSnapshot?: boolean;
  /** 顶部章节进度条（痛点 1/3 等） */
  sectionProgress?: SectionProgressSpec;
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

export type VideoType = "vlog" | "hotlist";

export type VlogAspectRatio = "16:9" | "9:16";

export type VlogMeta = {
  topic?: string;
  theme?: string;
  voice?: string;
  rate?: string;
  bgStyle?: string;
  /** 视频类型：hotlist=GitHub 周榜（16:9 白底卡片）；默认 vlog */
  videoType?: VideoType;
  /** 画布比例（hotlist 默认 16:9） */
  aspectRatio?: VlogAspectRatio;
  /** 系列分集（可选，用于 studio-preview 拆分 JSON） */
  seriesPart?: number;
  seriesTotal?: number;
  /** 右上角「点赞收藏加关注」动画；默认开启，设为 false 可关闭 */
  engagementCta?: boolean;
  /** 纯黑极简底（无装饰）；与 bgStyle=minimal 配合 */
  hideCaptions?: boolean;
};

export type VlogFramesProps = {
  meta?: VlogMeta;
  slides: SlideSpec[];
  /** 视频类型（与 meta.videoType 二选一，meta 优先） */
  videoType?: VideoType;
  /** 画布比例；9:16 为竖屏短视频常用（1080×1920）；hotlist 默认 16:9 */
  aspectRatio?: VlogAspectRatio;
};

/** 顶部章节进度条（如「痛点 1/3」） */
export type SectionProgressSpec = {
  label?: string;
  current: number;
  total: number;
};

export type ThemeText = { primary: string; muted: string; card: string };
