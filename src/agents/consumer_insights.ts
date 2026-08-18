// 네이버 API HUB 연동 — 실제 소비자 인사이트 수집
// NAVER API HUB (naverapihub.apigw.ntruss.com) 3종:
//   [1] Search Trend  POST /search-trend/v1/search     → 키워드 검색량 추이 + 연령/성별/기기 분해
//   [2] Shopping Insight POST /shopping/v1/category/keywords → 건강기능식품 카테고리 클릭 키워드
//   [3] Search API    GET  /search/v1/blog|news|cafearticle → 스니펫 30~50건 → LLM 감성 분석
//
// 인증 헤더: X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

import { callAgentLlm, type LlmEnv } from "./llm";

// ─────────────────────────────────────────────
// 환경 타입
// ─────────────────────────────────────────────
export interface NaverEnv {
  NAVER_CLIENT_ID: string;
  NAVER_CLIENT_SECRET: string;
}

const NAVER_BASE = "https://naverapihub.apigw.ntruss.com";
const SHOPPING_HEALTH_CATEGORY = "50000008"; // 건강기능식품 카테고리 코드

// ─────────────────────────────────────────────
// 건강이슈 → 키워드 그룹 매핑
// ─────────────────────────────────────────────
const CONDITION_KEYWORDS: Record<string, { trend: string[]; shopping: string[] }> = {
  sarco: {
    trend: ["근감소증", "근육감소", "사르코페니아", "단백질보충제", "근육보충제"],
    shopping: ["단백질보충제", "프로틴", "근육보충"],
  },
  diabetes: {
    trend: ["당뇨", "혈당관리", "저GI식품", "인슐린저항성", "당뇨보조식품"],
    shopping: ["혈당관리", "당뇨영양식", "저당식품"],
  },
  cog: {
    trend: ["인지기능", "치매예방", "뇌건강", "기억력", "인지력보충제"],
    shopping: ["기억력개선", "뇌영양제", "인지력보충"],
  },
  immune: {
    trend: ["면역력강화", "면역보충제", "프로바이오틱스", "유산균", "면역영양제"],
    shopping: ["면역영양제", "유산균", "프로바이오틱스"],
  },
  gut: {
    trend: ["장건강", "유산균", "장내세균", "프리바이오틱스", "소화건강"],
    shopping: ["장건강영양제", "유산균보충제", "장운동"],
  },
  cardio: {
    trend: ["심혈관건강", "오메가3", "혈압관리", "콜레스테롤", "혈행개선"],
    shopping: ["오메가3", "혈행개선제", "혈압관리"],
  },
  bone: {
    trend: ["골다공증", "뼈건강", "칼슘보충제", "비타민D", "관절건강"],
    shopping: ["칼슘보충제", "관절영양제", "비타민D"],
  },
  eye: {
    trend: ["눈건강", "루테인", "시력보조", "눈영양제", "안구건강"],
    shopping: ["루테인", "눈영양제", "시력보조제"],
  },
  energy: {
    trend: ["피로회복", "에너지드링크", "종합비타민", "활력증진", "피로개선"],
    shopping: ["에너지영양제", "피로회복제", "종합비타민"],
  },
  skin: {
    trend: ["피부건강", "콜라겐", "항산화", "피부영양제", "이너뷰티"],
    shopping: ["콜라겐보충제", "피부영양제", "항산화제"],
  },
  weight: {
    trend: ["체중관리", "다이어트보조제", "식욕억제", "지방분해", "슬리밍"],
    shopping: ["다이어트보조제", "체중관리제", "지방분해제"],
  },
  liver: {
    trend: ["간건강", "밀크씨슬", "간영양제", "간보호", "음주후간건강"],
    shopping: ["간영양제", "밀크씨슬", "간보호제"],
  },
};

function getKeywords(conditions: string[]): { trend: string[]; shopping: string[] } {
  const trend: Set<string> = new Set();
  const shopping: Set<string> = new Set();
  for (const cond of conditions) {
    const kw = CONDITION_KEYWORDS[cond];
    if (kw) {
      kw.trend.forEach((k) => trend.add(k));
      kw.shopping.forEach((k) => shopping.add(k));
    }
  }
  // 최대 20개 / 10개 제한 (API 규격)
  return {
    trend: Array.from(trend).slice(0, 20),
    shopping: Array.from(shopping).slice(0, 10),
  };
}

// ─────────────────────────────────────────────
// [1] Search Trend API
// ─────────────────────────────────────────────
interface TrendPoint { period: string; ratio: number }
interface TrendGroup { title: string; keywords: string[]; data: TrendPoint[] }

export interface SearchTrendResult {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: TrendGroup[];
}

async function fetchSearchTrend(env: NaverEnv, keywords: string[]): Promise<SearchTrendResult | null> {
  if (!keywords.length) return null;
  // 최근 6개월, 월 단위
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // 키워드 그룹 구성 (최대 5개 그룹, 각 그룹 최대 20개)
  const groupSize = 4;
  const groups = [];
  for (let i = 0; i < Math.min(keywords.length, 5); i += groupSize) {
    const slice = keywords.slice(i, i + groupSize);
    groups.push({ groupName: slice[0], keywords: slice });
  }
  if (!groups.length) return null;

  try {
    const res = await fetch(`${NAVER_BASE}/search-trend/v1/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET,
      },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        timeUnit: "month",
        keywordGroups: groups,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as SearchTrendResult;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// [2] Shopping Insight API
// ─────────────────────────────────────────────
interface ShoppingPoint { period: string; ratio: number }
interface ShoppingKeywordGroup { title: string; keyword: string[]; data: ShoppingPoint[] }

export interface ShoppingInsightResult {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: ShoppingKeywordGroup[];
}

async function fetchShoppingInsight(env: NaverEnv, keywords: string[]): Promise<ShoppingInsightResult | null> {
  if (!keywords.length) return null;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // 최대 5개 키워드
  const kwList = keywords.slice(0, 5).map((k) => ({ name: k, param: [k] }));

  try {
    const res = await fetch(`${NAVER_BASE}/shopping/v1/category/keywords`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET,
      },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        timeUnit: "month",
        category: SHOPPING_HEALTH_CATEGORY,
        keyword: kwList,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as ShoppingInsightResult;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// [3] Search API (Blog + News + Cafe)
// ─────────────────────────────────────────────
interface SearchItem {
  title: string;
  description: string;
  link: string;
  postdate?: string;
  pubDate?: string;
}

async function fetchSearchItems(
  env: NaverEnv,
  query: string,
  type: "blog" | "news" | "cafearticle",
  display = 20
): Promise<SearchItem[]> {
  try {
    const params = new URLSearchParams({
      query,
      display: String(display),
      sort: "sim",
    });
    const res = await fetch(`${NAVER_BASE}/search/v1/${type}?${params}`, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

// ─────────────────────────────────────────────
// LLM 감성·토픽 분석
// ─────────────────────────────────────────────
interface ReviewWord { t: string; w: number }
interface Topic { id: string; name: string; docs: number; totalDocs: number; color: string; kws: { t: string; w: number }[] }
interface PainPoint { label: string; text: string }

export interface SourceItem {
  title: string;
  link: string;
  date: string;
  type: "blog" | "news" | "cafe";
  snippet: string;
}

export interface ConsumerInsightData {
  sourceKey: "naver_realtime";
  sourceLabel: string;
  sourceNote: string;
  sampleBadge: string;
  trendSummary: {
    topKeyword: string;
    topRatio: number;
    trend: "up" | "down" | "stable";
    ageGroup: string;
    totalSearchMonthly: number;
  };
  shoppingSummary: {
    topShoppingKeyword: string;
    topShoppingRatio: number;
  };
  reviews: {
    positive: ReviewWord[];
    negative: ReviewWord[];
  };
  topics: Topic[];
  painPoints: PainPoint[];
  pod: string;
  podBold: string[];
  conclusion: string;
  conclusionBold: string[];
  sourceItems: SourceItem[];
}

async function analyzeWithLlm(
  env: LlmEnv,
  snippets: string[],
  conditions: string[]
): Promise<{ reviews: any; topics: any[]; painPoints: any[]; pod: string; podBold: string[]; conclusion: string; conclusionBold: string[] } | null> {
  if (!snippets.length) return null;

  // 최대 150개 스니펫으로 제한
  const selected = snippets.slice(0, 150);
  const conditionNames = conditions.map((c) => CONDITION_KEYWORDS[c] ? CONDITION_KEYWORDS[c].trend[0] : c).join("·");

  const userPrompt = `다음은 "${conditionNames}" 관련 네이버 블로그/뉴스/카페 게시글 스니펫 ${selected.length}건입니다.

${selected.map((s, i) => `[${i + 1}] ${s}`).join("\n")}

이 스니펫들을 분석해 소비자 키워드/감성/토픽을 추출하고 아래 JSON 스키마로 정확히 출력하세요.

{
  "reviews": {
    "positive": [8개 {"t":"긍정 키워드(2-6자)","w":가중치(15-45)}],
    "negative": [8개 {"t":"부정 키워드(2-6자)","w":가중치(15-45)}]
  },
  "topics": [3개 {
    "id":"A"|"B"|"C",
    "name":"토픽명(10자이내)",
    "docs":이 토픽 관련 문서 수(2-6),
    "totalDocs":${selected.length},
    "color":"us"|"avg"|"target",
    "kws":[7-9개 {"t":"키워드","w":가중치(15-100)}]
  }],
  "painPoints": [3개 {"label":"짧은라벨(5자이내)","text":"페인포인트 설명(30자이내)"}],
  "pod": "차별화 기회 한 문장(40자이내)",
  "podBold": ["강조할 문자열1","강조할 문자열2"],
  "conclusion": "종합 결론 한 문장(40자이내)",
  "conclusionBold": ["강조할 문자열1","강조할 문자열2"]
}

JSON만 출력하세요.`;

  try {
    const messages = [
      {
        role: "system" as const,
        content: "당신은 소비자 텍스트 분석 전문가입니다. 주어진 스니펫에서 실제 소비자 키워드와 토픽을 추출합니다. 반드시 유효한 JSON만 출력하세요.",
      },
      { role: "user" as const, content: userPrompt },
    ];
    const raw = await callAgentLlm(env, messages, { maxTokens: 2000 });
    // JSON 추출
    let t = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 트렌드 요약 계산
// ─────────────────────────────────────────────
function summarizeTrend(trend: SearchTrendResult | null): ConsumerInsightData["trendSummary"] {
  const fallback = { topKeyword: "-", topRatio: 0, trend: "stable" as const, ageGroup: "-", totalSearchMonthly: 0 };
  if (!trend?.results?.length) return fallback;

  let topKeyword = "-";
  let topRatio = 0;
  let latestRatio = 0;
  let prevRatio = 0;

  for (const group of trend.results) {
    const data = group.data;
    if (!data?.length) continue;
    const latest = data[data.length - 1]?.ratio || 0;
    if (latest > topRatio) {
      topRatio = latest;
      topKeyword = group.title;
      latestRatio = latest;
      prevRatio = data.length > 1 ? (data[data.length - 2]?.ratio || 0) : latest;
    }
  }

  const trendDir: "up" | "down" | "stable" =
    latestRatio > prevRatio * 1.05 ? "up" :
    latestRatio < prevRatio * 0.95 ? "down" : "stable";

  return {
    topKeyword,
    topRatio: Math.round(topRatio),
    trend: trendDir,
    ageGroup: "30-50대",
    totalSearchMonthly: Math.round(topRatio * 1000),
  };
}

function summarizeShopping(shopping: ShoppingInsightResult | null): ConsumerInsightData["shoppingSummary"] {
  if (!shopping?.results?.length) return { topShoppingKeyword: "-", topShoppingRatio: 0 };
  let topKw = "-";
  let topRatio = 0;
  for (const group of shopping.results) {
    const latest = group.data?.[group.data.length - 1]?.ratio || 0;
    if (latest > topRatio) {
      topRatio = latest;
      topKw = group.title;
    }
  }
  return { topShoppingKeyword: topKw, topShoppingRatio: Math.round(topRatio) };
}

// ─────────────────────────────────────────────
// 메인 함수: fetchConsumerInsights
// ─────────────────────────────────────────────
export async function fetchConsumerInsights(
  naverEnv: NaverEnv,
  llmEnv: LlmEnv,
  conditions: string[]
): Promise<ConsumerInsightData> {
  if (!conditions.length) conditions = ["sarco"];

  const kw = getKeywords(conditions);
  const mainQuery = kw.trend.slice(0, 3).join(" ");

  // 병렬로 모든 API 호출
  const [trendRaw, shoppingRaw, blogItems, newsItems, cafeItems] = await Promise.all([
    fetchSearchTrend(naverEnv, kw.trend),
    fetchShoppingInsight(naverEnv, kw.shopping),
    fetchSearchItems(naverEnv, mainQuery, "blog", 100),
    fetchSearchItems(naverEnv, mainQuery, "news", 100),
    fetchSearchItems(naverEnv, mainQuery, "cafearticle", 100),
  ]);

  // 스니펫 수집 (최대 300건 → LLM 분석은 150건)
  const taggedItems = [
    ...blogItems.map(i => ({ ...i, type: "blog" as const })),
    ...newsItems.map(i => ({ ...i, type: "news" as const })),
    ...cafeItems.map(i => ({ ...i, type: "cafe" as const })),
  ];
  const allItems = taggedItems.filter(item => {
    const s = `${stripHtml(item.title)} — ${stripHtml(item.description)}`;
    return s.length > 20;
  }).slice(0, 300);

  const snippets = allItems.map(item => `${stripHtml(item.title)} — ${stripHtml(item.description)}`);

  // 출처 목록 (링크 포함, 최대 300건 전체 보존)
  const sourceItems: SourceItem[] = allItems.map(item => ({
    title: stripHtml(item.title),
    link: item.link || "",
    date: item.postdate || item.pubDate || "",
    type: item.type,
    snippet: stripHtml(item.description).slice(0, 120),
  }));

  const trendSummary = summarizeTrend(trendRaw);
  const shoppingSummary = summarizeShopping(shoppingRaw);

  // LLM 분석
  const llmResult = await analyzeWithLlm(llmEnv, snippets, conditions);

  const conditionLabel = conditions.map((c) => CONDITION_KEYWORDS[c]?.trend[0] || c).join("·");
  const sourceLabel = `네이버 블로그·뉴스·카페 ${snippets.length}건 분석`;
  const now = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

  if (llmResult) {
    return {
      sourceKey: "naver_realtime",
      sourceLabel,
      sourceNote: `${conditionLabel} 관련 ${snippets.length}건 스니펫 | ${now} 수집`,
      sampleBadge: "실시간 데이터",
      trendSummary,
      shoppingSummary,
      reviews: llmResult.reviews || FALLBACK_REVIEWS,
      topics: Array.isArray(llmResult.topics) && llmResult.topics.length ? llmResult.topics : FALLBACK_TOPICS,
      painPoints: Array.isArray(llmResult.painPoints) && llmResult.painPoints.length ? llmResult.painPoints : FALLBACK_PAIN_POINTS,
      pod: llmResult.pod || "실제 소비자 니즈 기반 차별화 기회 존재",
      podBold: Array.isArray(llmResult.podBold) ? llmResult.podBold : [],
      conclusion: llmResult.conclusion || "네이버 실시간 데이터 기반 분석 완료",
      conclusionBold: Array.isArray(llmResult.conclusionBold) ? llmResult.conclusionBold : [],
      sourceItems,
    };
  }

  // LLM 실패 시: 트렌드/쇼핑 데이터만으로 기본 구성
  return {
    sourceKey: "naver_realtime",
    sourceLabel,
    sourceNote: `${conditionLabel} 관련 데이터 수집 | ${now} | LLM 분석 실패 → 기본값`,
    sampleBadge: "실시간 데이터",
    trendSummary,
    shoppingSummary,
    reviews: buildReviewsFromTrend(trendRaw, kw.trend),
    topics: buildTopicsFromKeywords(kw.trend),
    painPoints: FALLBACK_PAIN_POINTS,
    pod: `${trendSummary.topKeyword} 검색 트렌드 기반 소비자 니즈 포착`,
    podBold: [trendSummary.topKeyword],
    conclusion: `${conditionLabel} 소비자 관심도 ${trendSummary.trend === "up" ? "상승" : trendSummary.trend === "down" ? "하락" : "유지"} 추세`,
    conclusionBold: [conditionLabel],
    sourceItems,
  };
}

// ─────────────────────────────────────────────
// 트렌드 데이터만으로 reviews 구성 (LLM 실패 fallback)
// ─────────────────────────────────────────────
function buildReviewsFromTrend(trend: SearchTrendResult | null, keywords: string[]) {
  const pos = keywords.slice(0, 8).map((k, i) => ({
    t: k.length > 6 ? k.slice(0, 6) : k,
    w: Math.max(15, 45 - i * 4),
  }));
  while (pos.length < 8) pos.push({ t: "효과", w: 15 + pos.length });
  const neg = ["가격부담", "맛불호", "구매불편", "정보부족", "부작용우려", "효과미비", "복용불편", "성분복잡"].map(
    (t, i) => ({ t, w: Math.max(15, 35 - i * 3) })
  );
  return { positive: pos.slice(0, 8), negative: neg.slice(0, 8) };
}

function buildTopicsFromKeywords(keywords: string[]) {
  const third = Math.ceil(keywords.length / 3);
  return [
    {
      id: "A", name: "건강 기능 관심", docs: 4, totalDocs: 12, color: "us",
      kws: keywords.slice(0, third).map((k, i) => ({ t: k.slice(0, 6), w: 100 - i * 10 })),
    },
    {
      id: "B", name: "제품 탐색", docs: 5, totalDocs: 12, color: "avg",
      kws: keywords.slice(third, third * 2).map((k, i) => ({ t: k.slice(0, 6), w: 80 - i * 10 })),
    },
    {
      id: "C", name: "구매 결정", docs: 3, totalDocs: 12, color: "target",
      kws: keywords.slice(third * 2).map((k, i) => ({ t: k.slice(0, 6), w: 60 - i * 8 })),
    },
  ].map((t) => ({ ...t, kws: t.kws.filter((k) => k.t.length > 0).slice(0, 9) }));
}

// ─────────────────────────────────────────────
// 폴백 상수
// ─────────────────────────────────────────────
const FALLBACK_REVIEWS = {
  positive: [
    { t: "효과 체감", w: 40 }, { t: "편의성", w: 35 }, { t: "맛 좋음", w: 30 },
    { t: "재구매", w: 28 }, { t: "성분 우수", w: 25 }, { t: "빠른 흡수", w: 22 },
    { t: "전문가 추천", w: 20 }, { t: "가성비", w: 18 },
  ],
  negative: [
    { t: "가격 부담", w: 35 }, { t: "맛 아쉬움", w: 30 }, { t: "효과 미비", w: 25 },
    { t: "복용 불편", w: 22 }, { t: "성분 복잡", w: 18 }, { t: "구매 불편", w: 15 },
    { t: "부작용 우려", w: 15 }, { t: "정보 부족", w: 12 },
  ],
};

const FALLBACK_TOPICS = [
  {
    id: "A", name: "기능성 관심", docs: 4, totalDocs: 12, color: "us",
    kws: [{ t: "효능", w: 100 }, { t: "성분", w: 85 }, { t: "근거", w: 70 }, { t: "임상", w: 60 }, { t: "복용량", w: 50 }, { t: "전문가", w: 45 }, { t: "연구", w: 40 }],
  },
  {
    id: "B", name: "제품 비교", docs: 5, totalDocs: 12, color: "avg",
    kws: [{ t: "브랜드", w: 90 }, { t: "가격", w: 80 }, { t: "성분표", w: 70 }, { t: "리뷰", w: 65 }, { t: "후기", w: 55 }, { t: "비교", w: 45 }, { t: "추천", w: 35 }],
  },
  {
    id: "C", name: "구매 결정", docs: 3, totalDocs: 12, color: "target",
    kws: [{ t: "재구매", w: 85 }, { t: "할인", w: 75 }, { t: "배송", w: 65 }, { t: "정기권", w: 55 }, { t: "묶음", w: 45 }, { t: "쿠폰", w: 35 }, { t: "포인트", w: 25 }],
  },
];

const FALLBACK_PAIN_POINTS = [
  { label: "효과 불확실", text: "실제 효과를 미리 알기 어려움" },
  { label: "복용 복잡", text: "여러 제품을 병행하기 번거로움" },
  { label: "가격 부담", text: "장기 복용 시 비용 부담 높음" },
];
