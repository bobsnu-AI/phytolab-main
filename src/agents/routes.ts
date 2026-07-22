// 5개 스텝의 라이브 Multi-Agent 논의 SSE 라우트를 하나로 통합
// 각 스텝은 createDiscussionRoute 팩토리(하이브리드 패턴: FACTS 고정 + TURN_PLAN 고정 + msg만 LLM 생성)를 재사용합니다.
import { Hono } from "hono";
import { createDiscussionRoute } from "./live_discussion";
import { STEP1_FACTS, STEP1_TURN_PLAN } from "./step1_plan";
import { STEP2_INTRO, STEP2_FACTS, STEP2_TURN_PLAN } from "./step2_plan";
import { STEP3_INTRO, STEP3_FACTS, STEP3_TURN_PLAN } from "./step3_plan";
import { STEP4_INTRO, STEP4_FACTS, STEP4_TURN_PLAN } from "./step4_plan";
import { STEP5_INTRO, STEP5_FACTS, STEP5_TURN_PLAN } from "./step5_plan";
import { getBriefRecommendation } from "./brief_recommend";
import type { LlmEnv } from "./llm";

const STEP1_INTRO =
  '지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "GLUCARE-M" (2형 당뇨환자용 액상 FSMP) 제품 개발을 위해 STAGE 1 시장조사를 실시간으로 논의 중입니다.';

const app = new Hono<{ Bindings: LlmEnv }>();

app.route("/", createDiscussionRoute("/api/agents/step1/stream", STEP1_INTRO, STEP1_FACTS, STEP1_TURN_PLAN));
app.route("/", createDiscussionRoute("/api/agents/step2/stream", STEP2_INTRO, STEP2_FACTS, STEP2_TURN_PLAN));
app.route("/", createDiscussionRoute("/api/agents/step3/stream", STEP3_INTRO, STEP3_FACTS, STEP3_TURN_PLAN));
app.route("/", createDiscussionRoute("/api/agents/step4/stream", STEP4_INTRO, STEP4_FACTS, STEP4_TURN_PLAN));
app.route("/", createDiscussionRoute("/api/agents/step5/stream", STEP5_INTRO, STEP5_FACTS, STEP5_TURN_PLAN));

// STAGE 00 · Brief 추천 엔진 — category × lifecycle 선택 시 나머지 6개 축을 추천
app.post("/api/brief/recommend", async (c) => {
  let body: { category?: string; lifecycle?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json body" }, 400);
  }
  const { category, lifecycle } = body;
  if (!category || !lifecycle) {
    return c.json({ error: "category, lifecycle 필수" }, 400);
  }

  const result = await getBriefRecommendation(c.env, category, lifecycle);
  return c.json(result);
});

export default app;
