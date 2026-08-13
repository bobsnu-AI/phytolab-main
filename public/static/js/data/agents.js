// Multi-Agent 프로파일 및 스텝별 협업 대화

window.AGENTS = {
  clio: {
    id: "clio",
    name: "CLIO",
    fullName: "Clinical Nutrition Agent",
    role: "임상영양",
    color: "oklch(0.72 0.16 235)",      // ocean blue
    colorSoft: "oklch(from oklch(0.72 0.16 235) l c h / 0.15)",
    expertise: "ESPEN·ADA·KDA 임상영양 가이드라인, 논문 근거 평가, 안전성",
    tools: ["PubMed Search", "Guideline Lookup", "Clinical Trial DB", "Nutrient Interaction"],
    persona: "신중 · 근거 지향",
    initial: "C",
  },
  rena: {
    id: "rena",
    name: "RENA",
    fullName: "R&D Formulation Agent",
    role: "배합·제형",
    color: "oklch(0.78 0.14 195)",      // aqua
    colorSoft: "oklch(from oklch(0.78 0.14 195) l c h / 0.15)",
    expertise: "원료 배합, 액상 안정성, 관능 예측, 시제품 설계",
    tools: ["Formula Generator", "Sensory Predictor", "Stability Model", "USDA/AOAC DB"],
    persona: "실험적 · 창의적",
    initial: "R",
  },
  mara: {
    id: "mara",
    name: "MARA",
    fullName: "Market & Consumer Agent",
    role: "시장·소비자",
    color: "oklch(0.7 0.16 275)",       // indigo
    colorSoft: "oklch(from oklch(0.7 0.16 275) l c h / 0.15)",
    expertise: "시장 트렌드, 경쟁 SKU 벤치마킹, 소비자·의료진 인사이트",
    tools: ["Market Data API", "SKU Scanner", "Review Sentiment", "Channel Analytics"],
    persona: "데이터 중심 · 현장 감각",
    initial: "M",
  },
  finn: {
    id: "finn",
    name: "FINN",
    fullName: "Cost & Supply Agent",
    role: "원가·SCM",
    color: "oklch(0.78 0.16 65)",       // amber
    colorSoft: "oklch(from oklch(0.78 0.16 65) l c h / 0.15)",
    expertise: "원가 산출, 공급망, MOQ 최적화, 채널 손익",
    tools: ["Cost Calculator", "Supplier DB", "MOQ Optimizer", "Batch Simulator"],
    persona: "실용적 · 숫자 중심",
    initial: "F",
  },
  rega: {
    id: "rega",
    name: "REGA",
    fullName: "Regulatory Agent",
    role: "규제·인허가",
    color: "oklch(0.72 0.17 25)",       // rose/red
    colorSoft: "oklch(from oklch(0.72 0.17 25) l c h / 0.15)",
    expertise: "식약처 FSMP 표준제조기준, 표시광고 심의, 인허가",
    tools: ["Regulation Checker", "Label Compliance", "Approval Timeline", "Adverse Event DB"],
    persona: "보수적 · 위험 회피",
    initial: "R",
  },
};

// 스텝별 주도 Agent 및 지원 Agent
window.STEP_LEADS = {
  1: { lead: "mara", support: ["clio", "rena", "finn"] },
  2: { lead: "clio", support: ["mara", "rega"] },
  3: { lead: "rena", support: ["clio", "rega", "finn"] },
  4: { lead: "finn", support: ["mara", "rega"] },
};

// Multi-Agent 대화 스트림
window.MULTI_REASONING = {
  1: [
    { t: "0.4s", agent: "mara", type: "action", tool: "Market Data API", msg: "국내 FSMP 5년 추이 조회 · 식약처·KDA 병렬 파싱" },
    { t: "1.8s", agent: "mara", type: "finding", msg: "CAGR 14.8% · 당뇨환자용 34% 점유 · 성장률 16.2% 최상위" },
    { t: "2.6s", agent: "clio", type: "support", msg: "당뇨 유병률 14.8% · 605만명 실질 수요 확인" },
    { t: "3.4s", agent: "finn", type: "support", msg: "B2B 65% → 초기 CAC 낮음 · 계약 안정성 높음" },
    { t: "4.5s", agent: "mara", type: "conclusion", msg: "카테고리 매력도 A · 병원 우선 → D2C 확장 권장" },
    { t: "5.3s", agent: "mara", type: "handoff", to: "clio", msg: "임상 니즈 정의 → CLIO 인계" },
  ],
  2: [
    { t: "0.3s", agent: "clio", type: "action", tool: "PubMed + Guideline Lookup", msg: "2형 당뇨 임상 니즈 · KDA·ADA 최신본 파싱" },
    { t: "1.5s", agent: "clio", type: "finding", msg: "RCT 42건 · 메타분석 8건 · '식후혈당+근감소증' 미충족 최상위" },
    { t: "2.4s", agent: "clio", type: "insight", msg: "저GI + 고품질 단백 + MUFA 3-축 배합이 근거 기반 최적" },
    { t: "3.2s", agent: "mara", type: "support", msg: "페르소나(62세) 부합 · 재택 환자군 41.8%" },
    { t: "3.9s", agent: "rega", type: "flag", msg: "⚠ 표준제조기준: 탄수 45-50%en · 단백 18-22%en · GI≤55" },
    { t: "4.7s", agent: "clio", type: "acknowledge", msg: "배합 단계에 준수 검증 게이트 반영" },
    { t: "5.5s", agent: "clio", type: "handoff", to: "mara", msg: "SKU 벤치마킹 → MARA 인계" },
  ],
  3: [
    { t: "0.4s", agent: "mara", type: "action", tool: "SKU Scanner", msg: "당뇨환자용 FSMP 218개 SKU 크롤링·매트릭스화" },
    { t: "1.6s", agent: "mara", type: "finding", msg: "글로벌 글루세나 근거 8.7 독보적 · 국내 5-6점대 → 진입 여지" },
    { t: "2.3s", agent: "rena", type: "support", msg: "이소말툴로스 22g+MUFA 6g 근접 시 근거 동등 확보 가능" },
    { t: "3.1s", agent: "finn", type: "concern", msg: "글로벌 대비 원가 불리 · 원료 3사 견적 필요" },
    { t: "4.0s", agent: "mara", type: "insight", msg: "리뷰 24,780건: '인공감미료 잔미'·'단조로운 맛' 공통 부정 시그널" },
    { t: "4.8s", agent: "rena", type: "note", msg: "이중감미 + 바닐라·커피 라인업으로 대응" },
    { t: "5.6s", agent: "mara", type: "handoff", to: "rena", msg: "배합 초안 → RENA 인계" },
  ],
  4: [
    { t: "0.5s", agent: "rena", type: "action", tool: "Formula Generator", msg: "표준제조기준+근거 만족 배합안 12개 생성" },
    { t: "1.7s", agent: "rena", type: "finding", msg: "최적안: 이소말툴로스 22g + WPI 10g + 카제인 3g + MUFA 6g" },
    { t: "2.5s", agent: "clio", type: "review", msg: "단백 13g/식 · 류신 2.4g 확보 · 근거 A 등급 충족" },
    { t: "3.3s", agent: "rega", type: "review", msg: "탄수 46.8%en ✓ 단백 21.2%en ✓ 지방 32.0%en ✓ GI 28 ✓" },
    { t: "4.1s", agent: "rega", type: "flag", msg: "⚠ '근감소 예방' 문구 → '근육량 유지 도움'으로 순화 권고" },
    { t: "4.8s", agent: "rena", type: "concern", msg: "WPI 10g+ 안정성 우려 · 3개월 가속시험 필요" },
    { t: "5.6s", agent: "finn", type: "analysis", msg: "박스당 총원가 ₩13,210 · 마진 70.6%" },
    { t: "6.5s", agent: "clio", type: "vote", msg: "✓ 승인 · 근거 A 등급" },
    { t: "6.8s", agent: "rega", type: "vote", msg: "✓ 승인(조건부) · 라벨 순화 후 최종" },
    { t: "7.1s", agent: "rena", type: "vote", msg: "✓ 승인 · 시제품 배치 가능" },
    { t: "7.4s", agent: "finn", type: "vote", msg: "✓ 승인 · 마진 목표 달성" },
    { t: "7.7s", agent: "mara", type: "vote", msg: "✓ 승인 · 경쟁 대비 스펙 우위" },
    { t: "8.0s", agent: "rena", type: "consensus", msg: "🎉 5/5 만장일치 · Step 5 진행" },
  ],
  5: [
    { t: "0.4s", agent: "finn", type: "action", tool: "Cost Calculator + Batch Simulator", msg: "MOQ·수율·채널 반영 실질 원가 재계산" },
    { t: "1.6s", agent: "finn", type: "finding", msg: "박스당 총원가 ₩13,210 · 부자재·살균 46% · 배치 30k+ 규모 효과" },
    { t: "2.4s", agent: "mara", type: "support", msg: "MSRP ₩45,000 경쟁 밴드 중간대 · 채널 인지 최적" },
    { t: "3.2s", agent: "finn", type: "insight", msg: "병원 수수료 18% · 이익률 27% · 요양시설 30%+ 가능" },
    { t: "4.0s", agent: "rega", type: "concern", msg: "⚠ 급여화 결과 따른 판가 변동 리스크 · 대안 시나리오 필요" },
    { t: "4.8s", agent: "finn", type: "acknowledge", msg: "판가 20% 인하해도 마진 12%+ 확보 가능" },
    { t: "5.6s", agent: "finn", type: "conclusion", msg: "연 108억 매출 · 영업이익 29억(27%) · 3년 내 손익분기" },
  ],
};
