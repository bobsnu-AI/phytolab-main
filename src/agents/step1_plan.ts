// STEP 1 (시장조사) Multi-Agent 라이브 논의 플랜
//
// 설계 원칙(하이브리드 방식):
//  - "무엇을 말할 차례인지 / 어떤 패널 섹션이 이 발언으로 도출되는지"는 서버가 결정(FIXED PLAN).
//  - "그 차례에 실제로 뭐라고 말하는지(msg)"는 매 세션마다 LLM이 실시간 생성(LIVE).
//  - LLM은 FACTS 블록에 없는 숫자를 새로 만들어낼 수 없고, 추정치는 반드시 추정치라고 밝히도록 강제.
//  - LLM 호출 실패/타임아웃 시 fallbackMsg로 자동 대체(발표 중 끊김 방지).
//  - guidance/fallbackMsg는 제품명·카테고리에 의존하지 않는 범용 표현 사용 (동적 치환은 live_discussion.ts가 담당).
import type { AgentId } from "./personas";

export interface Step1Turn {
  id: number;
  agent: AgentId;
  type: "action" | "finding" | "support" | "insight" | "concern" | "conclusion" | "handoff";
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
// ※ 아래 FACTS는 GLUCARE-M(당뇨 프리셋) 전용. dataset 쿼리가 있으면 live_discussion.ts의 buildFactsFromDataset으로 교체됨.
export const STEP1_FACTS = `
[검증된 출처 데이터 — 이 안의 숫자만 인용 가능]
- 국내 특수의료용도식품(FSMP) 시장: 2024년 6,374억원 → 2033년 1조8,860억원 전망 (출처: 농촌진흥청 발표, 2025-10)
- 글로벌 Medical Foods 시장: 2025년 255억 달러, CAGR 5.1% (2026–2035) (출처: Research Nester)
- 국내 30세 이상 당뇨병 유병률: 15.5% (남 18.1%·여 13.0%), 환자 약 533만명 (출처: 대한당뇨병학회 Diabetes Fact Sheets 2024, PMID 39828976, 2021–2022년 국민건강영양조사 기반)
- 특수의료용도식품 급여화 논의 진행 중, B2B 채널 확대 흐름 (출처: 삼정KPMG Medical Foods 트렌드 리포트, 2024-12)
- 경쟁 SKU 프로필(시연용 5개): A사 뉴케어DM(액상 200ml·24팩, 이소말툴로스24g+단백12g, 판가42,000원, 평점4.3, 리뷰5,820건, 병원·D2C, 근거강도6.4/10(추정)), B사 그린비아DM(분말스틱30포, 저GI복합탄수+크롬, 판가38,000원, 평점4.1, 리뷰3,140건, 약국·D2C, 근거강도5.2/10(추정)), C사 인슐렌(액상250ml·24팩, MUFA강화+식이섬유6g, 판가48,000원, 평점4.4, 리뷰4,210건, 요양시설·병원, 근거강도7.6/10(추정)), D사 글루세나(액상237ml·24팩, 이소말툴로스+MUFA, 판가54,000원, 평점4.6, 리뷰8,940건, 글로벌·병원, 근거강도8.7/10(추정, 시장 내 최고)), E사 메디케어D(액상200ml·24팩, 표준균형영양+크롬, 판가39,000원, 평점4.0, 리뷰2,670건, 요양시설, 근거강도5.8/10(추정))
- GLUCARE-M(제안) 목표 포지션: 판가 45,000원(24팩), 근거강도 8.8/10(목표, D사와 경쟁 가능한 수준)

[Agent 추정치 — 공개 세그먼트/채널 통계 부재로 Agent가 추정한 값. 반드시 "추정치"라고 밝히고 인용할 것]
- FSMP 세그먼트별 점유율·성장률(추정): 당뇨환자용 34%·성장률16.2%, 고령친화 26%·18.4%, 암환자용 18%·12.1%, 신장질환용 12%·8.7%, 연하곤란 10%·22.3%
- 유통채널 구조(추정): 병원 38%(CAC낮음), 요양시설B2B 27%(CAC낮음), 온라인D2C 21%(CAC중간), 약국·H&B 14%(CAC중간) → 병원+요양시설 B2B 합산 약 65%
- 스캔 SKU 수: 218개 중 상위 62개 분석, 최종 5개 채택 (Agent 추정 스캔 규모)
- 평균 판가 밴드(추정): 38,000–54,000원 (경쟁사 벤치마킹 기준)
- 근거강도 점수(6.4~8.7)는 임상근거 문헌 수·품질을 종합한 Agent 자체 추정 스코어이며 공식 인증 지표가 아님
- 리뷰 24,780건 파싱 분석 (Agent 추정 표본 규모)
- 리뷰 긍정 시그널(고빈도 키워드): 혈당 안정, 식후 완만, 의사 추천, 저작 부담↓, 편의성, 급여지원, 체중 유지, 부담 없는 맛
- 리뷰 부정 시그널(고빈도 키워드): 인공감미료, 가격 부담, 단조로운 맛, 환자만 별도식, 급여 미지원, 질감·목넘김, 장기복용 어려움, 포장 폐기

[커뮤니티 리서치 — 실제 수집 데이터, 네이버 카페 "당뇨와건강"(dangsamo) 후기·체험단 게시판]
- 표본: 공개 게시글 12건 실제 수집 (무슈콘 저당간식 후기 4건, 햇반 라이스플랜 즉석밥 후기 3건, 피코링 CGM 기기 후기 3건, 그린비아 당케어 후기 2건) → 형태소분석(명사 추출) 후 LDA 토픽모델링 3개 토픽 추출, 어휘 134개
- Topic A "혈당관리·CGM 루틴" (문서 5건 배정): 혈당, 잡곡밥, 관리, 식이섬유, 연속혈당측정기, 단백질, 현미, 루피니빈, 렌틸콩
- Topic B "저당 간식 대체" (문서 4건 배정): 무슈콘, 스콘, 식단, 탄수화물, 단백질, 아몬드, 밀가루, 저당, 치즈, 부담, 간식
- Topic C "환자용 영양식 대용식" (문서 3건 배정): 케어, 식사, 아침, 그린비아, 정식품, 대용, 환자, 필요, 식품, 영양, 섭취
- 이 LDA 표본(n=12)은 소규모 실증 수집 결과이며 통계적 대표성은 제한적임 — 반드시 "소규모 표본(n=12) 기반"이라고 밝히고 인용할 것. 향후 상시 수집 파이프라인으로 확장 예정.

[규칙]
- 위 목록에 없는 새로운 숫자를 지어내지 말 것. 필요하면 "정확한 수치는 확인 필요"라고 말할 것.
- 추정치를 인용할 때는 반드시 "추정치" 또는 "Agent 추정"이라는 표현을 포함할 것.
- 커뮤니티 LDA 데이터를 인용할 때는 반드시 "소규모 표본(n=12)"이라는 표현을 포함할 것.
- 같은 팀 소속 Agent들과 대화하듯, 직전 발언들을 참고해서 자연스럽게 이어갈 것 (같은 말 반복 금지).
- 1~3문장, 한국어, 존댓말. 이모지 금지(REGA의 ⚠ 표시만 예외, 이번 턴엔 해당 없음).
`.trim();

export const STEP1_TURN_PLAN: Step1Turn[] = [
  {
    id: 1,
    agent: "mara",
    type: "action",
    tool: "Market Data API",
    guidance: "이 제품 카테고리의 시장 추이 데이터를 관련 출처에서 조회하기 시작한다고 아주 짧게 알린다. 아직 결론은 내지 않는다.",
    fallbackMsg: "해당 카테고리 시장 추이 조회 · 관련 기관 데이터 병렬 파싱 중",
  },
  {
    id: 2,
    agent: "clio",
    type: "support",
    revealsSection: "context",
    guidance: "임상영양 관점에서 FACTS의 유병률·타깃 인구 수치와 정책 동향을 검증된 수치로 보고한다.",
    fallbackMsg: "타깃 건강이슈 유병률과 실질 수요 확인 · 정책 동향 파악 완료",
  },
  {
    id: 3,
    agent: "mara",
    type: "finding",
    revealsSection: "kpi",
    guidance: "FACTS에 있는 국내·글로벌 시장 규모와 성장률을 보고한다.",
    fallbackMsg: "국내·글로벌 시장 규모 및 성장률 확인 완료",
  },
  {
    id: 4,
    agent: "mara",
    type: "finding",
    revealsSection: "segments",
    guidance: "FACTS의 세그먼트별 점유율·성장률 추정치를 근거로 이 제품이 진입할 세그먼트의 매력도를 설명한다. 추정치임을 명시한다.",
    fallbackMsg: "핵심 세그먼트 점유율·성장률 상위권 확인 (Agent 추정)",
  },
  {
    id: 5,
    agent: "mara",
    type: "finding",
    revealsSection: "channels",
    guidance: "FACTS의 유통채널 구조와 주요 채널 비중을 추정치로 보고한다. 추정치임을 명시한다.",
    fallbackMsg: "주요 유통채널 구조 및 비중 파악 (Agent 추정)",
  },
  {
    id: 6,
    agent: "finn",
    type: "support",
    guidance: "직전 MARA의 채널 비중 발언을 받아, 원가·SCM 관점에서 주요 채널의 CAC와 계약 안정성 측면의 장점을 짧게 보강한다.",
    fallbackMsg: "주요 채널의 CAC 우위와 계약 기반 수요 안정성 확인",
  },
  {
    id: 7,
    agent: "mara",
    type: "action",
    tool: "SKU Scanner",
    guidance: "경쟁 SKU를 스캔·매트릭스화하기 시작한다고 짧게 알린다 (스캔 규모는 추정치). 아직 결론은 내지 않는다.",
    fallbackMsg: "경쟁 SKU 스캔 · 매트릭스화 착수 (추정치)",
  },
  {
    id: 8,
    agent: "mara",
    type: "finding",
    revealsSection: "positioning",
    guidance: "경쟁 제품들의 근거강도 분포를 확인하고, 이 제품이 진입할 수 있는 포지셔닝 공백을 짧게 제시한다.",
    fallbackMsg: "경쟁 근거강도 분포 확인 · 포지셔닝 공백 식별 (추정치)",
  },
  {
    id: 9,
    agent: "rena",
    type: "support",
    guidance: "MARA의 포지셔닝 발언을 받아, 배합·제형 관점에서 해당 포지션을 달성하기 위한 핵심 원료·스펙 접근법을 짧게 화답한다.",
    fallbackMsg: "핵심 원료·스펙 배합으로 목표 포지션 달성 가능",
  },
  {
    id: 10,
    agent: "finn",
    type: "concern",
    guidance: "글로벌 경쟁사 대비 원가 경쟁력 리스크를 원가·SCM 관점에서 짧게 제기한다.",
    fallbackMsg: "글로벌 대비 원가 불리 가능성 · 원료 공급사 견적 비교 필요",
  },
  {
    id: 11,
    agent: "mara",
    type: "finding",
    revealsSection: "matrix",
    guidance: "FACTS의 경쟁 SKU 가격 밴드에서 이 제품의 목표 판가가 어느 위치에 있는지 짧게 설명한다.",
    fallbackMsg: "목표 판가, 경쟁 밴드 내 중간대 위치 확인",
  },
  {
    id: 12,
    agent: "mara",
    type: "insight",
    revealsSection: "nutrition_compare",
    guidance: "영양 조성 비교에서 이 제품이 경쟁 평균 대비 우위를 보이는 핵심 지표를 FACTS 기준으로 짧게 짚는다.",
    fallbackMsg: "핵심 영양 지표, 경쟁 평균 상회 설계 확인",
  },
  {
    id: 13,
    agent: "mara",
    type: "finding",
    revealsSection: "reviews",
    guidance: "FACTS의 리뷰 분석 결과에서 공통 부정 시그널(Pain Point)을 언급한다. 표본 규모는 추정치임을 명시한다.",
    fallbackMsg: "리뷰 분석(추정치): 공통 부정 시그널 확인",
  },
  {
    id: 14,
    agent: "mara",
    type: "action",
    tool: "Community LDA Scanner",
    guidance: "소비자 커뮤니티 공개 게시글에서 형태소분석+LDA 토픽모델링을 실행하기 시작한다고 짧게 알린다. 아직 결론은 내지 않는다.",
    fallbackMsg: "소비자 커뮤니티 공개 게시글 형태소분석 → LDA 토픽모델링 실행",
  },
  {
    id: 15,
    agent: "mara",
    type: "finding",
    revealsSection: "concept_pod",
    guidance: "FACTS의 LDA 결과 기준으로 도출된 소비자 토픽들을 보고하고, 각 토픽이 시사하는 소비자 니즈의 공통점을 짧게 짚는다. 소규모 표본임을 명시한다.",
    fallbackMsg: "LDA 소규모 표본: 주요 소비자 니즈 토픽 3가지 분리 확인",
  },
  {
    id: 16,
    agent: "clio",
    type: "support",
    guidance: "MARA가 짚은 소비자 토픽 중 임상적으로 가장 설득력 있는 행동 패턴에 대해 짧게 화답한다.",
    fallbackMsg: "소비자 행동 패턴, 임상적으로도 설득력 있는 토픽 확인",
  },
  {
    id: 17,
    agent: "mara",
    type: "insight",
    guidance: "FACTS의 토픽을 Pain Point로 재정리한다: 기존 제품에서 반복되는 3갈래 불만을 짧게 정리한다.",
    fallbackMsg: "Pain Point 3갈래: 기존 제품의 공통 불만 요인 정리",
  },
  {
    id: 18,
    agent: "mara",
    type: "insight",
    guidance: "위 Pain Point를 근거로 이 제품의 POD(Point of Difference)를 FACTS의 pod 필드에서 한 문장으로 제시한다.",
    fallbackMsg: "POD 한 문장: 이 제품만의 차별화 포인트 제시",
  },
  {
    id: 19,
    agent: "mara",
    type: "conclusion",
    revealsSection: "conclusion",
    guidance: "지금까지 나온 검증된 수치와 추정치를 종합해서, 이 카테고리 매력도에 대한 결론과 진입전략을 FACTS 기반으로 제시한다.",
    fallbackMsg: "카테고리 매력도 확인 · FACTS 기반 진입전략 제시",
  },
  {
    id: 20,
    agent: "mara",
    type: "handoff",
    to: "clio",
    guidance: "시장조사·경쟁 분석 결론을 요약하고, 다음 단계인 영양 기준 설정·기능성 도출을 위해 CLIO에게 인계한다는 짧은 한 문장.",
    fallbackMsg: "영양 기준·기능성 도출 단계로 CLIO에게 인계합니다",
  },
];
