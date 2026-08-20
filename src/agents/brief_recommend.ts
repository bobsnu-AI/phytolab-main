// STAGE 00 · Brief 추천 엔진
// 설계 원칙:
//  - "무엇을 추천할지"는 규칙 테이블이 결정 (안정적·일관적·무료)
//  - "왜 그렇게 추천하는지 이유"는 담당 Agent 페르소나로 LLM이 실시간 생성
//  - LLM 실패 시 fallback 이유 문장으로 즉시 대체
//
// 취급 제품군: 차류 / 두유류 / 생식 / 프로틴바 / 프로틴쉐이크 / 특수의료용도식품
import { AGENT_PERSONAS, type AgentId } from "./personas";
import { callAgentLlm, type LlmEnv } from "./llm";

export type RecAxis = "productType" | "ingredient" | "reg" | "channel" | "strategy";

interface AxisRule {
  productType: string;
  ingredient: string[];
  reg: string;
  channel: string[];
  strategy: string;
}

// 각 추천 축 담당 Agent (brief.js axis.lead와 동기화)
export const REC_AXIS_AGENT: Record<RecAxis, AgentId> = {
  productType: "mara",
  ingredient:  "rena",
  reg:         "rega",
  channel:     "mara",
  strategy:    "finn",
};

// 옵션 라벨(한국어) — LLM 프롬프트 + fallback 문장 + dataset_generate.ts 재사용
export const LABELS: Record<string, Record<string, string>> = {
  productType: {
    tea:          "차류",
    soymilk:      "두유류",
    rawfood:      "생식",
    proteinbar:   "프로틴바",
    proteinshake: "프로틴쉐이크",
    fsmp:         "특수의료용도식품(FSMP)",
  },
  // 내부 매핑용 (LLM 프롬프트에서 참조)
  category: {
    fsmp: "특수의료용도식품", hfunc: "건강기능식품", senior: "고령친화식품",
    personal: "개인맞춤형식품", general: "일반식품(기능성표시)", sports: "스포츠·퍼포먼스",
    meal: "간편대체식(HMR)", infant: "영유아·특수조제",
  },
  lifecycle: {
    infant: "영유아", child: "아동·청소년", adult: "성인", preg: "임산·수유부",
    middle: "중년", senior: "시니어", super: "초고령", all: "전 연령",
  },
  condition: {
    metabolic: "대사(당뇨·비만)", sarco: "근감소증", cog: "인지(치매·MCI)", immune: "면역",
    gut: "장 건강", cardio: "심혈관", bone: "뼈·관절", renal: "신장",
    cancer: "암 환자 영양", dysph: "연하곤란", sleep: "수면·스트레스",
    beauty: "이너뷰티", energy: "에너지·피로", weight: "체중 관리",
  },
  ingredient: {
    plant: "식물성(Plant-based)", ferment: "발효", herbal: "허브·식물추출", marine: "해양",
    dairy: "유청·유단백", grain: "곡물·두류", syn: "합성·정밀영양", func: "기능성 원료",
  },
  reg: {
    fsmp: "FSMP 표준제조기준", "hfunc-n": "건기식 고시형",
    label: "기능성표시 일반식품", regular: "일반식품",
  },
  channel: {
    hospital: "병원·의료기관", nursing: "요양·복지시설", d2c: "온라인 D2C", phar: "약국·H&B",
    mart: "대형마트·이커머스", conv: "편의점", export: "수출", corp: "기업 복지·B2B2C",
  },
  strategy: {
    premium: "프리미엄", mass: "매스마켓", subs: "정기 구독",
    value: "가치소비", reim: "급여·수가 진입", custom: "완전 맞춤형",
  },
};

// productType → 내부 category / format / reg 매핑 (dataset_generate.ts에서도 사용)
export const PRODUCT_TYPE_META: Record<string, { category: string; format: string; reg: string }> = {
  tea:          { category: "general", format: "liquid",  reg: "regular" },
  soymilk:      { category: "general", format: "liquid",  reg: "regular" },
  rawfood:      { category: "general", format: "powder",  reg: "regular" },
  proteinbar:   { category: "sports",  format: "bar",     reg: "regular" },
  proteinshake: { category: "sports",  format: "powder",  reg: "regular" },
  fsmp:         { category: "fsmp",    format: "liquid",  reg: "fsmp"    },
};

export const CATEGORY_DEFAULT_REG: Record<string, string> = {
  fsmp:     "fsmp",
  hfunc:    "hfunc-n",
  senior:   "regular",
  personal: "hfunc-n",
  general:  "regular",
  sports:   "regular",
  meal:     "regular",
  infant:   "fsmp",
};

export function label(axis: string, id: string): string {
  return LABELS[axis]?.[id] || id;
}

function dedupCap<T>(arr: T[], cap: number): T[] {
  return Array.from(new Set(arr)).slice(0, cap);
}

// ---------- 규칙 테이블 1: condition 기반 ingredient 추천 ----------
const CONDITION_INGREDIENT: Record<string, string[]> = {
  metabolic: ["dairy", "plant", "syn"],
  sarco:     ["dairy", "plant", "syn"],
  cog:       ["herbal", "marine", "func"],
  immune:    ["herbal", "func", "plant"],
  gut:       ["ferment", "plant", "grain"],
  cardio:    ["plant", "marine", "func"],
  bone:      ["dairy", "plant", "func"],
  renal:     ["plant", "syn", "grain"],
  cancer:    ["dairy", "syn", "plant"],
  dysph:     ["dairy", "plant", "grain"],
  sleep:     ["herbal", "func", "plant"],
  beauty:    ["marine", "ferment", "func"],
  energy:    ["syn", "herbal", "func"],
  weight:    ["plant", "grain", "ferment"],
};

// ---------- 규칙 테이블 2: productType 기본 추천 ----------
const PRODUCT_TYPE_DEFAULTS: Record<string, AxisRule> = {
  tea:          { productType: "tea",          ingredient: ["herbal","plant","func"],   reg: "regular", channel: ["d2c","conv"],          strategy: "subs"    },
  soymilk:      { productType: "soymilk",      ingredient: ["plant","grain","ferment"], reg: "regular", channel: ["mart","d2c"],           strategy: "mass"    },
  rawfood:      { productType: "rawfood",       ingredient: ["plant","grain","ferment"], reg: "regular", channel: ["d2c","mart"],           strategy: "premium" },
  proteinbar:   { productType: "proteinbar",    ingredient: ["dairy","plant","grain"],   reg: "regular", channel: ["conv","mart","d2c"],    strategy: "mass"    },
  proteinshake: { productType: "proteinshake",  ingredient: ["dairy","plant","syn"],     reg: "regular", channel: ["d2c","mart"],           strategy: "subs"    },
  fsmp:         { productType: "fsmp",          ingredient: ["dairy","plant","syn"],     reg: "fsmp",    channel: ["hospital","nursing"],   strategy: "reim"    },
};

// ---------- 규칙 테이블 3: condition → productType 최적 추천 ----------
const CONDITION_PRODUCT_TYPE: Record<string, string> = {
  metabolic: "fsmp",
  sarco:     "proteinshake",
  cog:       "tea",
  immune:    "tea",
  gut:       "soymilk",
  cardio:    "tea",
  bone:      "proteinshake",
  renal:     "fsmp",
  cancer:    "fsmp",
  dysph:     "fsmp",
  sleep:     "tea",
  beauty:    "soymilk",
  energy:    "proteinshake",
  weight:    "rawfood",
};

// ---------- 규칙 테이블 4: lifecycle 보정 ----------
interface LifecycleAdj {
  productType?: string;
  channel?: string[];
  strategy?: string;
}
const LIFECYCLE_ADJUST: Record<string, LifecycleAdj> = {
  infant: { productType: "fsmp",  channel: ["phar", "hospital"] },
  child:  {},
  adult:  {},
  preg:   { productType: "fsmp",  channel: ["hospital", "phar"] },
  middle: {},
  senior: { channel: ["nursing", "hospital", "d2c"] },
  super:  { productType: "fsmp",  channel: ["nursing"] },
  all:    {},
};

export function computeRuleRecommendation(
  lifecycle: string,
  condition: string[],
  selectedProductType?: string
): AxisRule {
  const primary = condition[0] || "metabolic";

  // productType: 사용자가 이미 선택했으면 그대로, 아니면 condition → 추천
  const rawProductType = selectedProductType || CONDITION_PRODUCT_TYPE[primary] || "proteinshake";
  const adj = LIFECYCLE_ADJUST[lifecycle] || {};
  const finalProductType = adj.productType || rawProductType;

  const base = PRODUCT_TYPE_DEFAULTS[finalProductType] || PRODUCT_TYPE_DEFAULTS.proteinshake;

  // ingredient: condition 여러 개 합산 후 상위 3개
  const mergedIngredients = dedupCap(
    condition.flatMap((c) => CONDITION_INGREDIENT[c] || []),
    3
  );
  const finalIngredient = mergedIngredients.length ? mergedIngredients : base.ingredient;

  // reg: productType이 fsmp면 fsmp, 나머지는 condition 기반 reg
  const finalReg = finalProductType === "fsmp" ? "fsmp" : base.reg;

  return {
    productType: finalProductType,
    ingredient:  finalIngredient,
    reg:         finalReg,
    channel:     dedupCap([...(adj.channel || []), ...base.channel], 3),
    strategy:    adj.strategy || base.strategy,
  };
}

// ---------- Fallback 이유 문장 ----------
export function buildFallbackReason(
  axis: RecAxis,
  lifecycle: string,
  condition: string[],
  rec: AxisRule
): string {
  const lifeL = label("lifecycle", lifecycle);
  const condL = condition.map((c) => label("condition", c)).join("·");
  switch (axis) {
    case "productType":
      return `${lifeL} × ${condL} 조합에는 ${label("productType", rec.productType)} 제품군이 시장·규제 적합도 측면에서 가장 알맞습니다.`;
    case "ingredient":
      return `${condL} 이슈 대응에는 ${rec.ingredient.map((i) => label("ingredient", i)).join("·")} 원료 조합이 배합 안정성과 근거 확보에 유리합니다.`;
    case "reg":
      return `${label("productType", rec.productType)} 제품군은 ${label("reg", rec.reg)} 경로가 표준적인 인허가 절차입니다.`;
    case "channel":
      return `${rec.channel.map((c) => label("channel", c)).join("·")} 채널이 이 제품군의 초기 진입 CAC·계약 안정성 측면에서 유리합니다.`;
    case "strategy":
      return `이 조합은 ${label("strategy", rec.strategy)} 전략일 때 판가 방어력과 시장 적합도가 가장 높습니다.`;
  }
}

// ---------- LLM 이유 생성 ----------
async function generateReason(
  env: LlmEnv,
  axis: RecAxis,
  lifecycle: string,
  condition: string[],
  rec: AxisRule
): Promise<{ agent: AgentId; text: string; source: "live" | "fallback" }> {
  const agentId = REC_AXIS_AGENT[axis];
  const persona = AGENT_PERSONAS[agentId];
  const fallback = buildFallbackReason(axis, lifecycle, condition, rec);

  const axisValueLabel =
    axis === "ingredient" || axis === "channel"
      ? (rec[axis] as string[]).map((v) => label(axis, v)).join("·")
      : label(axis, rec[axis] as string);

  const condLabel = condition.map((c) => label("condition", c)).join("·");
  const ptLabel   = label("productType", rec.productType);

  try {
    const msg = await callAgentLlm(
      env,
      [
        {
          role: "system",
          content: `당신은 ${persona.name}입니다 — ${persona.role} 담당 AI Agent (Phytolab.AI 제품설계팀).
전문 영역: ${persona.expertise}
성격: ${persona.persona}
말투: ${persona.toneNote}

지금은 STAGE 00 브리프 단계입니다.
- 대상: ${label("lifecycle", lifecycle)}
- 건강이슈: ${condLabel}
- 제품군: ${ptLabel}
- 추천 값(${axis}): ${axisValueLabel}

왜 이 추천이 타당한지 1문장(50자 내외)으로 짧게 설명하세요. 인사말·이모지·따옴표 없이 이유 문장만 출력하세요.`,
        },
        { role: "user", content: "추천 이유를 한 문장으로 말해주세요." },
      ],
      { maxTokens: 120 }
    );
    if (!msg) throw new Error("empty");
    return { agent: agentId, text: msg, source: "live" };
  } catch {
    return { agent: agentId, text: fallback, source: "fallback" };
  }
}

export interface BriefRecommendResult {
  recommendation: AxisRule;
  reasons: Record<RecAxis, { agent: AgentId; text: string; source: "live" | "fallback" }>;
}

export async function getBriefRecommendation(
  env: LlmEnv,
  lifecycle: string,
  condition: string[],
  selectedProductType?: string
): Promise<BriefRecommendResult> {
  const rec = computeRuleRecommendation(lifecycle, condition, selectedProductType);
  const axes: RecAxis[] = ["productType", "ingredient", "reg", "channel", "strategy"];

  const results = await Promise.all(axes.map((axis) => generateReason(env, axis, lifecycle, condition, rec)));

  const reasons = {} as BriefRecommendResult["reasons"];
  axes.forEach((axis, i) => {
    reasons[axis] = results[i];
  });

  return { recommendation: rec, reasons };
}
