// STAGE 00 브리프 → STAGE 01~04용 제품 데이터셋 생성
// 설계 원칙: "검증된 근거는 고정, 대화 문장만 LLM이 생성"이라는 기존 STEP1~4 라이브 논의 원칙을 유지하되,
// 그 "고정 근거"를 정적 상수(mockData.js/GLUCARE-M) 대신 브리프별로 1회 생성한 데이터셋으로 교체한다.
// 실패 시 섹션별로 안전한 기본값(FALLBACK_*)으로 대체해 화면이 깨지지 않도록 한다.
import { callAgentLlm, type LlmEnv } from "./llm";
import { label } from "./brief_recommend";
import { fetchConsumerInsights, type NaverEnv } from "./consumer_insights";

export interface ConfirmedBrief {
  category?: string;
  lifecycle: string;
  condition: string[];
  ingredient?: string[];
  format?: string;
  reg?: string;
  channel?: string[];
  strategy?: string;
}

const SYSTEM_PROMPT =
  "JSON 생성 전용 엔진입니다. 유효한 JSON 객체 하나만 출력하세요. " +
  "코드펜스(```), 설명, 인사말 절대 금지. 숫자는 현실적 범위로, 한국어는 명사형으로.";

function briefDescription(brief: ConfirmedBrief): string {
  const parts: string[] = [];
  if (brief.category) parts.push(`카테고리: ${label("category", brief.category)}`);
  parts.push(`생애주기: ${label("lifecycle", brief.lifecycle)}`);
  parts.push(`건강이슈: ${brief.condition.map((c) => label("condition", c)).join("·")}`);
  if (brief.ingredient?.length) parts.push(`원료 선호: ${brief.ingredient.map((i) => label("ingredient", i)).join("·")}`);
  if (brief.format) parts.push(`제형: ${label("format", brief.format)}`);
  if (brief.channel?.length) parts.push(`유통 채널: ${brief.channel.map((c) => label("channel", c)).join("·")}`);
  if (brief.strategy) parts.push(`비즈 전략: ${label("strategy", brief.strategy)}`);
  return parts.join(" / ");
}

function extractJson(text: string): any {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("JSON 형식 아님");
  return JSON.parse(t.slice(start, end + 1));
}

async function callJsonLlm(env: LlmEnv, userPrompt: string, maxTokens: number): Promise<any> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];
  try {
    const raw = await callAgentLlm(env, messages, { maxTokens, timeoutMs: 25000 });
    return extractJson(raw);
  } catch (err) {
    // 1회 재시도
    try {
      const raw = await callAgentLlm(
        env,
        [...messages, { role: "user" as const, content: "오직 JSON만 출력하세요." }],
        { maxTokens, timeoutMs: 25000 }
      );
      return extractJson(raw);
    } catch {
      throw err;
    }
  }
}

// ---------- Call A1: product + market (context 포함) ----------
async function generatePartA1(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

아래 JSON 스키마를 채워 출력하세요. 숫자 자리에는 실제 숫자를, 문자 자리에는 실제 문자열을 넣으세요.

{
  "product": {
    "codename": "영문제품코드-1",
    "tagline": "제품 한 줄 슬로건",
    "target": "타깃 사용자 설명",
    "format": "제형 및 용량",
    "category": "카테고리명",
    "subcategory": "세부 카테고리",
    "regClass": "식약처 고시번호 형태",
    "targetPrice": 45000,
    "targetEvidenceStrength": 8.2,
    "positioningSpec": "핵심 스펙 한 줄",
    "positioningClaim": "기능성 클레임",
    "positioningRating": 4.3,
    "positioningChannel": "주 유통 채널"
  },
  "market": {
    "headerTitle": "시장 제목",
    "headerDesc": "시장 설명 한 줄",
    "domestic": { "size": 3500, "unit": "억원", "cagr": 12, "year": 2024, "cagrNote": "성장 전망" },
    "global": { "size": 15, "unit": "십억USD", "cagr": 8, "year": 2025 },
    "segments": [
      { "label": "세그먼트1", "share": 30, "growth": 18, "hot": true },
      { "label": "세그먼트2", "share": 25, "growth": 12, "hot": false },
      { "label": "세그먼트3", "share": 20, "growth": 10, "hot": false },
      { "label": "세그먼트4", "share": 15, "growth": 8, "hot": false },
      { "label": "세그먼트5", "share": 10, "growth": 6, "hot": false }
    ],
    "channels": [
      { "name": "채널1", "share": 40, "cac": "낮음" },
      { "name": "채널2", "share": 30, "cac": "중간" },
      { "name": "채널3", "share": 20, "cac": "높음" },
      { "name": "채널4", "share": 10, "cac": "중간" }
    ],
    "context": {
      "prevalence": "유병률과 타깃 인구 규모를 구체적 수치로",
      "unmet": "현재 제품의 미충족 니즈를 한 줄로",
      "policy": "관련 정부 정책이나 규제 동향을 한 줄로"
    }
  }
}

JSON만 출력하세요.`;
  return callJsonLlm(env, prompt, 800);
}

// ---------- Call A2: competitors + reviews + concept ----------
async function generatePartA2(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

이 브리프에 맞는 경쟁사 5개, 긍정·부정 리뷰 키워드 각 8개, LDA 토픽 3개를 아래 JSON 스키마로 생성하세요.

{
  "competitors": [
    { "brand": "가상브랜드A", "format": "제형", "key": "핵심스펙", "price": 42000, "size": "200ml×24", "claim": "클레임", "rating": 4.2, "reviews": 1200, "channel": "채널", "evidenceStrength": 6.5 },
    { "brand": "가상브랜드B", "format": "제형", "key": "핵심스펙", "price": 38000, "size": "200ml×24", "claim": "클레임", "rating": 4.0, "reviews": 800, "channel": "채널", "evidenceStrength": 5.8 },
    { "brand": "가상브랜드C", "format": "제형", "key": "핵심스펙", "price": 55000, "size": "200ml×24", "claim": "클레임", "rating": 4.4, "reviews": 2500, "channel": "채널", "evidenceStrength": 7.2 },
    { "brand": "가상브랜드D", "format": "제형", "key": "핵심스펙", "price": 47000, "size": "200ml×24", "claim": "클레임", "rating": 3.9, "reviews": 600, "channel": "채널", "evidenceStrength": 5.5 },
    { "brand": "가상브랜드E", "format": "제형", "key": "핵심스펙", "price": 52000, "size": "200ml×24", "claim": "클레임", "rating": 4.3, "reviews": 1800, "channel": "채널", "evidenceStrength": 6.8 }
  ],
  "reviews": {
    "positive": [
      { "t": "키워드1", "w": 40 }, { "t": "키워드2", "w": 35 }, { "t": "키워드3", "w": 30 }, { "t": "키워드4", "w": 28 },
      { "t": "키워드5", "w": 25 }, { "t": "키워드6", "w": 22 }, { "t": "키워드7", "w": 20 }, { "t": "키워드8", "w": 18 }
    ],
    "negative": [
      { "t": "키워드1", "w": 38 }, { "t": "키워드2", "w": 32 }, { "t": "키워드3", "w": 28 }, { "t": "키워드4", "w": 25 },
      { "t": "키워드5", "w": 22 }, { "t": "키워드6", "w": 20 }, { "t": "키워드7", "w": 18 }, { "t": "키워드8", "w": 15 }
    ]
  },
  "concept": {
    "sourceNote": "가상 소비자 리서치 기반",
    "sampleBadge": "AI 생성 예시",
    "topics": [
      { "id": "A", "name": "토픽명A", "docs": 4, "totalDocs": 12, "color": "us", "kws": [{ "t": "키워드", "w": 80 }, { "t": "키워드", "w": 65 }, { "t": "키워드", "w": 55 }, { "t": "키워드", "w": 45 }, { "t": "키워드", "w": 35 }] },
      { "id": "B", "name": "토픽명B", "docs": 4, "totalDocs": 12, "color": "avg", "kws": [{ "t": "키워드", "w": 75 }, { "t": "키워드", "w": 60 }, { "t": "키워드", "w": 50 }, { "t": "키워드", "w": 40 }, { "t": "키워드", "w": 30 }] },
      { "id": "C", "name": "토픽명C", "docs": 4, "totalDocs": 12, "color": "target", "kws": [{ "t": "키워드", "w": 70 }, { "t": "키워드", "w": 55 }, { "t": "키워드", "w": 45 }, { "t": "키워드", "w": 35 }, { "t": "키워드", "w": 25 }] }
    ],
    "painPoints": [
      { "label": "라벨1", "text": "페인포인트 설명" },
      { "label": "라벨2", "text": "페인포인트 설명" },
      { "label": "라벨3", "text": "페인포인트 설명" }
    ],
    "pod": "POD 한 문장",
    "podBold": ["강조어1", "강조어2"],
    "conclusion": "결론 한 문장",
    "conclusionBold": ["강조어1", "강조어2"]
  }
}

JSON만 출력하세요.`;
  return callJsonLlm(env, prompt, 1000);
}

// ---------- Call B: target (nutrition + evidence + ingredients) ----------
async function generatePartB(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `제품 브리프: ${briefDescription(brief)}

이 브리프에 맞는 영양 기준·근거·기능성 원료 데이터를 아래 JSON 스키마로 생성하세요. 실제 논문을 인용하지 말고 "AI 요약 근거"로 일반화해서 작성하세요(가짜 PMID 금지).

{
  "target": {
    "papersSearchNote": "근거 수집 방식 설명 한 줄 (예: AI 문헌 요약 기반, 실제 PMID 아님)",
    "papers": [5개 {"title":"영문 연구 제목(가상, 그럴듯하게)","journal":"저널명(가상)","year":연도(2018-2024),"n":"표본 설명","effect":"연구 결과 요약 한 줄","key":"핵심 한 줄"}],
    "ingredients": [6개 {"name":"원료명 (역할)","evidence":"A"|"B"|"C","dose":"1일 권장량","cost":비용레벨(1-5),"note":"근거 설명 한 줄"}],
    "nutritionTarget": { "calories": {"value":열량숫자,"unit":"kcal/팩","note":"설명"}, "carbRatio": {"value":비율,"unit":"%en","note":"설명"}, "proteinRatio": {"value":비율,"unit":"%en","note":"설명"}, "fatRatio": {"value":비율,"unit":"%en","note":"설명"}, "giIndex": {"value":GI값,"unit":"GI","note":"설명"}, "sodium": {"value":나트륨mg,"unit":"mg","note":"설명"} }
  },
  "nutritionCompare": [6개 {"label":"비교 항목명 (단위)","our":자사값,"avg":경쟁평균값,"target":권장값,"max":축최대값,"inverse":true또는false(낮을수록 좋은 지표면 true)}]
}

JSON만 출력하세요.`;
  return callJsonLlm(env, prompt, 1200);
}

// ---------- Call C: formula ingredients + cost ----------
async function generatePartC(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `제품 브리프: ${briefDescription(brief)}

이 브리프에 맞는 배합 원료 리스트와 원가 구조를 아래 JSON 스키마로 생성하세요.

{
  "formula": {
    "ingredients": [10-12개 {"id":"영문소문자코드(3-5자, 예: iso)","name":"원료명","amount":투입량(g, 0.05-30),"unit":"g","role":"탄수"|"단백"|"지방"|"미량"|"안정"|"관능"|"감미"|"담체","price":원료단가(원/g),"moq":최소발주량(kg),"yieldPct":수율(90-100)}] (반드시 role이 "담체"인 정제수/베이스 원료 1개 포함, 전체 amount 합이 대략 150-220 사이가 되도록),
    "flavors": [3-4개 향미 옵션 문자열],
    "formats": [3-4개 제형 옵션 문자열],
    "roleTargets": {"carb": 탄수목표량(g), "protein": 단백목표량(g), "fat": 지방목표량(g), "micro": 미량영양소목표량(g)},
    "giIngredientId": "role이 탄수인 원료 중 저GI 효과를 주도하는 원료의 id",
    "efficacyLabels": {"carb":"탄수 관련 기능성 클레임(짧게)","protein":"단백 관련 기능성 클레임","fat":"지방 관련 기능성 클레임","micro":"미량영양소 관련 기능성 클레임"},
    "efficacyTargets": {"carb":"목표 수치 설명 한 줄","protein":"목표 수치 설명 한 줄","fat":"목표 수치 설명 한 줄","micro":"목표 수치 설명 한 줄"}
  },
  "cost": {
    "packaging": {"liquidPack":포장단가,"outerBox":외박스단가,"shipperBox":배송박스단가,"label":라벨단가,"sterilization":살균비} (모두 원/박스 또는 원/팩, 100-700 범위),
    "overhead": {"labor":노무비,"utility":유틸리티,"qa":품질검사비,"depreciation":감가상각,"logistics":물류비} (모두 원/박스, 200-900 범위),
    "target": {"wholesaleMarkup":도매마크업(1.4-2.0),"retailMarkup":소매마크업(2.0-2.8),"msrp":목표소비자가(원)}
  }
}

id는 반드시 서로 다른 짧은 영문 코드여야 하고, giIngredientId는 ingredients 배열 안에 실제 존재하는 id와 정확히 일치해야 합니다. JSON만 출력하세요.`;
  return callJsonLlm(env, prompt, 1500);
}

// 관능 프로파일(6축)은 카테고리 불문 공통 구조를 사용 — role 기반이라 생성된 원료 구성에 자동으로 맞춰짐
const GENERIC_SENSORY_AXES = [
  { label: "단맛", parts: [{ role: "감미", divisor: 1, weight: 100 }] },
  { label: "향미", parts: [{ role: "관능", divisor: 1, weight: 100 }], flavorBonus: 15 },
  { label: "질감·바디감", parts: [{ role: "단백", divisor: 10, weight: 60 }, { role: "지방", divisor: 8, weight: 40 }] },
  { label: "목넘김", parts: [{ role: "지방", divisor: 8, weight: 100 }] },
  { label: "감미료 잔미", parts: [{ role: "감미", divisor: 1, weight: 100 }] },
  { label: "전체 밸런스", parts: [{ role: "안정", divisor: 1, weight: 50 }, { role: "미량", divisor: 1, weight: 50 }] },
];

function buildEfficacyClaims(formula: any) {
  const rt = formula.roleTargets || { carb: 25, protein: 12, fat: 6, micro: 1.2 };
  const labels = formula.efficacyLabels || {};
  const targets = formula.efficacyTargets || {};
  return [
    { label: labels.carb || "탄수화물 대사 관리", target: targets.carb || "저GI 원료 중심 설계", parts: [{ role: "탄수", divisor: rt.carb || 25, weight: 100 }] },
    { label: labels.protein || "근육·단백질 보충", target: targets.protein || "고품질 단백 공급", parts: [{ role: "단백", divisor: rt.protein || 12, weight: 100 }] },
    { label: labels.fat || "지질 관리", target: targets.fat || "불포화 지방 중심 설계", parts: [{ role: "지방", divisor: rt.fat || 6, weight: 100 }] },
    { label: labels.micro || "미량영양소 강화", target: targets.micro || "비타민·미네랄 보강", parts: [{ role: "미량", divisor: rt.micro || 1.2, weight: 100 }] },
  ];
}

export interface GeneratedDataset {
  product: any;
  market: any;
  competitors: any[];
  reviews: any;
  concept: any;
  target: any;
  nutritionCompare: any[];
  formula: any;
  cost: any;
  generated: true;
}

// 네이버 API 환경변수를 포함한 확장 env 타입
export type DatasetEnv = LlmEnv & Partial<NaverEnv>;

export async function generateProductDataset(env: DatasetEnv, brief: ConfirmedBrief): Promise<GeneratedDataset> {
  // 네이버 API 키가 있으면 실제 소비자 인사이트 병렬 수집
  const naverEnv: NaverEnv | null =
    env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET
      ? { NAVER_CLIENT_ID: env.NAVER_CLIENT_ID, NAVER_CLIENT_SECRET: env.NAVER_CLIENT_SECRET }
      : null;

  const [a1, a2, b, c, naverInsights] = await Promise.all([
    generatePartA1(env, brief).catch(() => ({})),
    generatePartA2(env, brief).catch(() => ({})),
    generatePartB(env, brief).catch(() => ({})),
    generatePartC(env, brief).catch(() => ({})),
    naverEnv
      ? fetchConsumerInsights(naverEnv, env, brief.condition).catch(() => null)
      : Promise.resolve(null),
  ]);
  // A1 + A2 병합
  const a = { ...a1, ...a2 };

  const ingredients = Array.isArray(c.formula?.ingredients) && c.formula.ingredients.length ? c.formula.ingredients : FALLBACK_INGREDIENTS;
  const giIngredientId = ingredients.some((i: any) => i.id === c.formula?.giIngredientId)
    ? c.formula.giIngredientId
    : (ingredients.find((i: any) => i.role === "탄수")?.id || ingredients[0]?.id);

  const formula = {
    servingSize: 200,
    servingsPerBox: 24,
    kcalPerServing: b.target?.nutritionTarget?.calories?.value || 200,
    giBaseline: 75,
    giIngredientId,
    giWeight: 45,
    ingredients,
    flavors: Array.isArray(c.formula?.flavors) && c.formula.flavors.length ? c.formula.flavors : ["기본", "무향"],
    formats: Array.isArray(c.formula?.formats) && c.formula.formats.length ? c.formula.formats : ["액상팩 200ml"],
    efficacyClaims: buildEfficacyClaims(c.formula || {}),
    sensoryAxes: GENERIC_SENSORY_AXES,
  };

  return {
    product: { ...FALLBACK_PRODUCT, ...a.product },
    market: {
      ...FALLBACK_MARKET,
      ...a.market,
      // context는 명시적으로 병합 (nested 객체는 spread로 안 덮임)
      context: {
        ...FALLBACK_MARKET.context,
        ...(a.market?.context ?? {}),
      },
    },
    competitors: Array.isArray(a.competitors) && a.competitors.length ? a.competitors : FALLBACK_COMPETITORS,
    // 네이버 실시간 데이터 우선 적용, 없으면 LLM 생성, 그것도 없으면 fallback
    reviews: naverInsights?.reviews ?? (a.reviews?.positive && a.reviews?.negative ? a.reviews : FALLBACK_REVIEWS),
    concept: naverInsights
      ? {
          sourceKey: naverInsights.sourceKey,
          sourceLabel: naverInsights.sourceLabel,
          sourceNote: naverInsights.sourceNote,
          sampleBadge: naverInsights.sampleBadge,
          trendSummary: naverInsights.trendSummary,
          shoppingSummary: naverInsights.shoppingSummary,
          topics: naverInsights.topics,
          painPoints: naverInsights.painPoints,
          pod: naverInsights.pod,
          podBold: naverInsights.podBold,
          conclusion: naverInsights.conclusion,
          conclusionBold: naverInsights.conclusionBold,
        }
      : a.concept?.topics
        ? { sourceKey: "ai_generated", sourceLabel: "AI 생성 · 미검증", ...a.concept }
        : FALLBACK_CONCEPT,
    target: b.target ? { ...b.target, papers: (b.target.papers || []).map((p: any) => ({ ...p, sourceKey: "ai_generated" })), ingredients: (b.target.ingredients || []).map((i: any) => ({ ...i, sourceKey: "ai_generated" })) } : FALLBACK_TARGET,
    nutritionCompare: Array.isArray(b.nutritionCompare) && b.nutritionCompare.length ? b.nutritionCompare : FALLBACK_NUTRITION_COMPARE,
    formula,
    cost: c.cost || FALLBACK_COST,
    generated: true,
  };
}

// ---------- 폴백 기본값 (LLM 실패 시에만 사용, 화면이 비지 않도록) ----------
const FALLBACK_PRODUCT = {
  codename: "PHYTO-X v0.1", tagline: "브리프 맞춤 기능성 제품", target: "맞춤 타깃",
  format: "제형 미정", category: "기능성 제품", subcategory: "-", regClass: "미정",
  targetPrice: 39000, targetEvidenceStrength: 8.0,
  positioningSpec: "AI 생성 실패 · 기본값", positioningClaim: "-", positioningRating: 4.5, positioningChannel: "온라인 D2C",
};
const FALLBACK_MARKET = {
  headerTitle: "브리프 맞춤 시장", headerDesc: "데이터 생성 실패 · 기본값 표시 중",
  domestic: { size: 3000, unit: "억원", cagr: 10, year: 2024, cagrNote: "추정치" },
  global: { size: 10, unit: "십억USD", cagr: 6, year: 2025 },
  segments: [{ label: "세그먼트 A", share: 30, growth: 12, hot: true }, { label: "세그먼트 B", share: 25, growth: 10 }, { label: "세그먼트 C", share: 20, growth: 8 }, { label: "세그먼트 D", share: 15, growth: 15, hot: true }, { label: "세그먼트 E", share: 10, growth: 6 }],
  channels: [{ name: "온라인 D2C", share: 40, cac: "중간" }, { name: "약국·H&B", share: 30, cac: "중간" }, { name: "병원", share: 20, cac: "낮음" }, { name: "마트", share: 10, cac: "높음" }],
  context: { prevalence: "추정 타깃 인구 규모 미확인", unmet: "AI 생성 실패로 기본값 표시 중", policy: "정책 동향 미확인" },
};
const FALLBACK_COMPETITORS = [1, 2, 3, 4, 5].map((n) => ({ brand: `경쟁사 ${n}`, format: "-", key: "-", price: 35000 + n * 2000, size: "-", claim: "-", rating: 4.2, reviews: 1000 * n, channel: "온라인", evidenceStrength: 5 + n * 0.3 }));
const FALLBACK_REVIEWS = {
  positive: [{ t: "만족", w: 30 }, { t: "효과 체감", w: 25 }, { t: "편의성", w: 20 }],
  negative: [{ t: "가격 부담", w: 25 }, { t: "맛 아쉬움", w: 20 }],
};
const FALLBACK_CONCEPT = {
  sourceKey: "ai_generated", sourceLabel: "AI 생성 · 미검증",
  sourceNote: "데이터 생성 실패 · 기본값 표시 중", sampleBadge: "기본값",
  topics: [{ id: "A", name: "토픽 A", docs: 1, totalDocs: 1, color: "us", kws: [{ t: "데이터 없음", w: 50 }] }],
  painPoints: [{ label: "-", text: "데이터 생성 실패" }],
  pod: "데이터 생성에 실패했습니다.", podBold: [],
  conclusion: "데이터 생성에 실패했습니다.", conclusionBold: [],
};
const FALLBACK_TARGET = {
  papersSearchNote: "AI 생성 실패 · 기본값", papers: [],
  ingredients: [{ name: "기본 원료", evidence: "C", dose: "-", cost: 3, sourceKey: "ai_generated", note: "AI 생성 실패" }],
  nutritionTarget: {
    calories: { value: 200, unit: "kcal", note: "-" }, carbRatio: { value: 45, unit: "%en", note: "-" },
    proteinRatio: { value: 20, unit: "%en", note: "-" }, fatRatio: { value: 35, unit: "%en", note: "-" },
    giIndex: { value: 40, unit: "GI", note: "-" }, sodium: { value: 200, unit: "mg", note: "-" },
  },
};
const FALLBACK_NUTRITION_COMPARE = [{ label: "주요 성분 (g)", our: 10, avg: 8, target: 10, max: 15 }];
const FALLBACK_INGREDIENTS = [
  { id: "base", name: "기본 탄수 원료", amount: 20, unit: "g", role: "탄수", price: 8, moq: 50, yieldPct: 98 },
  { id: "prot", name: "기본 단백 원료", amount: 10, unit: "g", role: "단백", price: 30, moq: 25, yieldPct: 97 },
  { id: "fat", name: "기본 지방 원료", amount: 6, unit: "g", role: "지방", price: 15, moq: 50, yieldPct: 99 },
  { id: "micro", name: "비타민·미네랄", amount: 1, unit: "g", role: "미량", price: 200, moq: 5, yieldPct: 98 },
  { id: "sw", name: "감미료", amount: 0.1, unit: "g", role: "감미", price: 500, moq: 5, yieldPct: 100 },
  { id: "flav", name: "향미", amount: 0.3, unit: "g", role: "관능", price: 300, moq: 20, yieldPct: 100 },
  { id: "wat", name: "정제수 (담체)", amount: 160, unit: "g", role: "담체", price: 0.5, moq: 1000, yieldPct: 100 },
];
const FALLBACK_COST = {
  packaging: { liquidPack: 240, outerBox: 620, shipperBox: 180, label: 120, sterilization: 480 },
  overhead: { labor: 780, utility: 340, qa: 320, depreciation: 420, logistics: 380 },
  target: { wholesaleMarkup: 1.7, retailMarkup: 2.3, msrp: 39000 },
};
