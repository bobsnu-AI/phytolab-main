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
    const raw = await callAgentLlm(env, messages, { maxTokens, timeoutMs: 15000 });
    return extractJson(raw);
  } catch (err) {
    // 1회 재시도 — 재시도는 8초로 단축해 CF Pages 30초 예산 초과 방지
    try {
      const raw = await callAgentLlm(
        env,
        [...messages, { role: "user" as const, content: "오직 JSON만 출력하세요." }],
        { maxTokens, timeoutMs: 8000 }
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

아래 스키마를 실제 값으로 채워 JSON 하나만 출력하세요.

{"product":{"codename":"영문코드-1","tagline":"슬로건","target":"타깃","format":"제형+용량","category":"카테고리","subcategory":"세부","regClass":"고시번호","targetPrice":45000,"targetEvidenceStrength":8.2,"positioningSpec":"핵심스펙","positioningClaim":"클레임","positioningRating":4.3,"positioningChannel":"채널"},"market":{"headerTitle":"시장제목","headerDesc":"설명","domestic":{"size":3500,"unit":"억원","cagr":12,"year":2024,"cagrNote":"전망"},"global":{"size":15,"unit":"십억USD","cagr":8,"year":2025},"segments":[{"label":"S1","share":30,"growth":18,"hot":true},{"label":"S2","share":25,"growth":12,"hot":false},{"label":"S3","share":20,"growth":10,"hot":false},{"label":"S4","share":15,"growth":8,"hot":false},{"label":"S5","share":10,"growth":6,"hot":false}],"channels":[{"name":"C1","share":40,"cac":"낮음"},{"name":"C2","share":30,"cac":"중간"},{"name":"C3","share":20,"cac":"높음"},{"name":"C4","share":10,"cac":"중간"}],"context":{"prevalence":"유병률 수치","unmet":"미충족 니즈","policy":"정책 동향"}}}`;
  return callJsonLlm(env, prompt, 900);
}

// ---------- Call A2: competitors + reviews (700t) ----------
async function generatePartA2(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

위 브리프와 동일 카테고리·타깃·건강이슈를 겨냥하는 한국 실제 경쟁제품 5개를 조사해 아래 JSON을 완성하세요.
규칙:
- brand: 실제 브랜드명 또는 제품라인명 (한국어, 20자 이내, "경쟁사N" 금지)
- format: 제형 (예: 액상팩·파우더·젤리·캡슐)
- key: 핵심 성분·함량 1줄 (예: "단백질 20g·류신 2.4g")
- claim: 실제 마케팅 클레임 (한국어, 30자 이내)
- price: 24팩 박스 기준 소비자가 (원, 정수)
- size: 1팩 용량 (예: "200ml×24")
- channel: 주 유통채널 (병원·약국·온라인·홈쇼핑 등)
- evidenceStrength: 임상근거 강도 1-10 (정수 또는 소수 1자리)
- reviews: 긍정·부정 소비자 리뷰 키워드 각 8개, t=한국어 키워드(10자 이내), w=가중치(정수)

{"competitors":[{"brand":"메디웰 뉴트리케어","format":"액상팩","key":"단백질 18g·오메가3 1g","claim":"근감소 예방 완전영양식","price":42000,"size":"200ml×24","rating":4.2,"reviews":1200,"channel":"병원·요양시설","evidenceStrength":6.5},{"brand":"뉴케어 당뇨식","format":"액상팩","key":"이소말툴로스 15g·식이섬유 5g","claim":"저GI 혈당관리 FSMP","price":38000,"size":"200ml×24","rating":4.0,"reviews":2800,"channel":"병원·온라인","evidenceStrength":7.1},{"brand":"그린비아 TF","format":"액상팩","key":"칼로리 200kcal·단백질 20g","claim":"튜브피딩·경관영양 전용","price":55000,"size":"200ml×24","rating":4.4,"reviews":950,"channel":"병원","evidenceStrength":7.8},{"brand":"노바소스 원","format":"파우더","key":"MCT 5g·분지사슬아미노산 3g","claim":"근력·활력 시니어 영양","price":47000,"size":"45g×24","rating":3.9,"reviews":420,"channel":"약국·온라인","evidenceStrength":5.5},{"brand":"엔슈어 라이프","format":"액상팩","key":"단백질 16g·비타민D 15μg","claim":"뼈·근육 고령자 완전영양","price":52000,"size":"220ml×24","rating":4.3,"reviews":3200,"channel":"약국·온라인","evidenceStrength":7.2}],"reviews":{"positive":[{"t":"맛이 좋아요","w":40},{"t":"포만감","w":35},{"t":"소화 잘됨","w":30},{"t":"혈당 안정","w":28},{"t":"편리한 포장","w":25},{"t":"근력 향상","w":22},{"t":"의사 추천","w":20},{"t":"냄새 없음","w":18}],"negative":[{"t":"가격 비쌈","w":38},{"t":"단맛 강함","w":32},{"t":"양 부족","w":28},{"t":"점도 걸쭉","w":25},{"t":"유통기한 짧음","w":22},{"t":"향 인공적","w":20},{"t":"거품 많음","w":18},{"t":"성분 복잡","w":15}]}}`;
  return callJsonLlm(env, prompt, 700);
}

// ---------- Call A3: concept (LDA topics + painPoints + pod + conclusion) (600t) ----------
async function generatePartA3(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

소비자 인식 분석(LDA 토픽 3개·페인포인트 3개·POD·결론)을 아래 스키마로 채워 JSON 하나만 출력하세요.

{"concept":{"sourceNote":"AI 생성","sampleBadge":"AI 생성 예시","topics":[{"id":"A","name":"토픽A","docs":4,"totalDocs":12,"color":"us","kws":[{"t":"k","w":80},{"t":"k","w":65},{"t":"k","w":55},{"t":"k","w":45},{"t":"k","w":35}]},{"id":"B","name":"토픽B","docs":4,"totalDocs":12,"color":"avg","kws":[{"t":"k","w":75},{"t":"k","w":60},{"t":"k","w":50},{"t":"k","w":40},{"t":"k","w":30}]},{"id":"C","name":"토픽C","docs":4,"totalDocs":12,"color":"target","kws":[{"t":"k","w":70},{"t":"k","w":55},{"t":"k","w":45},{"t":"k","w":35},{"t":"k","w":25}]}],"painPoints":[{"label":"라벨1","text":"설명"},{"label":"라벨2","text":"설명"},{"label":"라벨3","text":"설명"}],"pod":"POD문장","podBold":["강조1","강조2"],"conclusion":"결론문장","conclusionBold":["강조1","강조2"]}}`;
  return callJsonLlm(env, prompt, 600);
}

// ---------- Call B1: target.ingredients + nutritionTarget (핵심 원료·영양 목표) ----------
async function generatePartB1(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

기능성 원료 6개와 영양 목표치를 아래 스키마로 채워 JSON 하나만 출력하세요.

{"ingredients":[{"name":"원료1(역할)","evidence":"A","dose":"1일량","cost":3,"note":"임상근거 1줄"},{"name":"원료2(역할)","evidence":"B","dose":"1일량","cost":2,"note":"임상근거 1줄"},{"name":"원료3(역할)","evidence":"A","dose":"1일량","cost":4,"note":"임상근거 1줄"},{"name":"원료4(역할)","evidence":"B","dose":"1일량","cost":3,"note":"임상근거 1줄"},{"name":"원료5(역할)","evidence":"C","dose":"1일량","cost":2,"note":"임상근거 1줄"},{"name":"원료6(역할)","evidence":"A","dose":"1일량","cost":5,"note":"임상근거 1줄"}],"nutritionTarget":{"calories":{"value":200,"unit":"kcal/팩","note":"설명"},"carbRatio":{"value":40,"unit":"%en","note":"설명"},"proteinRatio":{"value":30,"unit":"%en","note":"설명"},"fatRatio":{"value":30,"unit":"%en","note":"설명"},"giIndex":{"value":45,"unit":"GI","note":"설명"},"sodium":{"value":150,"unit":"mg","note":"설명"}}}`;
  return callJsonLlm(env, prompt, 850);
}

// ---------- Call B2: papers(×5) + nutritionCompare(×6) ----------
async function generatePartB2(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

관련 임상 논문 5개와 영양 비교 지표 6개를 아래 스키마로 채워 JSON 하나만 출력하세요(가짜 PMID 금지, AI 요약 근거 사용).

{"papers":[{"title":"영문제목","journal":"저널","year":2022,"n":"n=120","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2021,"n":"n=80","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2020,"n":"n=60","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2023,"n":"n=150","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2019,"n":"n=90","effect":"결과","key":"핵심"}],"nutritionCompare":[{"label":"단백질(g)","our":12,"avg":8,"target":15,"max":20,"inverse":false},{"label":"칼로리(kcal)","our":200,"avg":250,"target":180,"max":300,"inverse":true},{"label":"GI지수","our":45,"avg":65,"target":40,"max":100,"inverse":true},{"label":"나트륨(mg)","our":150,"avg":200,"target":120,"max":300,"inverse":true},{"label":"류신(g)","our":2.4,"avg":1.2,"target":2.5,"max":4,"inverse":false},{"label":"비타민D(μg)","our":15,"avg":8,"target":20,"max":25,"inverse":false}]}`;
  return callJsonLlm(env, prompt, 850);
}

// ---------- Call C: formula ingredients + cost ----------
async function generatePartC(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

배합 원료(10-12개)와 원가 구조를 아래 스키마로 채워 JSON 하나만 출력하세요.
규칙:
- id: 3-5자 영문소문자 고유코드 (중복 금지)
- role: 반드시 아래 7개 중 하나만 사용 — "탄수" | "단백" | "지방" | "미량" | "안정" | "감미" | "관능" | "담체"
  (영문/혼용 절대 금지: protein→단백, fat→지방, carb→탄수, micro→미량, stabilizer→안정, sweetener→감미, flavor→관능, carrier→담체)
- "담체" role 1개 필수 (정제수), amount 합계 150-220g
- giIngredientId: ingredients 배열의 실제 id 값과 정확히 일치

{"formula":{"ingredients":[{"id":"wpi","name":"유청단백","amount":20,"unit":"g","role":"단백","price":12,"moq":25,"yieldPct":98},{"id":"iso","name":"이소말툴로스","amount":15,"unit":"g","role":"탄수","price":5,"moq":50,"yieldPct":99},{"id":"mct","name":"MCT오일","amount":5,"unit":"g","role":"지방","price":8,"moq":20,"yieldPct":99},{"id":"vdmx","name":"비타민D믹스","amount":0.05,"unit":"g","role":"미량","price":300,"moq":1,"yieldPct":95},{"id":"xgm","name":"잔탄검","amount":0.3,"unit":"g","role":"안정","price":15,"moq":5,"yieldPct":99},{"id":"flv","name":"바닐라향","amount":0.5,"unit":"g","role":"관능","price":80,"moq":2,"yieldPct":100},{"id":"suc","name":"수크랄로스","amount":0.02,"unit":"g","role":"감미","price":500,"moq":0.5,"yieldPct":100},{"id":"wtr","name":"정제수","amount":160,"unit":"g","role":"담체","price":0.01,"moq":1000,"yieldPct":100}],"flavors":["바닐라","무향","딸기"],"formats":["액상팩 200ml","파우치"],"roleTargets":{"carb":15,"protein":20,"fat":5,"micro":0.05},"giIngredientId":"iso","efficacyLabels":{"carb":"저GI 탄수화물","protein":"근육 단백질","fat":"에너지 지방","micro":"비타민 미네랄"},"efficacyTargets":{"carb":"혈당 지수 40 이하","protein":"류신 2.4g 이상","fat":"MCT 포함","micro":"비타민D 15μg"}},"cost":{"packaging":{"liquidPack":250,"outerBox":180,"shipperBox":120,"label":80,"sterilization":200},"overhead":{"labor":400,"utility":250,"qa":300,"depreciation":200,"logistics":350},"target":{"wholesaleMarkup":1.6,"retailMarkup":2.4,"msrp":45000}}}`;
  return callJsonLlm(env, prompt, 1100);
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

  const a1Err: string[] = [];
  const [a1, a2, a3, b1, b2, c, naverInsights] = await Promise.all([
    generatePartA1(env, brief).catch((e) => { a1Err.push(`A1:${e?.message?.slice(0,100)}`); return {}; }),
    generatePartA2(env, brief).catch((e) => { a1Err.push(`A2:${e?.message?.slice(0,100)}`); return {}; }),
    generatePartA3(env, brief).catch((e) => { a1Err.push(`A3:${e?.message?.slice(0,100)}`); return {}; }),
    generatePartB1(env, brief).catch((e) => { a1Err.push(`B1:${e?.message?.slice(0,100)}`); return {}; }),
    generatePartB2(env, brief).catch((e) => { a1Err.push(`B2:${e?.message?.slice(0,100)}`); return {}; }),
    generatePartC(env, brief).catch((e) => { a1Err.push(`C:${e?.message?.slice(0,100)}`); return {}; }),
    naverEnv
      ? fetchConsumerInsights(naverEnv, env, brief.condition).catch(() => null)
      : Promise.resolve(null),
  ]);
  // A1 + A2(competitors+reviews) + A3(concept) 병합
  const a = { ...a1, ...a2, concept: (a3 as any).concept || undefined };
  // B1(ingredients+nutritionTarget) + B2(papers+nutritionCompare) 병합
  const b = {
    target: (b1.ingredients || b1.nutritionTarget)
      ? {
          papersSearchNote: "AI 문헌 요약 기반",
          papers: b2.papers || [],
          ingredients: b1.ingredients || [],
          nutritionTarget: b1.nutritionTarget || {},
        }
      : null,
    nutritionCompare: b2.nutritionCompare || [],
  };
  if (a1Err.length) console.error("[dataset_generate] LLM errors:", a1Err.join(" | "));

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
        ? { sourceKey: "ai_generated", sourceLabel: "AI 생성 · 미검증", sourceNote: "AI 생성", sampleBadge: "AI 생성 예시", ...a.concept }
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
