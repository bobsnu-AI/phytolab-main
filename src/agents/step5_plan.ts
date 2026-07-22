// STEP 5 (원가 시뮬레이션) Multi-Agent 라이브 논의 플랜
import type { DiscussionTurn } from "./live_discussion";

export const STEP5_INTRO =
  '지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "GLUCARE-M" (2형 당뇨환자용 액상 FSMP) 제품 개발을 위해 STAGE 5 원가·판가·마진 시뮬레이션을 실시간으로 논의 중입니다.';

export const STEP5_FACTS = `
[검증된 출처 데이터 — 이 안의 숫자만 인용 가능]
- 박스당(24팩) 총원가 ₩13,210: 원료비 + 부자재·살균비 + 제조간접비 구성
- 부자재·살균비 비중 약 46% (레토르트 파우치·외박스·라벨·살균 공정 포함)
- 배치 규모 30,000박스+ 시 규모의 경제 효과 발생 (제조간접비 체감)
- 목표 MSRP 45,000원 기준, 소비자가 경쟁 밴드 3.8만~5.4만원 중간대
- 채널별 수수료: 병원 18%, 요양시설 15%, 약국·H&B 28%, 온라인D2C 12%, 홈쇼핑 35%
- 병원 채널 기준 영업이익률 약 27% 시나리오, 요양시설 채널은 30%+ 가능
- 연 매출 시나리오(배치 30,000박스×12개월, MSRP 45,000원 가정): 연 매출 약 108억원, 영업이익 약 29억원(이익률 27%), 3년 내 손익분기 전망

[Agent 추정 — 반드시 "추정치" 또는 "시나리오"라고 밝히고 인용할 것]
- 급여화(건강보험 적용) 여부에 따른 판가 변동은 아직 확정되지 않은 정책 리스크이며, REGA가 제기하는 대안 시나리오임을 명시할 것
- 판가 20% 인하 시에도 마진 12%+ 확보 가능하다는 수치는 FINN의 시뮬레이션 추정치임을 명시할 것

[규칙]
- 위 목록에 없는 새로운 숫자를 지어내지 말 것.
- 추정·시나리오성 수치는 반드시 "추정치" 또는 "시나리오"라는 표현을 포함할 것.
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~2문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠ 표시만 예외).
`.trim();

export const STEP5_TURN_PLAN: DiscussionTurn[] = [
  {
    id: 1,
    agent: "finn",
    type: "action",
    tool: "Cost Calculator + Batch Simulator",
    guidance: "MOQ·수율·채널을 반영해 실질 원가를 재계산하기 시작한다고 짧게 알린다. 아직 결과는 밝히지 않는다.",
    fallbackMsg: "MOQ·수율·채널 반영 실질 원가 재계산 중",
  },
  {
    id: 2,
    agent: "finn",
    type: "finding",
    revealsSection: "cost_breakdown",
    guidance: "박스당 총원가와 부자재·살균비 비중, 배치 규모 효과를 함께 짧게 보고한다.",
    fallbackMsg: "박스당 총원가 ₩13,210 · 부자재·살균 46% · 배치 30,000박스+ 규모 효과",
  },
  {
    id: 3,
    agent: "mara",
    type: "support",
    revealsSection: "pricing",
    guidance: "목표 MSRP가 경쟁 밴드 어디에 위치하는지, 채널 인지 관점에서 왜 적절한지 시장 관점에서 화답한다.",
    fallbackMsg: "MSRP 45,000원 경쟁 밴드 중간대 · 채널 인지 최적",
  },
  {
    id: 4,
    agent: "finn",
    type: "insight",
    revealsSection: "channel",
    guidance: "채널별 수수료 구조를 근거로, 병원과 요양시설 채널이 왜 이익률 측면에서 유리한지 설명한다.",
    fallbackMsg: "병원 수수료 18% · 이익률 27% · 요양시설은 30%+ 가능",
  },
  {
    id: 5,
    agent: "rega",
    type: "concern",
    guidance: "급여화(건강보험 적용) 결과에 따른 판가 변동 리스크를 경고 형태로 짧게 제기하며 대안 시나리오 필요성을 언급한다. ⚠ 사용 가능.",
    fallbackMsg: "⚠ 급여화 결과에 따른 판가 변동 리스크 · 대안 시나리오 필요",
  },
  {
    id: 6,
    agent: "finn",
    type: "acknowledge",
    guidance: "REGA의 우려에 대응해, 판가를 20% 인하하는 보수적 시나리오에서도 마진이 방어되는지 시뮬레이션 추정치로 짧게 답한다.",
    fallbackMsg: "판가 20% 인하 시나리오에서도 마진 12%+ 확보 가능(추정치)",
  },
  {
    id: 7,
    agent: "finn",
    type: "conclusion",
    revealsSection: "annual",
    guidance: "연 매출·영업이익·손익분기 시점을 종합해 최종 결론을 짧게 제시한다. 시나리오 기반 수치임을 명시한다.",
    fallbackMsg: "연 매출 약 108억 · 영업이익 약 29억(27%) · 3년 내 손익분기 전망(시나리오)",
  },
];
