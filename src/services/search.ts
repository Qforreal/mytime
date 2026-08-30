/**
 * Search service for the learning-efficiency app.
 *
 * Crossref is queried directly because its public API supports browser CORS.
 * A Crossref record is scholarly metadata, not a guarantee that the work is
 * peer reviewed; the reliability note exposed on every result says so.
 */

export type SearchResultKind =
  | "learning-method"
  | "academic-work"
  | "reliable-search";

export type SourceReliability =
  | "curated-local"
  | "scholarly-metadata"
  | "official-index";

export type SearchNetworkStatus =
  | "success"
  | "skipped"
  | "timeout"
  | "network-error"
  | "service-error"
  | "invalid-response";

export interface SearchSourceMetadata {
  /** Human-readable source name shown in the UI. */
  name: string;
  /** Service or organization through which the result was obtained. */
  provider: string;
  reliability: SourceReliability;
  reliabilityNote: string;
  journal: string | null;
  publisher: string | null;
  doi: string | null;
  year: number | null;
  url: string | null;
}

export interface LearningSearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  description: string;
  authors: string[];
  source: SearchSourceMetadata;
  /** Present for an in-app learning method result. */
  methodId: string | null;
  /** Present for an external result that can be opened in a browser. */
  url: string | null;
  /** Crossref's unmodified work category, when supplied. */
  workType: string | null;
}

export interface LearningMethodDocument {
  id: string;
  title: string;
  aliases: readonly string[];
  summary: string;
  keywords: readonly string[];
}

export interface CrossrefSearchOutcome {
  status: SearchNetworkStatus;
  results: LearningSearchResult[];
  message: string | null;
  httpStatus: number | null;
}

export interface LearningSearchResponse {
  query: string;
  results: LearningSearchResult[];
  localCount: number;
  academicCount: number;
  reliableLinkCount: number;
  networkStatus: SearchNetworkStatus;
  message: string | null;
}

export type SearchFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface SearchOptions {
  signal?: AbortSignal;
  /** Crossref timeout. Defaults to 8 seconds. */
  timeoutMs?: number;
  /** Number of Crossref records requested, clamped to 1-20. */
  remoteLimit?: number;
  /** Adds official academic search links after direct results. Defaults to true. */
  includeReliableLinks?: boolean;
  /** Optional contact address recommended by Crossref's polite-pool policy. */
  contactEmail?: string;
  /** Injectable for tests or for a native-app network adapter. */
  fetchFn?: SearchFetch;
}

export const CROSSREF_API_URL = "https://api.crossref.org/works";

export const LOCAL_LEARNING_METHODS: readonly LearningMethodDocument[] = [
  {
    id: "feynman",
    title: "费曼学习法",
    aliases: ["费曼技巧", "Feynman Technique"],
    summary: "用自己的简单语言讲清知识，通过暴露理解缺口来完成真正掌握。",
    keywords: ["理解", "讲解", "复述", "知识漏洞", "输出学习"],
  },
  {
    id: "ebbinghaus",
    title: "艾宾浩斯遗忘曲线",
    aliases: ["艾宾浩斯", "遗忘曲线", "Ebbinghaus"],
    summary: "依据遗忘规律安排复习，在记忆即将衰退时及时巩固。",
    keywords: ["记忆", "复习", "遗忘", "背诵", "复习计划"],
  },
  {
    id: "active-recall",
    title: "主动回忆",
    aliases: ["检索练习", "Active Recall"],
    summary: "合上资料后主动提取答案，用测试代替重复阅读。",
    keywords: ["记忆", "自测", "提取", "闪卡", "考试"],
  },
  {
    id: "spaced-repetition",
    title: "间隔重复",
    aliases: ["间隔复习", "Spaced Repetition"],
    summary: "逐步拉长复习间隔，让知识以更低成本进入长期记忆。",
    keywords: ["记忆", "复习", "间隔", "闪卡", "长期记忆"],
  },
  {
    id: "pomodoro",
    title: "番茄工作法",
    aliases: ["番茄钟", "Pomodoro Technique"],
    summary: "用短时专注与规律休息组成循环，降低启动阻力并保持精力。",
    keywords: ["专注", "计时", "休息", "25分钟", "效率"],
  },
  {
    id: "time-blocking",
    title: "时间分块",
    aliases: ["时间块", "Time Blocking"],
    summary: "提前为任务预留明确时间段，把待办事项落实到日程。",
    keywords: ["计划", "日程", "时间安排", "专注", "学习计划"],
  },
  {
    id: "eisenhower-matrix",
    title: "四象限法",
    aliases: ["艾森豪威尔矩阵", "重要紧急矩阵", "Eisenhower Matrix"],
    summary: "按重要与紧急两个维度给任务排序，优先处理真正重要的事。",
    keywords: ["优先级", "重要", "紧急", "任务管理", "决策"],
  },
  {
    id: "gtd",
    title: "GTD",
    aliases: ["尽管去做", "Getting Things Done"],
    summary: "收集、理清、组织、回顾并执行任务，减少大脑的记忆负担。",
    keywords: ["任务管理", "收集", "整理", "执行", "待办"],
  },
  {
    id: "smart-goals",
    title: "SMART 目标",
    aliases: ["SMART原则", "SMART Goals"],
    summary: "把目标写成具体、可衡量、可实现、相关且有时限的行动。",
    keywords: ["目标", "计划", "衡量", "期限", "行动"],
  },
  {
    id: "task-breakdown",
    title: "任务拆解",
    aliases: ["目标拆解", "工作分解", "WBS"],
    summary: "把模糊的大任务拆成可立即执行、容易估时的小步骤。",
    keywords: ["目标", "步骤", "计划", "行动", "拖延", "作业"],
  },
];

const LOCAL_SOURCE_NOTE = "应用内整理的通用学习方法说明。";
const CROSSREF_SOURCE_NOTE =
  "Crossref 提供学术出版元数据；收录本身不代表内容已通过同行评议或获得质量背书。";

/** Searches the built-in method knowledge base and ranks Chinese queries. */
export function searchLocalLearningMethods(
  query: string,
  methods: readonly LearningMethodDocument[] = LOCAL_LEARNING_METHODS,
): LearningSearchResult[] {
  const cleanQuery = normalizeText(query);

  if (!cleanQuery) {
    return methods.map((method) => localMethodToResult(method));
  }

  const queryKey = compactSearchText(cleanQuery);
  const terms = extractSearchTerms(cleanQuery);

  return methods
    .map((method, index) => ({
      method,
      index,
      score: scoreMethod(method, queryKey, terms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => localMethodToResult(entry.method));
}

/**
 * Searches Crossref only. A caller-initiated abort rejects with AbortError;
 * timeout and connectivity failures are represented in the returned outcome.
 */
export async function searchCrossrefWorks(
  query: string,
  options: SearchOptions = {},
): Promise<CrossrefSearchOutcome> {
  const cleanQuery = normalizeText(query).slice(0, 300);
  if (!cleanQuery) {
    return {
      status: "skipped",
      results: [],
      message: null,
      httpStatus: null,
    };
  }

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  const fetchFn = options.fetchFn ?? globalThis.fetch?.bind(globalThis);
  if (!fetchFn) {
    return {
      status: "network-error",
      results: [],
      message: "当前运行环境不支持网络请求，已提供可靠资料检索入口。",
      httpStatus: null,
    };
  }

  const remoteLimit = clampInteger(options.remoteLimit ?? 8, 1, 20);
  const timeoutMs = clampInteger(options.timeoutMs ?? 8_000, 1, 30_000);
  const url = new URL(CROSSREF_API_URL);
  url.searchParams.set("query.bibliographic", cleanQuery);
  url.searchParams.set("rows", String(remoteLimit));
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("order", "desc");

  const contactEmail = options.contactEmail?.trim();
  if (contactEmail && isPlausibleEmail(contactEmail)) {
    url.searchParams.set("mailto", contactEmail);
  }

  const controller = new AbortController();
  let didTimeout = false;
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    // Do not add custom headers: keeping this a simple CORS request is more
    // reliable in browsers and Crossref already returns JSON.
    const response = await fetchFn(url, { signal: controller.signal });

    if (!response.ok) {
      return {
        status: "service-error",
        results: [],
        message: `Crossref 暂时不可用（HTTP ${response.status}），已提供可靠资料检索入口。`,
        httpStatus: response.status,
      };
    }

    const payload: unknown = await response.json();
    const items = getCrossrefItems(payload);
    if (!items) {
      return {
        status: "invalid-response",
        results: [],
        message: "Crossref 返回了无法识别的数据，已提供可靠资料检索入口。",
        httpStatus: response.status,
      };
    }

    return {
      status: "success",
      results: normalizeCrossrefItems(items),
      message: null,
      httpStatus: response.status,
    };
  } catch (error: unknown) {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    if (didTimeout) {
      return {
        status: "timeout",
        results: [],
        message: "学术资料搜索超时，已提供可靠资料检索入口。",
        httpStatus: null,
      };
    }

    if (isAbortError(error)) {
      throw createAbortError();
    }

    return {
      status: "network-error",
      results: [],
      message:
        "无法连接 Crossref，可能是网络不可用或浏览器限制了跨域请求；已提供可靠资料检索入口。",
      httpStatus: null,
    };
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

/** Main entry point: local methods, Crossref works, then trusted search links. */
export async function searchLearningResources(
  query: string,
  options: SearchOptions = {},
): Promise<LearningSearchResponse> {
  const cleanQuery = normalizeText(query);
  const localResults = searchLocalLearningMethods(cleanQuery);
  const crossref = await searchCrossrefWorks(cleanQuery, options);
  const reliableLinks =
    cleanQuery && options.includeReliableLinks !== false
      ? createReliableFallbackResults(cleanQuery)
      : [];

  return {
    query: cleanQuery,
    results: [...localResults, ...crossref.results, ...reliableLinks],
    localCount: localResults.length,
    academicCount: crossref.results.length,
    reliableLinkCount: reliableLinks.length,
    networkStatus: crossref.status,
    message: crossref.message,
  };
}

/**
 * Returns stable official/academic search destinations. These remain useful
 * when an API is unavailable and do not pretend to be individual papers.
 */
export function createReliableFallbackResults(
  query: string,
): LearningSearchResult[] {
  const cleanQuery = normalizeText(query).slice(0, 300);
  if (!cleanQuery) return [];

  const encodedQuery = encodeURIComponent(cleanQuery);
  const destinations = [
    {
      id: "crossref",
      title: `在 Crossref 查找“${truncate(cleanQuery, 40)}”`,
      description: "检索论文、图书和会议文献的 DOI 与出版信息。",
      provider: "Crossref",
      publisher: "Crossref",
      url: `https://search.crossref.org/?q=${encodedQuery}`,
      note: "Crossref 是 DOI 与学术出版元数据的官方基础设施。",
    },
    {
      id: "eric",
      title: `在 ERIC 查找“${truncate(cleanQuery, 40)}”`,
      description: "检索教育、教学与学习科学领域的研究资料。",
      provider: "ERIC",
      publisher: "美国教育科学研究院",
      url: `https://eric.ed.gov/?q=${encodedQuery}`,
      note: "ERIC 由美国教育科学研究院提供，是教育研究专业数据库。",
    },
    {
      id: "pubmed",
      title: `在 PubMed 查找“${truncate(cleanQuery, 40)}”`,
      description: "检索记忆、认知、睡眠与学习健康相关研究。",
      provider: "PubMed",
      publisher: "美国国家医学图书馆",
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodedQuery}`,
      note: "PubMed 由美国国家医学图书馆维护，适合查找生命科学与认知研究。",
    },
  ];

  return destinations.map((destination) => ({
    id: `reliable-search:${destination.id}`,
    kind: "reliable-search",
    title: destination.title,
    description: destination.description,
    authors: [],
    methodId: null,
    workType: null,
    url: destination.url,
    source: {
      name: destination.provider,
      provider: destination.provider,
      reliability: "official-index",
      reliabilityNote: destination.note,
      journal: null,
      publisher: destination.publisher,
      doi: null,
      year: null,
      url: destination.url,
    },
  }));
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function localMethodToResult(
  method: LearningMethodDocument,
): LearningSearchResult {
  return {
    id: `method:${method.id}`,
    kind: "learning-method",
    title: method.title,
    description: method.summary,
    authors: [],
    methodId: method.id,
    url: null,
    workType: null,
    source: {
      name: "学习方法知识库",
      provider: "本地知识库",
      reliability: "curated-local",
      reliabilityNote: LOCAL_SOURCE_NOTE,
      journal: null,
      publisher: null,
      doi: null,
      year: null,
      url: null,
    },
  };
}

function scoreMethod(
  method: LearningMethodDocument,
  queryKey: string,
  terms: readonly string[],
): number {
  const title = compactSearchText(method.title);
  const aliases = method.aliases.map(compactSearchText);
  const keywordText = compactSearchText(method.keywords.join(" "));
  const summary = compactSearchText(method.summary);
  const allText = `${title}${aliases.join("")}${keywordText}${summary}`;
  let score = 0;

  if (title === queryKey || aliases.includes(queryKey)) score += 160;
  else if (title.includes(queryKey)) score += 100;
  else if (aliases.some((alias) => alias.includes(queryKey))) score += 80;
  else if (allText.includes(queryKey)) score += 50;

  for (const term of terms) {
    if (!term) continue;
    if (title.includes(term)) score += 20;
    else if (aliases.some((alias) => alias.includes(term))) score += 16;
    else if (keywordText.includes(term)) score += 10;
    else if (summary.includes(term)) score += 5;
  }

  return score;
}

function extractSearchTerms(value: string): string[] {
  const pieces = value
    .toLowerCase()
    .match(/[\u3400-\u9fff]+|[a-z0-9]+/g) ?? [];
  const terms = new Set<string>();

  for (const piece of pieces) {
    const compact = compactSearchText(piece);
    if (!compact) continue;
    terms.add(compact);

    // Chinese queries normally have no spaces. Character bigrams allow a
    // query such as “如何提高记忆效率” to match the keyword “记忆”.
    if (/^[\u3400-\u9fff]+$/.test(compact) && compact.length > 2) {
      for (let index = 0; index < compact.length - 1; index += 1) {
        terms.add(compact.slice(index, index + 2));
      }
    }
  }

  return [...terms];
}

function normalizeCrossrefItems(items: readonly unknown[]): LearningSearchResult[] {
  const results: LearningSearchResult[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const result = normalizeCrossrefItem(item);
    if (!result) continue;

    const duplicateKey = result.source.doi
      ? `doi:${result.source.doi.toLowerCase()}`
      : `title:${compactSearchText(result.title)}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    results.push(result);
  }

  return results;
}

function normalizeCrossrefItem(item: unknown): LearningSearchResult | null {
  if (!isRecord(item)) return null;

  const title = cleanExternalText(firstString(item.title));
  if (!title) return null;

  const doi = cleanExternalText(readString(item.DOI)) || null;
  const journal = cleanExternalText(firstString(item["container-title"])) || null;
  const publisher = cleanExternalText(readString(item.publisher)) || null;
  const year = readPublicationYear(item);
  const authors = readAuthors(item.author);
  const workType = cleanExternalText(readString(item.type)) || null;
  const doiUrl = doi ? createDoiUrl(doi) : null;
  const suppliedUrl = safeHttpUrl(readString(item.URL));
  const url = doiUrl ?? suppliedUrl;
  const abstract = cleanExternalText(readString(item.abstract));
  const subjects = readStringArray(item.subject)
    .map(cleanExternalText)
    .filter(Boolean)
    .slice(0, 3);

  let description = abstract;
  if (!description && subjects.length > 0) {
    description = `主题：${subjects.join("、")}`;
  }
  if (!description) {
    const details = [journal, publisher, year ? String(year) : null].filter(
      (value): value is string => Boolean(value),
    );
    description = details.length > 0 ? details.join(" · ") : "学术出版资料";
  }

  const stableKey = doi?.toLowerCase() ?? `${title}|${year ?? ""}|${journal ?? ""}`;

  return {
    id: `crossref:${stableHash(stableKey)}`,
    kind: "academic-work",
    title: truncate(title, 300),
    description: truncate(description, 500),
    authors,
    methodId: null,
    url,
    workType,
    source: {
      name: journal ?? publisher ?? "Crossref 学术资料",
      provider: "Crossref",
      reliability: "scholarly-metadata",
      reliabilityNote: CROSSREF_SOURCE_NOTE,
      journal,
      publisher,
      doi,
      year,
      url,
    },
  };
}

function getCrossrefItems(payload: unknown): unknown[] | null {
  if (!isRecord(payload) || !isRecord(payload.message)) return null;
  return Array.isArray(payload.message.items) ? payload.message.items : null;
}

function readPublicationYear(item: Record<string, unknown>): number | null {
  const dateCandidates = [
    item["published-print"],
    item["published-online"],
    item.published,
    item.issued,
  ];

  for (const candidate of dateCandidates) {
    if (!isRecord(candidate) || !Array.isArray(candidate["date-parts"])) {
      continue;
    }
    const firstPart = candidate["date-parts"][0];
    if (!Array.isArray(firstPart)) continue;
    const year = Number(firstPart[0]);
    if (Number.isInteger(year) && year >= 1000 && year <= 3000) return year;
  }

  return null;
}

function readAuthors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((author) => {
      if (!isRecord(author)) return "";
      const literalName = cleanExternalText(readString(author.name));
      if (literalName) return literalName;

      const given = cleanExternalText(readString(author.given));
      const family = cleanExternalText(readString(author.family));
      return [given, family].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .slice(0, 8);
}

function firstString(value: unknown): string {
  return Array.isArray(value) ? readString(value[0]) : readString(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function compactSearchText(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\u3400-\u9fffa-z0-9]+/g, "");
}

function cleanExternalText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function createDoiUrl(doi: string): string {
  const encodedPath = doi
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://doi.org/${encodedPath}`;
}

function createAbortError(): Error {
  const error = new Error("搜索已取消");
  error.name = "AbortError";
  return error;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
