// STAGE 00 · Brief 추천 엔진
// 설계 원칙(하이브리드 패턴 — Step1~5 라이브 논의와 동일한 철학):
//  - "무엇을 추천할지"는 규칙 테이블(rule table)이 결정한다 (안정적·일관적·무료).
//  - "왜 그렇게 추천하는지 이유(reason)"는 담당 Agent 페르소나로 LLM이 실시간 생성한다.
//  - LLM 실패 시 fallback 이유 문장으로 즉시 대체 (화면이 비지 않음).
//
// 클라이언트의 public/static/js/data/brief.js(window.BRIEF_AXES/PRESETS)와
// 옵션 id/라벨을 동기화 유지할 것 (personas.ts ↔ agents.js 관계와 동일한 이중관리 원칙).
import { AGENT_PERSONAS, type AgentId } from "./personas";
import { callAgentLlm, type LlmEnv } from "./llm";

export type RecAxis = "category" | "ingredient" | "format" | "reg" | "channel" | "strategy";

interface AxisRule {
  category: string;
  ingredient: string[];
  format: string;
  reg: string;
  channel: string[];
  strategy: string;
}

// 각 추천 축을 담당하는 Agent (brief.js의 axis.lead와 동일하게 매핑)
export const REC_AXIS_AGENT: Record<RecAxis, AgentId> = {
  category: "mara",
  ingredient: "rena",
  format: "rena",
  reg: "rega",
  channel: "mara",
  strategy: "finn",
};

// 옵션 라벨(한국어) — LLM 프롬프트와 fallback 문장 생성에 사용 (dataset_generate.ts도 재사용)
export const LABELS: Record<string, Record<string, string>> = {
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
    gut: "장 건강", cardio: "심혈관", bone: "뼈·관절", renal: "신장", cancer: "암 환자 영양",
    dysph: "연하곤란", sleep: "수면·스트레스", beauty: "이너뷰티",
  },
  ingredient: {
    plant: "식물성(Plant-based)", ferment: "발효", herbal: "허브·식물추출", marine: "해양",
    dairy: "유청·유단백", insect: "곤충·대체단백", syn: "합성·정밀영양", func: "기능성 원료",
  },
  format: {
    liquid: "액상(RTD)", powder: "분말 스틱", jelly: "젤리·파우치", tablet: "정제·캡슐",
    bar: "바·씨리얼", solid: "고형 식사식", gum: "츄어블·구미", spray: "액상 스프레이",
  },
  reg: {
    fsmp: "FSMP 표준제조기준", "hfunc-i": "건기식 개별인정", "hfunc-n": "건기식 고시형",
    label: "일반식품 표시제", seniorks: "고령친화식품 KS", regular: "일반식품",
  },
  channel: {
    hospital: "병원·의료기관", nursing: "요양·복지시설", d2c: "온라인 D2C", phar: "약국·H&B",
    mart: "대형마트·이커머스", conv: "편의점", export: "수출", corp: "기업 복지·B2B2C",
  },
  strategy: {
    premium: "프리미엄", mass: "매스마켓", subs: "정기 구독", value: "가치소비",
    reim: "급여·수가 진입", custom: "완전 맞춤형",
  },
};

export function label(axis: string, id: string): string {
  return LABELS[axis]?.[id] || id;
}

// ---------- 규칙 테이블 1: 건강이슈(condition) 기본값 ----------
const CONDITION_DEFAULTS: Record<string, AxisRule> = {
  metabolic: { category: "fsmp",     ingredient: ["dairy", "plant"],  format: "liquid", reg: "fsmp",     channel: ["hospital", "d2c"],   strategy: "premium" },
  sarco:     { category: "senior",   ingredient: ["dairy", "plant"],  format: "jelly",  reg: "seniorks", channel: ["nursing", "hospital"], strategy: "value" },
  cog:       { category: "hfunc",    ingredient: ["herbal", "marine"], format: "tablet", reg: "hfunc-i",  channel: ["d2c", "phar"],       strategy: "premium" },
  immune:    { category: "hfunc",    ingredient: ["herbal", "func"],  format: "tablet", reg: "hfunc-n",  channel: ["d2c", "phar"],        strategy: "premium" },
  gut:       { category: "general",  ingredient: ["ferment", "plant"], format: "liquid", reg: "label",    channel: ["d2c", "conv"],       strategy: "subs" },
  cardio:    { category: "hfunc",    ingredient: ["plant", "marine"], format: "tablet", reg: "hfunc-i",  channel: ["d2c", "phar"],        strategy: "premium" },
  bone:      { category: "senior",   ingredient: ["dairy", "plant"],  format: "powder", reg: "seniorks", channel: ["nursing", "d2c"],     strategy: "value" },
  renal:     { category: "fsmp",     ingredient: ["plant", "syn"],    format: "liquid", reg: "fsmp",     channel: ["hospital"],           strategy: "reim" },
  cancer:    { category: "fsmp",     ingredient: ["dairy", "syn"],    format: "liquid", reg: "fsmp",     channel: ["hospital"],           strategy: "reim" },
  dysph:     { category: "senior",   ingredient: ["dairy", "plant"],  format: "jelly",  reg: "seniorks", channel: ["nursing", "hospital"], strategy: "value" },
  sleep:     { category: "hfunc",    ingredient: ["herbal", "func"], format: "gum",    reg: "hfunc-i",  channel: ["d2c"],                strategy: "subs" },
  beauty:    { category: "general",  ingredient: ["marine", "ferment"], format: "jelly", reg: "label",   channel: ["d2c", "mart"],        strategy: "premium" },
};

// ---------- 규칙 테이블 2: 생애주기 보정 (카테고리/포맷/채널/전략 override) ----------
interface LifecycleAdj {
  category?: string;
  format?: string;
  channel?: string[];
  strategy?: string;
}
const LIFECYCLE_ADJUST: Record<string, LifecycleAdj> = {
  infant: { category: "infant", format: "liquid", channel: ["phar", "hospital"] },
  child:  {},
  adult:  {},
  preg:   { format: "powder" },
  middle: {},
  senior: { category: "senior", format: "jelly", channel: ["nursing", "hospital"] },
  super:  { category: "senior", format: "jelly", channel: ["nursing"] },
  all:    {},
};

function dedupCap<T>(arr: T[], cap: number): T[] {
  return Array.from(new Set(arr)).slice(0, cap);
}

export function computeRuleRecommendation(lifecycle: string, condition: string[]): AxisRule {
  const primary = condition[0] || "metabolic";
  const base = CONDITION_DEFAULTS[primary] || CONDITION_DEFAULTS.metabolic;
  const adj = LIFECYCLE_ADJUST[lifecycle] || {};

  // 건강이슈를 여러 개 고른 경우, 각 이슈의 추천 원료를 합쳐서 제시
  const mergedIngredients = dedupCap(
    condition.flatMap((c) => (CONDITION_DEFAULTS[c] || base).ingredient),
    3
  );

  return {
    category: adj.category || base.category,
    ingredient: mergedIngredients.length ? mergedIngredients : base.ingredient,
    format: adj.format || base.format,
    reg: base.reg,
    channel: dedupCap([...(adj.channel || []), ...base.channel], 2),
    strategy: adj.strategy || base.strategy,
  };
}

// ---------- Fallback 이유 문장 (LLM 실패 시 즉시 대체) ----------
export function buildFallbackReason(axis: RecAxis, lifecycle: string, condition: string[], rec: AxisRule): string {
  const lifeL = label("lifecycle", lifecycle);
  const condL = condition.map((c) => label("condition", c)).join("·");
  switch (axis) {
    case "category":
      return `${lifeL} × ${condL} 조합에는 ${label("category", rec.category)} 카테고리가 규제·시장 적합도 측면에서 가장 알맞습니다.`;
    case "ingredient":
      return `${condL} 이슈 대응에는 ${rec.ingredient.map((i) => label("ingredient", i)).join("·")} 원료 조합이 배합 안정성과 근거 확보에 유리합니다.`;
    case "format":
      return `${lifeL} 대상 특성상 ${label("format", rec.format)} 제형이 관능·순응도·물류 측면에서 적합합니다.`;
    case "reg":
      return `${label("category", rec.category)} 카테고리는 ${label("reg", rec.reg)} 경로가 표준적인 인허가 절차입니다.`;
    case "channel":
      return `${rec.channel.map((c) => label("channel", c)).join("·")} 채널이 이 조합의 초기 진입 CAC·계약 안정성 측면에서 유리합니다.`;
    case "strategy":
      return `이 조합은 ${label("strategy", rec.strategy)} 전략일 때 판가 방어력과 시장 적합도가 가장 높습니다.`;
  }
}

// ---------- LLM 이유 생성 (담당 Agent 페르소나 사용, 실패 시 fallback) ----------
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

  try {
    const msg = await callAgentLlm(
      env,
      [
        {
          role: "system",
          content: `당신은 ${persona.name}입니다 — ${persona.role} 담당 AI Agent (Phytolab.AI Multi-Agent 제품설계팀).
전문 영역: ${persona.expertise}
성격: ${persona.persona}
말투: ${persona.toneNote}

지금은 STAGE 00 브리프 단계입니다. 사용자가 생애주기 "${label("lifecycle", lifecycle)}"와 건강이슈 "${condLabel}"를 선택했고, 당신의 담당 축에 "${axisValueLabel}"를 추천하려 합니다. 왜 이 추천이 타당한지 1문장(50자 내외)으로 짧게 설명하세요. 인사말·이모지·따옴표 없이 이유 문장만 출력하세요.`,
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
  condition: string[]
): Promise<BriefRecommendResult> {
  const rec = computeRuleRecommendation(lifecycle, condition);
  const axes: RecAxis[] = ["category", "ingredient", "format", "reg", "channel", "strategy"];

  const results = await Promise.all(axes.map((axis) => generateReason(env, axis, lifecycle, condition, rec)));

  const reasons = {} as BriefRecommendResult["reasons"];
  axes.forEach((axis, i) => {
    reasons[axis] = results[i];
  });

  return { recommendation: rec, reasons };
}
