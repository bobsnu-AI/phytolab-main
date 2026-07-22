// 공통 라이브 논의 SSE 라우트 팩토리
// STEP1에서 검증한 하이브리드 패턴(FACTS 고정 + TURN_PLAN 고정 + msg만 LLM 실시간 생성)을
// Step2~5에 재사용하기 위해 일반화했습니다.
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

/**
 * @param path        SSE 엔드포인트 경로 (예: "/api/agents/step2/stream")
 * @param productIntro 논의 도입부에 들어갈 제품/스테이지 소개 문장
 * @param facts       이 스텝에서 고정 주입할 FACTS 블록
 * @param turnPlan    턴 순서 계획 (서버가 고정)
 */
export function createDiscussionRoute(
  path: string,
  productIntro: string,
  facts: string,
  turnPlan: DiscussionTurn[]
) {
  const route = new Hono<{ Bindings: Bindings }>();

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

  route.get(path, (c) => {
    return streamSSE(c, async (stream) => {
      const transcript: { agent: AgentId; msg: string }[] = [];

      for (const turn of turnPlan) {
        let msg: string;
        let source: "live" | "fallback" = "live";

        try {
          const historyText = transcript.length
            ? transcript.map((t) => `${AGENT_PERSONAS[t.agent].name}: ${t.msg}`).join("\n")
            : "(아직 발언 없음 · 이번이 논의의 첫 턴)";

          const messages: ChatMessage[] = [
            { role: "system", content: buildSystemPrompt(turn.agent) },
            {
              role: "user",
              content: `지금까지의 팀 대화:\n${historyText}\n\n이번 턴 지시: ${turn.guidance}\n\n규칙: 정확히 1~2문장(60자 내외/문장). 직전 발언들에서 이미 나온 숫자·문장을 다시 요약하거나 반복하지 말고, 이번 지시에 해당하는 새 정보만 말할 것. 인사말·이모지·따옴표 없이 발언 내용만 출력하세요.`,
            },
          ];

          msg = await callAgentLlm(c.env, messages);
          if (!msg) throw new Error("empty response");
        } catch (err) {
          msg = turn.fallbackMsg;
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
    });
  });

  return route;
}
