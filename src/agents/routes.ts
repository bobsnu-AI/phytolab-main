// 5개 스텝의 라이브 Multi-Agent 논의 SSE 라우트를 하나로 통합
// 각 스텝은 createDiscussionRoute 팩토리(하이브리드 패턴: FACTS 고정 + TURN_PLAN 고정 + msg만 LLM 생성)를 재사용합니다.
import { Hono } from "hono";
import { createDiscussionRoute } from "./live_discussion";
import { STEP1_FACTS, STEP1_TURN_PLAN } from "./step1_plan";
import { STEP2_INTRO, STEP2_FACTS, STEP2_TURN_PLAN } from "./step2_plan";
import { STEP3_INTRO, STEP3_FACTS, STEP3_TURN_PLAN } from "./step3_plan";
import { STEP4_INTRO, STEP4_FACTS, STEP4_TURN_PLAN } from "./step4_plan";
import { getBriefRecommendation } from "./brief_recommend";
import { generateProductDataset, type ConfirmedBrief } from "./dataset_generate";
import { createIngredientPriceRoute } from "./ingredient_price";
import type { LlmEnv } from "./llm";

const STEP1_INTRO =
  '지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "GLUCARE-M" (2형 당뇨환자용 액상 FSMP) 제품 개발을 위해 STAGE 1 시장조사 및 경쟁 SKU 벤치마킹을 실시간으로 논의 중입니다.';

const app = new Hono<{ Bindings: LlmEnv & { AGRO_API_KEY?: string } }>();

// 농산물 가격 API 라우트 등록
app.route("/", createIngredientPriceRoute());

app.route("/", createDiscussionRoute("/api/agents/step1/stream", STEP1_INTRO, STEP1_FACTS, STEP1_TURN_PLAN, {
  datasetKeys: ["product", "market", "competitors", "reviews", "concept"],
  buildIntro: (d) => `지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "${d.product.codename}" (${d.product.tagline}) 제품 개발을 위해 STAGE 1 시장조사 및 경쟁 SKU 벤치마킹을 실시간으로 논의 중입니다.`,
}));
app.route("/", createDiscussionRoute("/api/agents/step2/stream", STEP2_INTRO, STEP2_FACTS, STEP2_TURN_PLAN, {
  datasetKeys: ["target", "nutritionCompare"],
  buildIntro: (d) => `지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "${d.product.codename}" (${d.product.tagline}) 제품 개발을 위해 STAGE 2 영양 기준 설정 및 맞춤 기능성 도출을 실시간으로 논의 중입니다.`,
}));
app.route("/", createDiscussionRoute("/api/agents/step3/stream", STEP3_INTRO, STEP3_FACTS, STEP3_TURN_PLAN, {
  datasetKeys: ["formula"],
  buildIntro: (d) => `지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "${d.product.codename}" (${d.product.tagline}) 제품 개발을 위해 STAGE 3 배합 설계 및 표준제조기준 준수 검증을 실시간으로 논의 중입니다.`,
}));
app.route("/", createDiscussionRoute("/api/agents/step4/stream", STEP4_INTRO, STEP4_FACTS, STEP4_TURN_PLAN, {
  datasetKeys: ["cost", "formula"],
  buildIntro: (d) => `지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "${d.product.codename}" (${d.product.tagline}) 제품 개발을 위해 STAGE 4 원가·판가·마진 시뮬레이션을 실시간으로 논의 중입니다.`,
}));

// STAGE 00 · 브리프 → STAGE 01~04용 제품 데이터셋 생성 (전체 동적화)
app.post("/api/brief/generate", async (c) => {
  let body: ConfirmedBrief;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json body" }, 400);
  }
  if (!body.lifecycle || !body.condition || !body.condition.length) {
    return c.json({ error: "lifecycle, condition 필수" }, 400);
  }
  const dataset = await generateProductDataset(c.env, body);
  return c.json(dataset);
});

// STAGE 00 · Brief 추천 엔진 — lifecycle × condition 선택 시 나머지 6개 축을 추천
app.post("/api/brief/recommend", async (c) => {
  let body: { lifecycle?: string; condition?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json body" }, 400);
  }
  const { lifecycle, condition } = body;
  if (!lifecycle || !condition || !condition.length) {
    return c.json({ error: "lifecycle, condition 필수" }, 400);
  }

  const result = await getBriefRecommendation(c.env, lifecycle, condition);
  return c.json(result);
});

export default app;
