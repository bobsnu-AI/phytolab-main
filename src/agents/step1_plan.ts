// STEP 1 (시장조사) Multi-Agent 라이브 논의 플랜
//
// 설계 원칙(하이브리드 방식):
//  - "무엇을 말할 차례인지 / 어떤 패널 섹션이 이 발언으로 도출되는지"는 서버가 결정(FIXED PLAN).
//  - "그 차례에 실제로 뭐라고 말하는지(msg)"는 매 세션마다 LLM이 실시간 생성(LIVE).
//  - LLM은 FACTS 블록에 없는 숫자를 새로 만들어낼 수 없고, 추정치는 반드시 추정치라고 밝히도록 강제.
//  - LLM 호출 실패/타임아웃 시 fallbackMsg로 자동 대체(발표 중 끊김 방지).
import type { AgentId } from "./personas";

export interface Step1Turn {
  id: number;
  agent: AgentId;
  type: "action" | "finding" | "support" | "conclusion" | "handoff";
  tool?: string;
  to?: AgentId;
  /** 이 발언이 도출되면 가운데 패널의 어느 섹션을 reveal할지 */
  revealsSection?: string;
  /** 이 턴에서 LLM에게 주는 구체적 지시(한국어) */
  guidance: string;
  /** LLM 호출 실패 시 사용할 대체 문장 */
  fallbackMsg: string;
}

// 검증된 출처 + 명시적으로 라벨링된 추정치만 포함 (public/static/js/data/sources.js, mockData.js와 동기화)
export const STEP1_FACTS = `
[검증된 출처 데이터 — 이 안의 숫자만 인용 가능]
- 국내 특수의료용도식품(FSMP) 시장: 2024년 6,374억원 → 2033년 1조8,860억원 전망 (출처: 농촌진흥청 발표, 2025-10)
- 글로벌 Medical Foods 시장: 2025년 255억 달러, CAGR 5.1% (2026–2035) (출처: Research Nester)
- 국내 30세 이상 당뇨병 유병률: 15.5% (남 18.1%·여 13.0%), 환자 약 533만명 (출처: 대한당뇨병학회 Diabetes Fact Sheets 2024, PMID 39828976, 2021–2022년 국민건강영양조사 기반)
- 특수의료용도식품 급여화 논의 진행 중, B2B 채널 확대 흐름 (출처: 삼정KPMG Medical Foods 트렌드 리포트, 2024-12)

[Agent 추정치 — 공개 세그먼트/채널 통계 부재로 Agent가 추정한 값. 반드시 "추정치"라고 밝히고 인용할 것]
- FSMP 세그먼트별 점유율·성장률(추정): 당뇨환자용 34%·성장률16.2%, 고령친화 26%·18.4%, 암환자용 18%·12.1%, 신장질환용 12%·8.7%, 연하곤란 10%·22.3%
- 유통채널 구조(추정): 병원 38%(CAC낮음), 요양시설B2B 27%(CAC낮음), 온라인D2C 21%(CAC중간), 약국·H&B 14%(CAC중간) → 병원+요양시설 B2B 합산 약 65%
- 적응증별 처방/구매 트렌드 지수(추정, 최근 6분기): 당뇨환자용 42→48→55→62→71→82로 6분기 연속 상승, 타 적응증 대비 성장률 최상위
- FSMP 스캔 SKU 수(추정): 218개
- 평균 판가 밴드(추정): 38,000–54,000원 (Step3 경쟁사 벤치마킹 기준)

[규칙]
- 위 목록에 없는 새로운 숫자를 지어내지 말 것. 필요하면 "정확한 수치는 확인 필요"라고 말할 것.
- 추정치를 인용할 때는 반드시 "추정치" 또는 "Agent 추정"이라는 표현을 포함할 것.
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~3문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠ 표시만 예외, 이번 턴엔 해당 없음).
`.trim();

export const STEP1_TURN_PLAN: Step1Turn[] = [
  {
    id: 1,
    agent: "mara",
    type: "action",
    tool: "Market Data API",
    guidance: "국내 FSMP 5년 추이 데이터를 식약처·KDA 소스에서 조회하기 시작한다고 아주 짧게 알린다. 아직 결론은 내지 않는다.",
    fallbackMsg: "국내 FSMP 5년 추이 조회 · 식약처·KDA 병렬 파싱 중",
  },
  {
    id: 2,
    agent: "clio",
    type: "support",
    revealsSection: "context",
    guidance: "임상영양 관점에서 당뇨 유병률과 실질 수요 규모를 FACTS의 검증된 수치로 보고하고, 정책(급여화 논의) 동향도 짧게 언급한다.",
    fallbackMsg: "당뇨 유병률 15.5% · 533만명 실질 수요 확인 (KDA 2024, PMID 39828976)",
  },
  {
    id: 3,
    agent: "mara",
    type: "finding",
    revealsSection: "kpi",
    guidance: "국내 시장 규모(2024→2033 전망)와 글로벌 시장 규모·성장률을 FACTS 기준으로 보고한다.",
    fallbackMsg: "국내 시장 6,374억원(2024) → 2033년 1조8,860억원 전망 · 글로벌 255억 달러 시장, CAGR 5.1%",
  },
  {
    id: 4,
    agent: "mara",
    type: "finding",
    revealsSection: "segments",
    guidance: "세그먼트별 점유율·성장률 추정치를 근거로 당뇨환자용 세그먼트가 왜 매력적인지 설명한다. 추정치임을 명시한다.",
    fallbackMsg: "당뇨환자용 세그먼트 점유율 34% · 성장률 16.2%로 최상위권 (Agent 추정)",
  },
  {
    id: 5,
    agent: "mara",
    type: "finding",
    revealsSection: "channels",
    guidance: "유통채널 구조와 B2B(병원+요양시설) 비중을 추정치로 보고한다. 추정치임을 명시한다.",
    fallbackMsg: "B2B(병원+요양시설) 채널 합산 약 65% 우세 · CAC 낮음 (Agent 추정)",
  },
  {
    id: 6,
    agent: "finn",
    type: "support",
    guidance: "직전 MARA의 B2B 채널 비중 발언을 받아서, 원가·SCM 관점에서 B2B 채널이 초기 CAC와 계약 안정성 측면에서 왜 유리한지 짧게 보강한다.",
    fallbackMsg: "B2B 비중이 높아 초기 CAC가 낮고 계약 기반 수요라 안정적입니다",
  },
  {
    id: 7,
    agent: "mara",
    type: "finding",
    revealsSection: "trends",
    guidance: "최근 6분기 적응증별 처방 트렌드 추정치를 근거로 당뇨환자용이 왜 hot한지 설명한다. 추정치임을 명시한다.",
    fallbackMsg: "당뇨환자용 처방 지수 6분기 연속 상승(42→82) · 성장률 타 적응증 대비 최상위 (Agent 추정)",
  },
  {
    id: 8,
    agent: "mara",
    type: "conclusion",
    revealsSection: "conclusion",
    guidance: "지금까지 나온 검증된 수치와 추정치를 종합해서, 카테고리 매력도에 대한 결론과 진입전략(병원 우선 진입 → D2C 확장)을 제시한다.",
    fallbackMsg: "카테고리 매력도 A · 병원 우선 진입 후 D2C 확장을 권장합니다",
  },
  {
    id: 9,
    agent: "mara",
    type: "handoff",
    to: "clio",
    guidance: "시장조사 결론을 요약하고, 다음 단계인 임상 니즈 정의를 위해 CLIO에게 인계한다는 짧은 한 문장.",
    fallbackMsg: "임상 니즈 정의 단계로 CLIO에게 인계합니다",
  },
];
