// STEP 2 (영양 기준 설정 + 맞춤 기능성 도출) Multi-Agent 라이브 논의 플랜 — step1과 동일한 하이브리드 설계 원칙 적용
import type { DiscussionTurn } from "./live_discussion";

export const STEP2_INTRO =
  '지금은 5명의 Agent(CLIO/RENA/MARA/FINN/REGA)가 "GLUCARE-M" (2형 당뇨환자용 액상 FSMP) 제품 개발을 위해 STAGE 2 영양 기준 설정 및 맞춤 기능성 도출을 실시간으로 논의 중입니다.';

export const STEP2_FACTS = `
[검증된 출처 데이터 — 이 안의 숫자만 인용 가능]
- FSMP 영양 목표치 (식약처 표준제조기준 + KDA 2024): 1식 200ml·200kcal, 탄수 45%en, 단백 20%en, 지방 35%en, GI 28(저GI 기준 <55 충족), 나트륨 180mg(기준 <200)
- 채택 논문 6건 (PubMed 등재, PMID 확인):
  1) MUFA 강화 제형 메타분석(PMID 32222291, 18RCT·n=845): 식후혈당·HbA1c·중성지방 유의미 개선
  2) 이소말툴로스 대체 RCT(PMID 22492584, n=101): 중성지방은 감소했으나 HbA1c는 군간 유의차 없음(null)
  3) 유청단백+저항운동 RCT(PMID 37239618, n=26 소규모): 혈당·기능수행 유의차 없음, 근력은 일부 개선
  4) 크롬 피콜리네이트 RCT(PMID 32395440, n=52): HOMA-IR·지질 일부 개선하나 공복혈당·체중은 유의차 없음
  5) 저항성 말토덱스트린 RCT(PMID 32742646, n=16, 건강인 대상·T2DM 환자 아님): 식후혈당·인슐린 반응 감소
  6) ADA Standards of Care 2024(PMID 38078590): 지중해식·MUFA는 B등급 권장 / 크롬·비타민D 등 보충제는 혈당개선 목적으로 비권고(C)
- 기능성 원료 후보 근거등급: 이소말툴로스 B, 유청단백질분리물(WPI) B, 고올레산해바라기유(MUFA) A, 저항성말토덱스트린 B, MCT오일 C(당뇨 특이적 근거 미확인), 크롬피콜리네이트 C(ADA 비권고), 비타민D+마그네슘 C(ADA 비권고)

[규칙]
- 위 목록에 없는 새로운 숫자를 지어내지 말 것. 필요하면 "정확한 수치는 확인 필요"라고 말할 것.
- 추정치·가상 표본을 인용할 때는 반드시 "추정치" 또는 "가상 표본"이라는 표현을 포함할 것.
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~2문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠ 표시만 예외).
`.trim();

export const STEP2_TURN_PLAN: DiscussionTurn[] = [
  {
    id: 1,
    agent: "clio",
    type: "action",
    tool: "PubMed + Guideline Lookup",
    guidance: "이 제품의 타깃 건강이슈에 맞는 임상 니즈를 최신 가이드라인(FACTS의 데이터 기준)과 PubMed에서 조회하기 시작한다고 아주 짧게 알린다. 아직 결론은 내지 않는다.",
    fallbackMsg: "타깃 건강이슈 임상 니즈 · 관련 가이드라인·PubMed 파싱 중",
  },
  {
    id: 2,
    agent: "clio",
    type: "finding",
    revealsSection: "papers",
    guidance: "FACTS에 있는 채택 논문들 중 근거 강도가 가장 강한 영역과 근거가 약하거나 유의차 없는 항목을 함께 짧게 보고한다.",
    fallbackMsg: "채택 논문 검토 완료 · 핵심 성분 근거 강도 확인, 일부 성분은 유의차 없음(null) 주의",
  },
  {
    id: 3,
    agent: "clio",
    type: "insight",
    revealsSection: "nutrition",
    guidance: "FACTS의 영양 목표치(탄수/단백/지방/GI 등)를 근거로, 이 제품의 건강이슈에 최적화된 핵심 배합 축이 왜 근거 기반 최적 설계인지 설명한다.",
    fallbackMsg: "핵심 배합 3축, 표준제조기준 대비 근거 기반 최적 설계 확인",
  },
  {
    id: 4,
    agent: "rega",
    type: "flag",
    guidance: "이 제품 카테고리에 해당하는 표준제조기준 또는 규제 기준 준수 필요성을 경고 형태로 짧게 언급한다. ⚠ 표시를 사용해도 좋다.",
    fallbackMsg: "⚠ 해당 카테고리 표준제조기준 준수 필요",
  },
  {
    id: 5,
    agent: "clio",
    type: "acknowledge",
    revealsSection: "ingredients",
    guidance: "FACTS의 후보 원료들의 근거등급을 요약하고, 관련 가이드라인에서 비권고 또는 주의가 필요한 성분에 대한 임상적 주의를 함께 밝힌다.",
    fallbackMsg: "후보 원료 근거등급 확정 · 일부 성분 가이드라인 비권고 주의 필요",
  },
  {
    id: 6,
    agent: "clio",
    type: "handoff",
    to: "rena",
    guidance: "영양 기준·기능성 도출 결론을 한 문장으로 요약하고, 다음 단계인 기능성분 배합설계를 위해 RENA에게 인계한다는 짧은 문장.",
    fallbackMsg: "기능성분 배합설계 → RENA 인계",
  },
];
