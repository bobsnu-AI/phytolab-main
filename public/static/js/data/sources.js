// 출처 레지스트리 — 화면에 표시되는 수치/주장의 근거를 추적
// verified: true  → 공개기관·동료심사 문헌 등 실제 확인 가능한 출처 (원문 링크 제공)
// verified: false → 프로토타입 시연을 위한 Agent 추정치 (공개 데이터 부재 · 실제 서비스 시 교체 필요)
window.SOURCES = {
  // ---- 시장 통계 ----
  rda_fsmp_market: {
    org: "농촌진흥청 (보도, 농민신문)",
    label: "국내 특수의료용도식품 시장 규모 전망 (2024→2033)",
    detail: "2024년 6,374억원 → 2033년 1조8,860억원 전망",
    url: "https://www.nongmin.com/article/20251014500532",
    verified: true,
    asOf: "2025-10",
  },
  medicalfoods_global: {
    org: "Research Nester",
    label: "Medical Foods Market Report",
    detail: "2025년 글로벌 시장 규모 255억 달러 추정",
    url: "https://www.researchnester.com/kr/reports/medical-foods-market/6298",
    verified: true,
    asOf: "2025-09",
  },
  kda_factsheet: {
    org: "대한당뇨병학회 (KDA) · Diabetes Fact Sheets in Korea 2024 (Diabetes Metab J, PMID 39828976)",
    label: "국내 30세 이상 당뇨병 유병률 및 환자 수 (2021–2022 국민건강영양조사 기반)",
    detail: "유병률 15.5% (남 18.1%·여 13.0%) · 환자 약 533만명",
    url: "https://pubmed.ncbi.nlm.nih.gov/39828976/",
    verified: true,
    asOf: "2024-10 발표 (2021–2022년 데이터)",
  },
  kpmg_medicalfoods: {
    org: "삼정KPMG",
    label: "Medical Foods 산업 트렌드 리포트",
    detail: "특수의료용도식품 급여화 논의 및 시장 진출 동향",
    url: "https://assets.kpmg.com/content/dam/kpmg/kr/pdf/2024/business-focus/kpmg-korea-medicalfoods-trend-20241201.pdf",
    verified: true,
    asOf: "2024-12",
  },
  mfds_fsmp_standard: {
    org: "식품의약품안전처",
    label: "식품의 기준 및 규격 · 특수의료용도등식품 표준제조기준",
    detail: "당뇨환자용 영양조제식품 기준규격 고시",
    url: "https://www.mfds.go.kr/brd/m_211/list.do",
    verified: true,
    asOf: "2024",
  },

  // ---- 논문 (실제 PubMed 등재, PMID 확인) ----
  pmid_32222291: {
    org: "PubMed · Clin Nutr",
    label: "Sanz-Paris A, et al. Diabetes-specific formulas high in MUFA and metabolic outcomes: a systematic review and meta-analysis.",
    detail: "PMID 32222291 · 18 RCT, n=845",
    url: "https://pubmed.ncbi.nlm.nih.gov/32222291/",
    verified: true,
    asOf: "2020",
  },
  pmid_22492584: {
    org: "PubMed · Diabetes Care",
    label: "Brunner S, et al. Metabolic effects of replacing sucrose by isomaltulose in subjects with type 2 diabetes: a randomized double-blind trial.",
    detail: "PMID 22492584 · n=101",
    url: "https://pubmed.ncbi.nlm.nih.gov/22492584/",
    verified: true,
    asOf: "2012",
  },
  pmid_37239618: {
    org: "PubMed · Int J Environ Res Public Health",
    label: "Influence of Whey Protein on Muscle Strength, Glycemic Control and Functional Tasks in Older Adults with T2DM in a Resistance Exercise Program (RCT).",
    detail: "PMID 37239618 · n=26 (소규모)",
    url: "https://pubmed.ncbi.nlm.nih.gov/37239618/",
    verified: true,
    asOf: "2023",
  },
  pmid_32395440: {
    org: "PubMed · Clin Nutr Res",
    label: "Talab AT, et al. Effects of Chromium Picolinate Supplementation on Cardiometabolic Biomarkers in Patients with T2DM: a Randomized Clinical Trial.",
    detail: "PMID 32395440 · n=52",
    url: "https://pubmed.ncbi.nlm.nih.gov/32395440/",
    verified: true,
    asOf: "2020",
  },
  pmid_32742646: {
    org: "PubMed · J Nutr Sci",
    label: "Astina J, Sapwarobol S. Attenuation of glycaemic and insulin responses following tapioca resistant maltodextrin consumption: a randomised cross-over trial.",
    detail: "PMID 32742646 · n=16 (건강인 대상, T2DM 환자 아님)",
    url: "https://pubmed.ncbi.nlm.nih.gov/32742646/",
    verified: true,
    asOf: "2020",
  },
  pmid_38078590: {
    org: "PubMed · Diabetes Care (ADA)",
    label: "American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes—2024.",
    detail: "PMID 38078590 · 임상영양요법 가이드라인 포함",
    url: "https://pubmed.ncbi.nlm.nih.gov/38078590/",
    verified: true,
    asOf: "2024",
  },

  // ---- 커뮤니티 실측 데이터 (실제 크롤링 + 실제 LDA) ----
  community_lda: {
    org: "네이버 카페 '당뇨와건강'(dangsamo) · 후기·체험단 게시판",
    label: "공개 게시글 12건 실제 수집 → 형태소분석(kiwipiepy) → LDA 토픽모델링(scikit-learn, 3개 토픽)",
    detail: "소규모 표본(n=12) · 무슈콘 저당간식 4건, 햇반 라이스플랜 3건, 피코링 CGM 3건, 그린비아 당케어 2건. 통계적 대표성은 제한적이며 프로토타입 실증 목적. 현재는 사전계산 결과를 정적 데이터로 내장(A안); 상시 크롤링·실시간 LDA 파이프라인(B안, Cloudflare Queues + 외부 워커)으로 업그레이드 가능한 구조.",
    url: null,
    verified: true,
  },

  // ---- 검증되지 않은 항목 (프로토타입 추정치) ----
  agent_estimate: {
    org: "Phytolab Agent 추정",
    label: "공개 통계 부재 · 시연용 추정치",
    detail: "실제 서비스 전환 시 리서치 Agent가 문헌·구매/처방 데이터로 교체해야 하는 항목입니다.",
    url: null,
    verified: false,
  },
  rule_based_model: {
    org: "규칙 기반 계산",
    label: "AI 예측 모델 아님",
    detail: "원료 투입 비율 기반 선형 근사식으로 추정한 참고값입니다. 실제 관능평가 패널 데이터로 교체 필요.",
    url: null,
    verified: false,
  },
  user_input_required: {
    org: "기업 자체 데이터",
    label: "공급업체 견적 비공개",
    detail: "원료 단가는 공급계약에 따라 상이합니다. 아래 '자사 단가 입력' 탭에서 직접 입력해 정확도를 높이세요.",
    url: null,
    verified: false,
  },
};
