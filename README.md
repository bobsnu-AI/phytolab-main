# Phytolab.AI — Product Design Agent

## Project Overview
- **Name**: Phytolab.AI · Product Design Agent
- **Goal**: 푸드테크 R&D 팀이 새로운 기능성 식품 / 특수의료용도식품(FSMP) / 개인맞춤형식품을 설계할 때, 5명의 도메인 AI 에이전트(CLIO·RENA·MARA·FINN·REGA)가 협업하여 **"무엇을 만들지" 정의(STAGE 00)** 부터 **시장·경쟁 분석 → 영양 기준·기능성 도출 → 배합설계 → 원가시뮬(STAGE 01–04)** 까지 전 과정을 지원하는 Multi-Agent Product Design Copilot 데모입니다.
- **Design source**: Genspark Design 핸드오프 (`designer2-776f04c1-13e5-45b0-bab9-fa4a74a73224`) — "Clinical Ocean Dark" 테마의 hifi 디자인을 그대로 재현했습니다.
- **Features**:
  - **STAGE 00 · Brief Landing**: 8개 축(제품 카테고리 · 생애주기 · 건강이슈 · 원료 선호 · 제형 · 규제 클래스 · 유통 채널 · 비즈 전략) 카드 선택 UI. 선택할 때마다 리드 에이전트 + 관련 에이전트가 실시간으로 코멘트를 스트리밍하고, 근거 강도 · 시장 매력도 · 규제 난이도 · 원가 부담 4개 스코어가 즉시 재계산됩니다. 4개 Quick-Start 프리셋 제공. 필수 축(7개) 완료 시 "4-Stage 리서치 시작" 버튼 활성화.
  - **STAGE 01–04 · Research Workflow**: 확정된 브리프를 상단 스트립에 표시하며, Multi-Agent 로스터·핸드오프 다이어그램·팀 대화 스트림과 함께 **① 시장·경쟁 분석 → ② 영양 기준 설정·맞춤 기능성 도출 → ③ 배합 설계(실시간 슬라이더+FSMP 기준 준수 검증+합의 미터) → ④ 원가·마진 시뮬레이션(실시간 슬라이더)** 4단계를 탐색할 수 있습니다.
  - **STAGE 01 · 시장조사 + 경쟁 SKU 벤치마킹 + 리뷰 시그널 + 컨셉 도출 & POD 발굴 (라이브, LDA 실측 데이터 반영)**: 5명 Agent 전원이 참여하는 가장 큰 단계로, **실제 LLM(NVIDIA NIM · Llama 3.1 8B)이 매 세션 실시간으로 Agent 간 논의를 생성**합니다. "검증된 출처 데이터(FACTS)는 고정 · 논의·추론 과정만 실시간 생성"하는 하이브리드 구조를 채택해, 숫자/근거는 조작되지 않으면서도 매번 다른 자연스러운 대화 흐름을 제공합니다. 흐름은 시장 규모·세그먼트·채널(거시) → 경쟁 5개 SKU 포지셔닝·스펙 매트릭스·영양 비교(미시) → 리뷰 시그널 → 컨셉 도출 & POD 발굴(종합) → 결론 순으로 이어집니다. 컨셉·POD 단계에서는 MARA가 **네이버 카페 '당뇨와건강' 후기·체험단 게시판에서 실제로 수집한 공개 게시글 12건**에 형태소분석(kiwipiepy) + LDA 토픽모델링(scikit-learn)을 실제 실행한 결과(3개 토픽: 혈당관리·CGM 루틴 / 저당 간식 대체 / 환자용 영양식 대용식)를 보고하고, 이를 근거로 CLIO와 함께 Pain Point 3갈래 → POD(Point of Difference) 한 문장을 도출합니다. 가운데 분석 패널의 각 섹션(시장 배경 · KPI · 세그먼트 · 채널 · 경쟁 포지셔닝 · 스펙매트릭스 · 영양비교 · 리뷰 시그널 · 컨셉·POD · 결론)은 오른쪽 Agent 대화가 해당 근거를 도출하는 순간에 맞춰 스켈레톤 → 실제 데이터로 순차 전환됩니다. "다시 논의하기" 버튼으로 재생성 가능. **커뮤니티 LDA는 현재 A안(사전계산 방식)**: 크롤링·LDA는 샌드박스에서 1회 실행해 결과를 정적 데이터로 앱에 내장했으며(Cloudflare Workers는 Python 실행·장시간 크롤링이 불가하므로), 향후 사용자가 임의 키워드를 입력하면 실시간으로 크롤링+LDA를 재실행하는 B안(Cloudflare Queues + 외부 상시 서버 비동기 파이프라인)으로 업그레이드 가능한 구조로 설계되었습니다 (`SOURCES.community_lda` 상세설명에 업그레이드 경로 명시).
  - **STAGE 02 · 영양 기준 설정 + 맞춤 기능성 도출 (라이브)**: FSMP 표준제조기준 영양 목표치, PubMed 채택 논문 6건(임상 근거), 근거등급별 기능성 원료 후보를 다룹니다.
  - **STAGE 03 · 배합 설계 (라이브)**: 원료·용량·제형을 슬라이더로 조정하면 표준제조기준 준수도를 실시간 검증하고, 5명 Agent 전원 투표(vote) → 합의(consensus)로 마무리됩니다.
  - **STAGE 04 · 원가 시뮬레이션 (라이브)**: 원가·판가·마진·채널별 손익을 슬라이더로 조정하며 시뮬레이션합니다.
  - 모든 STAGE 01–04는 동일한 하이브리드 라이브 논의 아키텍처(FACTS 고정 + TURN_PLAN 고정 + 발언 문장만 LLM 실시간 생성)를 사용합니다.
  - 브리프 ↔ 워크플로우 화면 전환은 `localStorage`에 저장되어 새로고침해도 유지됩니다.

## URLs
- **Local (sandbox)**: http://localhost:3000 (PM2로 구동)
- **Production**: https://phytolab-app.pages.dev (Cloudflare Pages, snupfm@gmail.com 계정, 프로젝트명 `phytolab-app`)
- **API**: `GET /api/agents/step1/stream` — Step 1 실시간 Multi-Agent 논의 SSE 스트림 (시장조사+경쟁 SKU 벤치마킹+리뷰 시그널+컨셉·POD 도출, 20턴)
- **API**: `GET /api/agents/step2/stream` — Step 2 실시간 Multi-Agent 논의 SSE 스트림 (영양 기준·기능성 도출, 6턴)
- **API**: `GET /api/agents/step3/stream` — Step 3 실시간 Multi-Agent 논의 SSE 스트림 (배합 설계, 13턴)
- **API**: `GET /api/agents/step4/stream` — Step 4 실시간 Multi-Agent 논의 SSE 스트림 (원가 시뮬레이션, 7턴)

## Data Architecture
- **Data Models** (클라이언트 정적 JS로 정의, 서버 DB 없음):
  - `BRIEF_AXES` / `BRIEF_PRESETS` / `BRIEF_AGENT_REACTIONS` / `BRIEF_SCORE_WEIGHTS` — STAGE 00 브리프 스키마 (`public/static/js/data/brief.js`)
  - `AGENTS` / `STEP_LEADS` / `MULTI_REASONING` — 5-Agent 프로필 및 스텝별 리드·지원 Agent 매핑 (`public/static/js/data/agents.js`, `MULTI_REASONING`은 서버사이드 라이브 플랜으로 대체되어 현재 미사용)
  - `PHYTO_DATA` — 시장·경쟁·타깃·배합·원가 목업 데이터 (`public/static/js/data/mockData.js`)
  - `SOURCES` — 데이터 출처 레지스트리 (`public/static/js/data/sources.js`)
  - `AGENT_PROMPTS` — 클라이언트 사이드 프롬프트 템플릿 (`public/static/js/data/agent_prompts.js`, 현재 미사용 · 정리 예정)
- **STAGE 01–04 라이브 LLM 아키텍처** (서버사이드, `src/agents/`):
  - `personas.ts` — 5개 Agent(CLIO·RENA·MARA·FINN·REGA)의 서버사이드 시스템 프롬프트 페르소나 정의
  - `step1_plan.ts` — `STEP1_FACTS`(시장 데이터 + 경쟁 SKU 5개 프로필 + **네이버 카페 실측 LDA 토픽모델링 결과** + "추정치" 라벨링 규칙) + `STEP1_TURN_PLAN`(20턴: 시장조사 6턴 + 경쟁 SKU 벤치마킹 6턴 + 리뷰 시그널·컨셉 도출·POD 발굴 6턴 + 결론·인계 2턴)
  - `step2_plan.ts` — `STEP2_FACTS`(FSMP 영양 목표치 + 채택 논문 6건 + 원료 근거등급) + `STEP2_TURN_PLAN`(6턴: 영양 기준·기능성 원료 도출)
  - `step3_plan.ts` — `STEP3_FACTS`(배합 초안 + 표준제조기준 충족 여부 + 원가) + `STEP3_TURN_PLAN`(13턴: 배합 설계 + 5명 전원 투표·합의)
  - `step4_plan.ts` — `STEP4_FACTS`(원가·채널 수수료·매출 시나리오) + `STEP4_TURN_PLAN`(7턴: 원가·판가·마진 시뮬레이션)
  - `llm.ts` — NVIDIA NIM(OpenAI 호환, `meta/llama-3.1-8b-instruct`) 호출 클라이언트, 12초 타임아웃
  - `live_discussion.ts` — `createDiscussionRoute()` 팩토리로 4개 스텝의 SSE 라우트를 공통 로직으로 생성. 턴별 LLM 호출 실패 시 고정 문구(`fallbackMsg`)로 자동 폴백해 발표 중단 방지
  - `routes.ts` — `/api/agents/step{1..4}/stream` 라우트 등록
  - `public/static/js/live_agent_context.js` — `AgentStreamProvider`(SSE 구독) / `useAgentStream` / `RevealSection`(가운데 패널 섹션을 Agent 발언 진행에 맞춰 순차 노출)
- **STAGE 01 커뮤니티 LDA 데이터 파이프라인** (A안 · 샌드박스 사전계산 방식):
  - 수집: `crawler` 도구로 네이버 카페 "당뇨와건강"(`cafe.naver.com/dangsamo`) 후기·체험단 게시판의 공개 게시글 12건을 모바일 URL(`m.cafe.naver.com/ArticleRead.nhn?...`) + `render_js=true` 조합으로 실제 크롤링 (데스크톱 URL·js렌더링 미사용 시 사이드바만 반환되는 문제 해결)
  - 전처리: `kiwipiepy`로 형태소분석해 명사(NNG/NNP)만 추출, 불용어 제거
  - 모델링: `scikit-learn`의 `CountVectorizer` + `LatentDirichletAllocation`(3개 토픽)으로 실제 LDA 실행 → 토픽별 top 12 키워드·가중치 산출
  - 결과 반영: 산출된 토픽/키워드를 `step1_plan.ts`(`STEP1_FACTS`)와 `step1_market.jsx`(`concept_pod` 섹션 워드클라우드)에 정적 데이터로 직접 내장. 크롤링·LDA 스크립트 원본은 `/home/user/webapp_research/naver_crawl/`(웹앱 배포 범위 밖의 리서치 스크래치 디렉토리)에 보관
  - **B안 업그레이드 경로(추후)**: Cloudflare Workers는 Python 실행·장시간 백그라운드 작업이 불가하므로, 사용자가 임의 키워드를 입력해 실시간 크롤링+LDA를 원할 경우 Cloudflare Queues + 외부 상시 서버(크롤링·LDA 워커) + D1/KV(결과 캐싱) 조합의 비동기 파이프라인으로 교체 가능. 현재 구조(정적 데이터 + `SOURCES.community_lda` 출처 태그)는 이 교체를 염두에 두고 설계됨
- **환경변수** (`.dev.vars`, git 미포함): `OPENAI_API_KEY`(NVIDIA NIM API 키, build.nvidia.com에서 발급), `OPENAI_BASE_URL`(`https://integrate.api.nvidia.com/v1`)
- **Storage**: 서버 DB 없음. 브리프 선택값·확정 브리프·현재 워크플로우 스텝은 브라우저 `localStorage`에 저장 (`phytolab-brief`, `phytolab-brief-confirmed`, `phytolab-launched`, `phytolab-step`). Agent 논의는 세션마다 실시간 생성되며 별도 저장하지 않음.
- **Rendering**: Hono가 정적 HTML 셸을 서빙하고, React 18 + Babel Standalone(in-browser JSX 컴파일)으로 클라이언트에서 전체 UI를 렌더링합니다. 별도 빌드 파이프라인 없이 디자인 레퍼런스의 JSX/CSS를 최대한 그대로 재사용해 픽셀 단위 충실도를 유지했습니다.

## User Guide
1. 접속하면 **STAGE 00 · Brief Landing** 화면이 나타납니다.
2. 상단 **Quick Start** 프리셋 카드를 클릭하거나, 아래 8개 축의 옵션 카드를 직접 선택하세요.
3. 선택할 때마다 우측 **TEAM · LIVE BRIEF** 패널에 관련 에이전트의 코멘트가 실시간으로 쌓입니다.
4. 하단 sticky 요약바에서 4개 스코어(근거 강도·시장 매력도·규제 난이도·원가 부담)와 필수 축 완료 여부를 확인하세요.
5. 필수 축(7개)을 모두 채우면 **"4-Stage 리서치 시작 →"** 버튼이 활성화됩니다. 클릭하면 워크플로우 화면으로 전환됩니다.
6. 워크플로우 화면에서는 좌측 **WORKFLOW** 내비게이션으로 4단계(① 시장·경쟁 분석 → ② 영양·기능성 → ③ 배합 설계 → ④ 원가 시뮬)를 이동하며, 우측 **TEAM CONVERSATION** 패널에서 각 단계별 Multi-Agent 협업 내용을 확인할 수 있습니다. 배합 설계(03)와 원가 시뮬(04) 단계는 슬라이더로 값을 직접 조정하며 실시간 재계산을 체험할 수 있습니다.
7. 각 단계 진입 시 오른쪽에 **LIVE** 배지가 표시되며, 5명의 Agent가 실제 LLM으로 실시간 논의를 시작합니다. 논의가 진행됨에 따라 가운데 패널의 섹션들이 스켈레톤("OOO 분석 대기 중")에서 실제 데이터로 순차 전환됩니다. 특히 **STAGE 01**에서는 시장 배경 → KPI → 세그먼트 → 채널 → 경쟁 포지셔닝 → 스펙매트릭스 → 영양비교 → 리뷰 시그널 → 컨셉·POD → 결론 순으로 전환됩니다. 논의가 끝나면 "다시 논의하기" 버튼으로 새로운 논의를 재생성할 수 있습니다.
8. 상단의 **← BRIEF** 버튼으로 언제든 브리프 화면으로 돌아가 선택을 수정할 수 있습니다.

## Not Yet Implemented
- 우측 패널의 자유 질문 입력창(▸ 프롬프트)은 UI만 존재하며 실제 LLM 응답 연동은 되어있지 않습니다.
- Tweaks 개발자 패널(테마 전환·에이전트 on/off 등)은 프로덕션 화면에서 제외했습니다.
- 접근성 속성(`role="button"`, `aria-expanded`, `aria-pressed`, `aria-live` 등)은 추후 보강이 필요합니다.
- 반응형(태블릿/모바일) 레이아웃은 CSS 브레이크포인트만 반영되어 있으며 별도 QA가 필요합니다.
- 클라이언트 사이드 `agent_prompts.js`(`AGENT_PROMPTS`/`buildAgentContext`)와 `MULTI_REASONING`(`agents.js`)은 서버사이드 라이브 플랜(`step{1..4}_plan.ts`)으로 대체되어 현재 UI 렌더링에서는 어디서도 참조되지 않습니다. 정리 대상입니다(폴백 재사용 가능성 고려해 보류 중).
- 신규 발언 타입(insight/concern/review/acknowledge/note/analysis)은 `multi_agent.css`에 전용 스타일이 없으며 기본 `.ma-item` 스타일(agent-color 변수 기반)로 폴백 렌더됩니다. 타입별 시각적 구분이 필요하면 추가 CSS 작업이 권장됩니다.
- STAGE 01 커뮤니티 LDA는 A안(사전계산 정적 데이터, n=12 소규모 표본)입니다. 사용자가 화면에서 임의 키워드를 입력해 실시간으로 새 크롤링+LDA를 돌리는 기능은 아직 없습니다(B안 미구현).
- `post_012.txt`(그린비아 당케어)가 `post_001.txt`와 내용이 중복 저장되어 있어, 실제 코퍼스는 서로 다른 문서 11건 기준입니다. 추후 코퍼스 확장 시 중복 제거 후 재수집 권장.

## Recommended Next Steps
1. 신규 발언 타입(insight/concern/review 등) 전용 CSS 스타일 추가 검토.
2. 우측 Agent 채팅 자유 질문 입력창을 실제 LLM API와 연동.
3. `BRIEF_SCORE_WEIGHTS`를 도메인 전문가 델파이 조사로 재보정.
4. 브리프 요약 텍스트 생성을 LLM 기반으로 전환 (현재는 라벨 join 방식).
5. 접근성(A11y) 속성 보강 및 키보드 네비게이션 지원.
6. 모바일/태블릿 UX 재검토 (축 선택 → 옵션 선택 2-step 내비게이션 고려).
7. 미사용 `agent_prompts.js`/`MULTI_REASONING` 정리.
8. STAGE 01 커뮤니티 LDA를 B안(Cloudflare Queues + 외부 상시 서버 비동기 파이프라인)으로 업그레이드: 사용자 키워드 입력 → 실시간 네이버 카페 크롤링 → LDA 재실행 → D1/KV 캐싱 → SSE로 결과 스트리밍.
9. 커뮤니티 리뷰 코퍼스 확장(중복 문서 제거, 표본 수 n=12 → 수십~수백 건으로 확대)해 LDA 토픽의 통계적 안정성 개선.
10. STAGE 01이 20턴으로 길어져 논의 완료까지 LLM 호출 대기시간이 누적됩니다. 필요 시 일부 턴을 병렬화하거나 스트리밍 체감 속도를 개선하는 방안 검토.

## Deployment
- **Platform**: Cloudflare Pages (Hono 기반), 프로젝트명 `phytolab-app`
- **Status**: ✅ 배포 완료 (snupfm@gmail.com Cloudflare 계정, 프로젝트명 `phytolab-app`, BYOK 방식)
- **Tech Stack**: Hono (정적 HTML 셸 서빙 + SSE API) + React 18 (in-browser Babel Standalone) + 순수 CSS(oklch 디자인 토큰) + NVIDIA NIM(meta/llama-3.1-8b-instruct)
- **환경변수**: `OPENAI_API_KEY`(NVIDIA NIM 키) / `OPENAI_BASE_URL`(`https://integrate.api.nvidia.com/v1`)을 `wrangler pages secret put`으로 프로덕션에 등록 (로컬은 `.dev.vars` 사용, git 미포함)
- **Last Updated**: 2026-08-12 (5단계 → 4단계로 워크플로우 재구성: 시장조사에 경쟁 SKU 벤치마킹 통합, STAGE 02 환자 페르소나·임상 니즈 매트릭스 섹션 제거, 배합설계·원가시뮬을 STAGE 03/04로 재배치)
