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
    type: "action",
    tool: "SKU Scanner",
    guidance: "시장 규모·채널 분석 다음 단계로, 경쟁 FSMP SKU를 스캔·매트릭스화하기 시작한다고 짧게 알린다 (스캔 규모는 추정치). 아직 결론은 내지 않는다.",
    fallbackMsg: "경쟁 FSMP SKU 스캔 · 매트릭스화 착수 (추정치)",
  },
  {
    id: 8,
    agent: "mara",
    type: "finding",
    revealsSection: "positioning",
    guidance: "D사 글루세나의 근거강도(8.7)가 시장 내 독보적이고, 국내 경쟁사들은 5~6점대에 머물러 있어 GLUCARE-M이 진입할 여지가 있다는 점을 보고한다.",
    fallbackMsg: "D사 글루세나 근거강도 8.7 독보적 · 국내 경쟁사 5-6점대 → 진입 여지 확인(추정치)",
  },
  {
    id: 9,
    agent: "rena",
    type: "support",
    guidance: "MARA의 발언을 받아, 이소말툴로스와 MUFA 배합량을 D사 수준에 근접시키면 근거강도를 동등하게 확보할 수 있다고 배합 관점에서 짧게 화답한다.",
    fallbackMsg: "이소말툴로스·MUFA 배합량을 D사 수준으로 맞추면 근거 동등 확보 가능",
  },
  {
    id: 10,
    agent: "finn",
    type: "concern",
    guidance: "글로벌 D사 대비 원가 경쟁력이 불리할 수 있다는 우려를 원가·SCM 관점에서 짧게 제기한다.",
    fallbackMsg: "글로벌 대비 원가 불리 가능성 · 원료 공급사 견적 비교 필요",
  },
  {
    id: 11,
    agent: "mara",
    type: "finding",
    revealsSection: "matrix",
    guidance: "스펙·가격·채널 비교 매트릭스에서 GLUCARE-M(제안) 목표 판가 45,000원이 경쟁 밴드 중 어디에 위치하는지 짧게 설명한다.",
    fallbackMsg: "GLUCARE-M 목표 판가 45,000원 · 경쟁 밴드(3.8~5.4만원) 중간대 위치",
  },
  {
    id: 12,
    agent: "mara",
    type: "insight",
    revealsSection: "nutrition_compare",
    guidance: "영양 조성 비교에서 GLUCARE-M(제안)이 경쟁 평균 대비 우위를 보이는 지표(예: 단백질·MUFA·나트륨)를 짧게 짚는다.",
    fallbackMsg: "GLUCARE-M 제안 스펙, 단백질·MUFA는 경쟁 평균 상회, 나트륨·당류는 평균 하회로 설계",
  },
  {
    id: 13,
    agent: "mara",
    type: "finding",
    revealsSection: "reviews",
    guidance: "리뷰 파싱 결과에서 나온 공통 부정 시그널(인공감미료 잔미, 단조로운 맛)을 언급한다. 표본 규모는 추정치임을 명시한다.",
    fallbackMsg: "리뷰 24,780건 분석(추정치): '인공감미료 잔미'·'단조로운 맛' 공통 부정 시그널",
  },
  {
    id: 14,
    agent: "mara",
    type: "action",
    tool: "Community LDA Scanner",
    guidance: "리뷰 시그널 다음 단계로, 네이버 카페 '당뇨와건강' 후기·체험단 게시판에서 실제 수집한 공개 게시글 12건에 형태소분석+LDA 토픽모델링을 돌려 소비자 발화 토픽을 추출하기 시작한다고 짧게 알린다. 아직 결론은 내지 않는다.",
    fallbackMsg: "네이버 카페 공개 게시글 12건 형태소분석 → LDA 토픽모델링 실행",
  },
  {
    id: 15,
    agent: "mara",
    type: "finding",
    revealsSection: "concept_pod",
    guidance: "LDA 결과 소규모 표본(n=12) 기준으로 3개 토픽이 뚜렷하게 분리되었음을 보고한다: 혈당관리·CGM 루틴, 저당 간식 대체, 환자용 영양식 대용식. 세 토픽이 시사하는 소비자 니즈의 공통점을 짧게 짚는다.",
    fallbackMsg: "LDA 소규모 표본(n=12): 혈당관리·CGM / 저당간식 대체 / 환자용 대용식 3개 토픽으로 분리",
  },
  {
    id: 16,
    agent: "clio",
    type: "support",
    guidance: "MARA가 짚은 '혈당관리·CGM 루틴' 토픽에 대해, 실제 환자들이 연속혈당측정기(CGM)로 식후 반응을 직접 확인하며 식품을 고른다는 점이 임상적으로도 설득력 있다고 짧게 화답한다.",
    fallbackMsg: "CGM으로 식후 반응 직접 확인하는 환자 행동, 임상적으로도 설득력 있는 토픽",
  },
  {
    id: 17,
    agent: "mara",
    type: "insight",
    guidance: "세 토픽을 Pain Point로 재정리한다: 기존 대용식은 '맛이 단조롭다', 간식류는 '저당인데도 부담된다', 관리 루틴은 '숫자(혈당)에만 의존해 피로하다'는 세 갈래 불만이 공통적으로 관찰된다고 짧게 짚는다.",
    fallbackMsg: "Pain Point 3갈래: 대용식 단조로운 맛 · 저당 간식도 여전한 부담 · 숫자 의존형 관리 피로",
  },
  {
    id: 18,
    agent: "mara",
    type: "insight",
    guidance: "위 Pain Point를 근거로 GLUCARE-M의 POD(Point of Difference)를 한 문장으로 정의한다: '숫자에 의존하지 않고도 맛있게, 매 끼니 혈당 안정을 체감하는 액상 대용식'과 같은 방향으로 짧게 제시한다.",
    fallbackMsg: "POD 한 문장: 숫자 의존 없이 맛으로 혈당 안정을 체감하는 액상 대용식",
  },
  {
    id: 19,
    agent: "mara",
    type: "conclusion",
    revealsSection: "conclusion",
    guidance: "지금까지 나온 검증된 수치와 추정치를 종합해서, 카테고리 매력도에 대한 결론과 진입전략(병원 우선 진입 → D2C 확장)을 제시한다.",
    fallbackMsg: "카테고리 매력도 A · 병원 우선 진입 후 D2C 확장을 권장합니다",
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
