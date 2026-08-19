import { Hono } from 'hono'
import agentRoutes from './agents/routes'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.route('/', agentRoutes)

// favicon: 204 No Content (브라우저 자동 요청 → Worker 404 방지)
app.get('/favicon.ico', (c) => c.body(null, 204))

app.get('/', (c) => {
  return c.html(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phytolab.AI — Product Design Agent</title>

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic+Coding:wght@400;700&display=swap" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" rel="stylesheet" />

<link rel="stylesheet" href="/static/css/styles.css" />
<link rel="stylesheet" href="/static/css/multi_agent.css" />
<link rel="stylesheet" href="/static/css/brief_landing.css" />
</head>
<body style="font-family: 'Pretendard Variable', sans-serif; margin:0;">

<div id="app-root"></div>

<!-- ① React production 빌드 (dev 대비 react-dom 1055KB→130KB) -->
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
<!-- ② Babel standalone (react+env preset 내장) -->
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>

<!-- ③ 데이터 파일: nutrient_db(289KB)는 defer로 지연 로딩 -->
<script src="/static/js/data/mockData.js?v=20260819a"></script>
<script src="/static/js/data/sources.js?v=20260819a"></script>
<script src="/static/js/data/agents.js?v=20260819a"></script>
<script src="/static/js/data/agent_prompts.js?v=20260819a"></script>
<script src="/static/js/data/brief.js?v=20260819a"></script>
<script src="/static/js/data/nutrient_db.js?v=20260819a" defer></script>

<script src="/static/js/react_globals.js?v=20260819a"></script>

<!-- ④ Babel JSX 파일 -->
<script type="text/babel" src="/static/js/formula_context.js?v=20260819b"></script>
<script type="text/babel" src="/static/js/live_agent_context.js?v=20260819b"></script>
<script type="text/babel" src="/static/js/shell_components.js?v=20260819b"></script>
<script type="text/babel" src="/static/js/mobile_ui.js?v=20260819b"></script>
<script type="text/babel" src="/static/js/steps/step1_market.jsx?v=20260819b"></script>
<script type="text/babel" src="/static/js/steps/step2_target.jsx?v=20260819b"></script>
<script type="text/babel" src="/static/js/steps/step3_formula.jsx?v=20260819b"></script>
<script type="text/babel" src="/static/js/steps/step4_cost.jsx?v=20260819b"></script>
<script type="text/babel" src="/static/js/components/brief_landing.jsx?v=20260819b"></script>
<script type="text/babel" src="/static/js/app.js?v=20260819b"></script>

<style>
.workflow-brief-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 22px;
  background: oklch(from var(--accent) l c h / 0.06);
  border-bottom: 1px solid oklch(from var(--accent) l c h / 0.2);
  font-size: 12px;
}
.brief-back-btn {
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-2);
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.12em;
  transition: all 0.15s;
}
.brief-back-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.workflow-brief-eyebrow {
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.15em;
}
.workflow-brief-summary {
  color: var(--text-1);
  font-size: 12.5px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

</body>
</html>`)
})

export default app
