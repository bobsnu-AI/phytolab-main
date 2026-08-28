// 공통 라이브 논의 SSE 라우트 팩토리
// STEP1에서 검증한 하이브리드 패턴(FACTS 고정 + TURN_PLAN 고정 + msg만 LLM 실시간 생성)을
// Step2~5에 재사용하기 위해 일반화했습니다.
//
// 브리프별 동적 데이터셋 지원: SSE POST body에 { dataset: {...} } JSON을 실어 보내면
// 정적 FACTS/INTRO 대신 그 데이터셋 기반으로 생성한 FACTS/INTRO를 사용합니다.
// (이전: GET ?dataset= 쿼리스트링 → URL 8KB 초과로 CF Workers 차단 → POST body로 교체)
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { AGENT_PERSONAS, type AgentId } from "./personas";
import { callAgentLlm, type ChatMessage, type LlmEnv } from "./llm";

export interface DiscussionTurn {
  id: number;
  agent: AgentId;
  type: "action" | "finding" | "support" | "insight" | "concern" | "review" | "flag" | "acknowledge" | "note" | "analysis" | "vote" | "consensus" | "conclusion" | "handoff";
  tool?: string;
  to?: AgentId;
  /** 이 발언이 도출되면 가운데 패널의 어느 섹션(들)을 reveal할지 */
  revealsSection?: string | string[];
  /** 이 턴에서 LLM에게 주는 구체적 지시(한국어) */
  guidance: string;
  /** LLM 호출 실패 시 사용할 대체 문장 */
  fallbackMsg: string;
}

type Bindings = LlmEnv;

export interface DynamicOpts {
  /** 데이터셋에서 FACTS 블록에 포함할 최상위 키들 (예: ["product","market","competitors"]) */
  datasetKeys: string[];
  /** 데이터셋 기반 논의 도입부 문장 생성 */
  buildIntro: (dataset: any) => string;
}

// 데이터셋의 지정된 키들만 뽑아 "이 안의 정보만 인용 가능" FACTS 블록으로 조립 (LLM 호출 아님, 순수 포맷팅)
function buildFactsFromDataset(dataset: any, keys: string[]): string {
  const picked: any = {};
  for (const k of keys) picked[k] = dataset[k];
  return `[제품 데이터 — 이 안의 정보만 인용 가능, 새로운 숫자·사실을 지어내지 말 것]
${JSON.stringify(picked)}

[규칙]
- 위 데이터에 없는 새로운 숫자나 사실을 지어내지 말 것. 필요하면 "정확한 수치는 확인 필요"라고 말할 것.
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~2문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠ 표시만 예외).`.trim();
}

// 제품 유형별 규제 FLAG 텍스트 — REGA agent가 flag 타입 발언에서 사용
// 건강기능식품(개별인정형) 관련 경고는 해당 유형(fsmp·proteinshake)에만 적용
const PRODUCT_TYPE_FLAG_TEXT: Record<string, string> = {
  tea:          "⚠ 식품공전 차류 기준: 식품유형 '차류' 표시, 카페인·중금속 기준치 준수, 기능성 표방 문구 불가 (일반식품)",
  soymilk:      "⚠ 식품공전 두유류 기준: 두유류 단백질·당류·지방 함량 기준, 표시 기준 준수 필요",
  rawfood:      "⚠ 식품공전 생식류 기준: 생식류(곡류·채소 등 건조·분쇄) 위생·수분·이물 기준 준수, 기능성 표방 불가 (일반식품으로 건강기능식품공전 적용 없음)",
  proteinbar:   "⚠ 식품공전 과자류 기준: 영양성분 표시(열량·단백·지방·당류) 의무, 기능성 표방 시 건강기능식품 별도 인허가 필요",
  proteinshake: "⚠ 건강기능식품법 또는 식품공전: 제품 포지셔닝에 따라 일반식품 또는 건강기능식품 구분 필요 — 기능성 표방 시 건강기능식품 공전 기준 적용",
  fsmp:         "⚠ 특수의료용도식품(FSMP) 표준제조기준: 식약처 고시 영양소 기준(탄수·단백·지방·GI), 의사·영양사 권고 표시 의무, 개별인정형 성분 사용 시 건강기능식품 공전 심사자료 추가 요건 적용",
};

// dataset이 있을 때 guidance를 dataset 컨텍스트 기반으로 동적 재작성
// guidance 원문의 "당뇨", "GLUCARE-M" 등 고정 키워드 대신 실제 제품/건강이슈를 기반으로 발언하도록 지시
function buildDynamicGuidance(guidance: string, dataset: any, turnType?: string): string {
  const product = dataset?.product;
  if (!product) return guidance;

  const codename = product.codename || "이 제품";
  const tagline = product.tagline || "";
  const target = product.target || "";
  const category = product.subcategory || product.category || "";
  const productType = product.productType || "";

  // flag 타입 발언: 제품 유형에 맞는 규제 텍스트를 guidance에 명시적으로 주입
  // — LLM이 다른 제품 유형의 규제(특히 건강기능식품 개별인정형)를 잘못 인용하는 것을 방지
  if (turnType === "flag" && productType && PRODUCT_TYPE_FLAG_TEXT[productType]) {
    const flagText = PRODUCT_TYPE_FLAG_TEXT[productType];
    return `[중요: 아래 FACTS의 실제 제품(${codename}, ${tagline})을 기준으로 발언할 것.]
[규제 FLAG 지시: 이 제품의 식품 유형은 "${productType}"입니다. 반드시 아래 규제 텍스트만 기반으로 경고 발언을 생성하세요. 건강기능식품 개별인정형·건강기능식품공전 등 관련 없는 규제를 언급하지 마세요.]
[정확한 규제 텍스트: ${flagText}]
이 텍스트를 ⚠ FLAG 형식으로 간결하게 재작성하세요(1~2문장, 한국어 존댓말).`;
  }

  // guidance에서 고정 제품명/카테고리 키워드를 실제 데이터셋 값으로 치환
  let dg = guidance
    .replace(/GLUCARE-M/g, codename)
    .replace(/당뇨환자용/g, category || target)
    .replace(/당뇨 유병률|당뇨병 유병률/g, "해당 건강이슈 유병률·타깃 인구")
    .replace(/당뇨환자/g, target || "타깃 수요층")
    .replace(/2형 당뇨/g, target || "타깃 수요층")
    .replace(/혈당|혈당 관리/g, product.positioningClaim || "핵심 기능성")
    .replace(/이소말툴로스|MUFA/g, product.positioningSpec || "핵심 원료·스펙");

  // guidance 앞에 "아래 FACTS의 실제 제품 데이터를 기준으로" 지시 prefix 추가
  return `[중요: 아래 FACTS의 실제 제품(${codename}, ${tagline})과 해당 건강이슈·시장 데이터를 기준으로 발언할 것. 당뇨·GLUCARE-M 등 다른 제품 컨텍스트는 무시할 것.]\n${dg}`;
}

// SSE 스트림 본체 — GET/POST 핸들러 공통 로직
async function runDiscussionStream(
  stream: any,
  env: Bindings,
  dataset: any,
  staticIntro: string,
  staticFacts: string,
  turnPlan: DiscussionTurn[],
  dynamic: DynamicOpts | undefined
) {
  const productIntro = dataset && dynamic ? dynamic.buildIntro(dataset) : staticIntro;
  const facts = dataset && dynamic ? buildFactsFromDataset(dataset, dynamic.datasetKeys) : staticFacts;

  const transcript: { agent: AgentId; msg: string }[] = [];

  // Cloudflare Workers SSE: 총 응답 시간이 길어지면 연결 끊김 방지용
  // LLM 1턴 최대 대기 8초, 전체 스트림 최대 90초
  const STREAM_START = Date.now();
  const STREAM_LIMIT_MS = 90_000;
  const LLM_TURN_TIMEOUT_MS = 8_000;

  function buildSystemPrompt(agentId: AgentId): string {
    const p = AGENT_PERSONAS[agentId];
    return `당신은 ${p.name}입니다 — ${p.role} 담당 AI Agent (Phytolab.AI Multi-Agent 제품설계팀).
전문 영역: ${p.expertise}
성격: ${p.persona}
말투: ${p.toneNote}

${productIntro}
당신은 이 논의의 한 턴을 맡았습니다. 아래 FACTS와 이번 턴 지시만 근거로 짧게 발언하세요.

${facts}`;
  }

  for (const turn of turnPlan) {
    // 전체 스트림 시간 초과 시 즉시 done 전송 후 종료
    if (Date.now() - STREAM_START > STREAM_LIMIT_MS) {
      break;
    }

    let msg: string;
    let source: "live" | "fallback" = "live";

    // dataset이 있을 때: guidance를 dataset 기반으로 동적 재작성 (당뇨/GLUCARE-M 고정 키워드 제거)
    // flag 타입은 제품 유형별 정확한 규제 텍스트를 주입 (잘못된 건강기능식품 규제 인용 방지)
    const effectiveGuidance = dataset && dynamic
      ? buildDynamicGuidance(turn.guidance, dataset, turn.type)
      : turn.guidance;

    try {
      const historyText = transcript.length
        ? transcript.map((t) => `${AGENT_PERSONAS[t.agent].name}: ${t.msg}`).join("\n")
        : "(아직 발언 없음 · 이번이 논의의 첫 턴)";

      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(turn.agent) },
        {
          role: "user",
          content: `지금까지의 팀 대화:\n${historyText}\n\n이번 턴 지시: ${effectiveGuidance}\n\n규칙: 정확히 1~2문장(60자 내외/문장). 직전 발언들에서 이미 나온 숫자·문장을 다시 요약하거나 반복하지 말고, 이번 지시에 해당하는 새 정보만 말할 것. 인사말·이모지·따옴표 없이 발언 내용만 출력하세요.`,
        },
      ];

      // LLM 호출에 개별 타임아웃 적용 — 느린 경우 fallback으로 즉시 전환
      const llmResult = await Promise.race([
        callAgentLlm(env, messages),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("llm_timeout")), LLM_TURN_TIMEOUT_MS)
        ),
      ]);
      msg = llmResult as string;
      if (!msg) throw new Error("empty response");
    } catch (err) {
      // fallbackMsg도 dataset이 있으면 제품명 치환
      // flag 타입 + productType이 있으면 정확한 규제 텍스트를 fallback으로 사용
      if (dataset?.product?.codename) {
        const pt = dataset.product.productType || "";
        if (turn.type === "flag" && pt && PRODUCT_TYPE_FLAG_TEXT[pt]) {
          msg = PRODUCT_TYPE_FLAG_TEXT[pt];
        } else {
          msg = turn.fallbackMsg
            .replace(/GLUCARE-M/g, dataset.product.codename)
            .replace(/당뇨환자용/g, dataset.product.subcategory || dataset.product.category || "")
            .replace(/당뇨환자/g, dataset.product.target || "타깃 수요층");
        }
      } else {
        msg = turn.fallbackMsg;
      }
      source = "fallback";
    }

    transcript.push({ agent: turn.agent, msg });

    await stream.writeSSE({
      event: "turn",
      data: JSON.stringify({
        id: turn.id,
        agent: turn.agent,
        type: turn.type,
        tool: turn.tool,
        to: turn.to,
        revealsSection: turn.revealsSection,
        msg,
        source,
      }),
    });
  }

  await stream.writeSSE({ event: "done", data: "{}" });
}

/**
 * @param path         SSE 엔드포인트 경로 (예: "/api/agents/step2/stream")
 * @param staticIntro  데이터셋이 없을 때(정적 프리셋 경로) 사용할 도입부 문장
 * @param staticFacts  데이터셋이 없을 때 사용할 고정 FACTS 블록
 * @param turnPlan     턴 순서 계획 (서버가 고정, 데이터셋 유무와 무관하게 동일한 구조 재사용)
 * @param dynamic      브리프별 동적 데이터셋 지원 옵션 (없으면 항상 정적 FACTS/INTRO만 사용)
 */
export function createDiscussionRoute(
  path: string,
  staticIntro: string,
  staticFacts: string,
  turnPlan: DiscussionTurn[],
  dynamic?: DynamicOpts
) {
  const route = new Hono<{ Bindings: Bindings }>();

  // POST: dataset을 body JSON { dataset: {...} }으로 수신 — URL 크기 제한 우회
  route.post(path, async (c) => {
    let dataset: any = null;
    try {
      const body = await c.req.json();
      dataset = body?.dataset ?? null;
    } catch {
      dataset = null;
    }
    return streamSSE(c, (stream) =>
      runDiscussionStream(stream, c.env, dataset, staticIntro, staticFacts, turnPlan, dynamic)
    );
  });

  // GET: 하위 호환 유지 (데이터셋 없이 정적 FACTS로 실행)
  route.get(path, (c) => {
    return streamSSE(c, (stream) =>
      runDiscussionStream(stream, c.env, null, staticIntro, staticFacts, turnPlan, dynamic)
    );
  });

  return route;
}

