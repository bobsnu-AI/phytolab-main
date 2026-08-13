// STEP 4 (배합 설계) Multi-Agent 라이브 논의 플랜 — 5명 전원 투표(vote) → 합의(consensus) 구조 포함
import type { DiscussionTurn } from "./live_discussion";

export const STEP3_INTRO =
  '지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "GLUCARE-M" (2형 당뇨환자용 액상 FSMP) 제품 개발을 위해 STAGE 3 배합 설계 및 표준제조기준 준수 검증을 실시간으로 논의 중입니다.';

export const STEP3_FACTS = `
[검증된 출처 데이터 — 이 안의 숫자만 인용 가능]
- 배합 초안(200ml·200kcal 1팩 기준): 이소말툴로스 22g + 저항성말토덱스트린 6g + 유청단백분리물(WPI) 10g + 카제인나트륨 3g + 고올레산해바라기유(MUFA) 6g + MCT오일 2g + 비타민미네랄프리믹스 1.2g + 크롬피콜리네이트 0.05g + 레시틴 0.8g + 향미 0.3g + 감미료 0.05g + 정제수(담체) 148.6g
- 계산 결과: 단백질 13g/식, 탄수 46.8%en, 단백 21.2%en, 지방 32.0%en, GI 28
- FSMP 표준제조기준(식약처): 탄수 45-50%en, 단백 18-22%en, 지방 30-38%en, GI≤55(저GI) → 위 배합안은 전 항목 기준 충족
- 원가: 박스당(24팩) 총원가 ₩13,210, 목표 MSRP 45,000원 기준 마진 70.6%
- REGA 규제 검토: '근감소 예방'이라는 표현은 질병 예방·치료 효능 암시로 표시광고 심의 리스크 있음 → '근육량 유지 도움'으로 순화 권고

[Agent 추정 — 반드시 "추정치"라고 밝히고 인용할 것]
- WPI 10g 이상 배합 시 장기 안정성(3개월 가속시험) 검증이 아직 안 되었다는 점은 RENA의 우려 사항으로, 실제 시험 데이터가 아닌 배합 설계상 리스크 판단임을 명시할 것

[규칙]
- 위 목록에 없는 새로운 숫자를 지어내지 말 것.
- 5명 Agent가 순서대로 투표(vote)하는 마지막 구간에서는 각자 자기 전문 분야 관점에서 "✓ 승인" 또는 "✓ 승인(조건부)"라고만 짧게 말할 것 (반대는 없음 — 이미 REGA의 조건부 지적이 반영된 이후 투표이므로).
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~2문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠, 합의 시 🎉는 예외).
`.trim();

export const STEP3_TURN_PLAN: DiscussionTurn[] = [
  {
    id: 1,
    agent: "rena",
    type: "action",
    tool: "Formula Generator",
    guidance: "표준제조기준과 임상 근거를 만족하는 배합안 여러 개를 생성했다고 짧게 알린다. 아직 최종안은 밝히지 않는다.",
    fallbackMsg: "표준제조기준+근거 만족 배합안 12개 생성 완료",
  },
  {
    id: 2,
    agent: "rena",
    type: "finding",
    revealsSection: "formula_table",
    guidance: "최종 선정된 배합 초안(이소말툴로스 22g + WPI 10g + 카제인 3g + MUFA 6g 등)을 핵심 원료 중심으로 짧게 보고한다.",
    fallbackMsg: "최적안: 이소말툴로스 22g + WPI 10g + 카제인 3g + MUFA 6g",
  },
  {
    id: 3,
    agent: "clio",
    type: "review",
    revealsSection: "efficacy",
    guidance: "이 배합안의 단백질 함량과 임상 근거 등급을 임상영양 관점에서 검토하고 승인 가능한 수준인지 짧게 평가한다.",
    fallbackMsg: "단백 13g/식 확보 · 근거 A등급 충족 수준으로 검토됩니다",
  },
  {
    id: 4,
    agent: "rega",
    type: "review",
    revealsSection: "compliance",
    guidance: "탄수/단백/지방 비율과 GI 수치가 표준제조기준을 모두 충족하는지 항목별로 짧게 확인해준다.",
    fallbackMsg: "탄수 46.8%en ✓ 단백 21.2%en ✓ 지방 32.0%en ✓ GI 28 ✓",
  },
  {
    id: 5,
    agent: "rega",
    type: "flag",
    guidance: "'근감소 예방'이라는 표현이 표시광고 심의상 리스크가 있어 순화가 필요하다고 경고 형태로 짧게 지적한다. ⚠ 사용 가능.",
    fallbackMsg: "⚠ '근감소 예방' 문구 → '근육량 유지 도움'으로 순화 권고",
  },
  {
    id: 6,
    agent: "rena",
    type: "concern",
    guidance: "WPI 10g 이상 배합의 장기 안정성 검증이 아직 안 되어 있다는 우려를 배합 설계 리스크로서 짧게 제기한다. 실제 시험 데이터가 아님을 명시한다.",
    fallbackMsg: "WPI 10g+ 배합 안정성은 아직 미검증 · 3개월 가속시험 필요(설계상 우려)",
  },
  {
    id: 7,
    agent: "finn",
    type: "analysis",
    guidance: "이 배합안 기준 박스당 총원가와 목표 MSRP 대비 마진율을 원가 관점에서 짧게 보고한다.",
    fallbackMsg: "박스당 총원가 ₩13,210 · 마진 70.6%",
  },
  {
    id: 8,
    agent: "clio",
    type: "vote",
    guidance: "임상영양 관점에서 이 배합안에 대해 승인 의사를 짧게 밝힌다.",
    fallbackMsg: "✓ 승인 · 근거 A 등급",
  },
  {
    id: 9,
    agent: "rega",
    type: "vote",
    guidance: "규제 관점에서 조건부 승인(라벨 순화 후 최종) 의사를 짧게 밝힌다.",
    fallbackMsg: "✓ 승인(조건부) · 라벨 순화 후 최종",
  },
  {
    id: 10,
    agent: "rena",
    type: "vote",
    guidance: "배합·제형 관점에서 승인 의사를 짧게 밝힌다.",
    fallbackMsg: "✓ 승인 · 시제품 배치 가능",
  },
  {
    id: 11,
    agent: "finn",
    type: "vote",
    guidance: "원가 관점에서 승인 의사를 짧게 밝힌다.",
    fallbackMsg: "✓ 승인 · 마진 목표 달성",
  },
  {
    id: 12,
    agent: "mara",
    type: "vote",
    guidance: "시장·경쟁 관점에서 승인 의사를 짧게 밝힌다.",
    fallbackMsg: "✓ 승인 · 경쟁 대비 스펙 우위",
  },
  {
    id: 13,
    agent: "rena",
    type: "consensus",
    revealsSection: ["formula_table", "efficacy", "compliance", "sensory"],
    guidance: "5명 전원 승인으로 만장일치가 달성되었음을 짧게 선언하고, 다음 단계인 원가 시뮬레이션 진행을 알린다. 🎉 사용 가능.",
    fallbackMsg: "🎉 5/5 만장일치 · Step 4 진행",
  },
];
