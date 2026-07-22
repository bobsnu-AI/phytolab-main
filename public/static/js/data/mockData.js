// FSMP · 당뇨환자용 영양조제식품 데이터 목업
// 국내 식약처 「특수의료용도식품 표준제조기준」 및 대한당뇨병학회·ESPEN·ADA 가이드라인 기반

window.PHYTO_DATA = {
  product: {
    codename: "GLUCARE-M v0.4",
    tagline: "2형 당뇨환자용 균형영양 액상 · 저GI 지속혈당",
    target: "2형 당뇨 성인 · 재택·요양시설·병원식",
    format: "액상 200ml × 24팩/박스",
    category: "특수의료용도식품",
    subcategory: "당뇨환자용 영양조제식품",
    regClass: "식약처 고시 제2023-XX호",
  },

  // Step 1: 시장조사
  // ※ 시장 규모(domestic/global)와 context.prevalence는 실제 공개 출처(sources.js 참조) 확인.
  //   segments/trends/channels는 공개 세그먼트 통계 부재로 Agent 추정치(agent_estimate)임을 명시.
  market: {
    domestic: { size: 6374, unit: "억원", cagr: 12.8, year: 2024, sourceKey: "rda_fsmp_market", cagrNote: "2024→2033 성장분 환산 (RDA 발표치 기반 역산)" },
    global: { size: 25.5, unit: "십억USD", cagr: 5.1, year: 2025, sourceKey: "medicalfoods_global" },
    segmentsSourceKey: "agent_estimate",
    channelsSourceKey: "agent_estimate",
    trendsSourceKey: "agent_estimate",
    segments: [
      { label: "당뇨환자용 영양조제식품", share: 34, growth: 16.2, hot: true },
      { label: "고령친화 균형영양식", share: 26, growth: 18.4, hot: true },
      { label: "암환자용 영양보충", share: 18, growth: 12.1 },
      { label: "신장질환용 영양식", share: 12, growth: 8.7 },
      { label: "연하곤란·점도조절식", share: 10, growth: 22.3, hot: true },
    ],
    trends: [
      { q: "1Q24", diabetes: 42, oncol: 22, renal: 18, dysphagia: 20 },
      { q: "2Q24", diabetes: 48, oncol: 26, renal: 20, dysphagia: 26 },
      { q: "3Q24", diabetes: 55, oncol: 29, renal: 22, dysphagia: 33 },
      { q: "4Q24", diabetes: 62, oncol: 32, renal: 24, dysphagia: 41 },
      { q: "1Q25", diabetes: 71, oncol: 36, renal: 27, dysphagia: 52 },
      { q: "2Q25", diabetes: 82, oncol: 40, renal: 29, dysphagia: 64 },
    ],
    channels: [
      { name: "병원·의료기관", share: 38, cac: "낮음" },
      { name: "요양시설 B2B", share: 27, cac: "낮음" },
      { name: "온라인 D2C", share: 21, cac: "중간" },
      { name: "약국·H&B", share: 14, cac: "중간" },
    ],
    context: {
      prevalence: "당뇨 유병률 15.5% · 환자 약 533만명 (30세 이상, 2021–2022년 조사)",
      prevalenceSourceKey: "kda_factsheet",
      unmet: "식사관리 어려움·처방식 수요 확대 (Agent 추정 · 공개 서베이 미확인)",
      unmetSourceKey: "agent_estimate",
      policy: "특수의료용도식품 급여화 논의 · B2B 채널 확대",
      policySourceKey: "kpmg_medicalfoods",
    },
  },

  // Step 2: 환자 프로파일링
  target: {
    persona: {
      name: "이성재 (62세)",
      job: "은퇴 · 자영업",
      condition: "2형 당뇨 12년차 · HbA1c 7.8% · 경증 신부전 초기",
      symptoms: ["식후 혈당 스파이크", "체중감소", "근감소증(사르코페니아)", "식사 준비 부담", "저작 저하"],
      meds: "메트포르민 · SGLT2 억제제",
      family: "부부 2인 가구 · 자녀 격주 방문",
      channel: "종합병원 외래 · 약국 · 온라인 (자녀 대리구매)",
    },
    painPoints: [
      { pain: "식후 혈당 스파이크", freq: 82, severity: 8.6, unmet: 7.9 },
      { pain: "체중·근육량 감소", freq: 71, severity: 8.2, unmet: 8.4 },
      { pain: "식사 준비·계산 부담", freq: 78, severity: 7.4, unmet: 8.1 },
      { pain: "저혈당 위험 (야간)", freq: 54, severity: 8.9, unmet: 7.2 },
      { pain: "미량영양소 결핍", freq: 62, severity: 6.8, unmet: 6.9 },
      { pain: "저작·연하 저하", freq: 41, severity: 7.1, unmet: 7.8 },
    ],
    // ※ 아래 6건은 PubMed 등재 확인 완료(실제 논문). effect는 원문 초록 결과를 그대로 반영 —
    //   일부는 통계적으로 유의하지 않거나(null) 소규모 표본인 점까지 정직하게 표기함.
    papersSearchNote: "PubMed(pubmed.ncbi.nlm.nih.gov) 키워드 검색 · 수동 초록 검토로 채택",
    papers: [
      {
        title: "Diabetes-specific formulas high in monounsaturated fatty acids and metabolic outcomes in patients with diabetes: a meta-analysis",
        journal: "Clinical Nutrition", year: 2020, n: "845 (18 RCT)",
        effect: "메타분석: 식후혈당·HbA1c·중성지방 유의미 개선 (MUFA 강화 제형)",
        key: "고MUFA 당뇨환자용 제형 vs 표준 제형", pmid: "32222291", sourceKey: "pmid_32222291",
      },
      {
        title: "Metabolic effects of replacing sucrose by isomaltulose in subjects with type 2 diabetes",
        journal: "Diabetes Care", year: 2012, n: "101",
        effect: "△ 중성지방은 감소했으나 HbA1c는 군간 유의차 없음 (null)",
        key: "이소말툴로스 vs 설탕 대체 · RCT", pmid: "22492584", sourceKey: "pmid_22492584",
      },
      {
        title: "Influence of whey protein on muscle strength, glycemic control and functional tasks in older adults with T2DM (resistance exercise RCT)",
        journal: "Int J Environ Res Public Health", year: 2023, n: "26 (소규모)",
        effect: "△ 혈당·기능 수행능력 유의차 없음 · 근력은 저항운동 부하 기준상 일부 개선",
        key: "유청단백 + 저항운동 병행 · 소규모 RCT", pmid: "37239618", sourceKey: "pmid_37239618",
      },
      {
        title: "Effects of chromium picolinate supplementation on cardiometabolic biomarkers in patients with T2DM",
        journal: "Clinical Nutrition Research", year: 2020, n: "52",
        effect: "HOMA-IR·지질 일부 개선, 공복혈당·체중은 유의차 없음",
        key: "크롬 피콜리네이트 RCT (단, ADA 가이드라인은 보충제 자체는 비권고)", pmid: "32395440", sourceKey: "pmid_32395440",
      },
      {
        title: "Attenuation of glycaemic and insulin responses following tapioca resistant maltodextrin consumption",
        journal: "Journal of Nutritional Science", year: 2020, n: "16 (건강인 대상)",
        effect: "건강한 성인에서 식후혈당·인슐린 반응 감소 — T2DM 환자 대상 아님(적용 시 외삽 주의)",
        key: "저항성 말토덱스트린 · 교차설계 RCT", pmid: "32742646", sourceKey: "pmid_32742646",
      },
      {
        title: "American Diabetes Association Standards of Care in Diabetes—2024 (Medical Nutrition Therapy, Sec.5)",
        journal: "Diabetes Care (ADA)", year: 2024, n: "가이드라인",
        effect: "권고 5.20 지중해식·MUFA B등급 권장 / 권고 5.21 크롬·비타민D 등 보충제는 혈당개선 목적 비권고(C)",
        key: "공식 임상영양 가이드라인 · 근거등급 포함", pmid: "38078590", sourceKey: "pmid_38078590",
      },
    ],
    // evidenceCaveat: ADA 2024 권고 5.21에 따라 크롬은 "혈당 개선 목적 보충제로 권장하지 않음" — 아래 evidence 등급은
    // 개별 RCT 근거이며 공식 가이드라인의 반대 권고가 있다는 점을 UI에 병기해야 함.
    ingredients: [
      { name: "이소말툴로스 (저GI 탄수)", evidence: "B", dose: "30g", cost: 3, sourceKey: "pmid_22492584", note: "HbA1c 유의차 없음(null) · 혈당지수 자체 효과는 별도 근거" },
      { name: "유청단백질 분리물 (WPI)", evidence: "B", dose: "18g", cost: 5, sourceKey: "pmid_37239618", note: "소규모 RCT(n=26) · 혈당 유의차 없음" },
      { name: "고올레산 해바라기유 (MUFA)", evidence: "A", dose: "9g", cost: 3, sourceKey: "pmid_32222291", note: "메타분석(18 RCT) 유의미 개선 · ADA 5.20 권고(B)" },
      { name: "저항성 말토덱스트린 (식이섬유)", evidence: "B", dose: "6g", cost: 2, sourceKey: "pmid_32742646", note: "건강인 대상 연구 · T2DM 외삽 주의" },
      { name: "MCT 오일 (중쇄중성지방)", evidence: "C", dose: "3g", cost: 4, sourceKey: "agent_estimate", note: "당뇨 특이적 RCT 근거 미확인" },
      { name: "크롬 피콜리네이트", evidence: "C", dose: "50μg", cost: 2, sourceKey: "pmid_38078590", note: "⚠ ADA 5.21: 혈당개선 목적 보충제 비권고(개별 RCT는 일부 긍정적)" },
      { name: "비타민 D3 + 마그네슘", evidence: "C", dose: "10μg+80mg", cost: 2, sourceKey: "pmid_38078590", note: "⚠ ADA 5.21: 결핍 없는 경우 혈당개선 목적 비권고" },
    ],
    nutritionTarget: {
      calories: { value: 200, unit: "kcal/팩", note: "1식 대체 · 저열량 밸런스" },
      carbRatio: { value: 45, unit: "%en", note: "ADA·KDA 45-50% 권고" },
      proteinRatio: { value: 20, unit: "%en", note: "고령 근감소 예방 강화" },
      fatRatio: { value: 35, unit: "%en", note: "MUFA >2/3 비중" },
      giIndex: { value: 28, unit: "GI", note: "저GI (<55) 기준 충족" },
      sodium: { value: 180, unit: "mg", note: "저나트륨 (기준 <200)" },
    },
  },

  // Step 3: 경쟁 분석
  competitors: [
    { brand: "A사 뉴케어DM", format: "액상 200ml", key: "이소말툴로스 24g · 단백 12g", price: 42000, size: "24팩/박스", claim: "혈당 관리용", rating: 4.3, reviews: 5820, channel: "병원·D2C" },
    { brand: "B사 그린비아DM", format: "분말스틱", key: "저GI 복합탄수 · 크롬", price: 38000, size: "30포/박스", claim: "당뇨 균형영양", rating: 4.1, reviews: 3140, channel: "약국·D2C" },
    { brand: "C사 인슐렌", format: "액상 250ml", key: "MUFA 강화 · 식이섬유 6g", price: 48000, size: "24팩/박스", claim: "당뇨환자 영양", rating: 4.4, reviews: 4210, channel: "요양시설·병원" },
    { brand: "D사 글루세나", format: "액상 237ml", key: "이소말툴로스 + MUFA", price: 54000, size: "24팩/박스", claim: "혈당 안정화", rating: 4.6, reviews: 8940, channel: "글로벌·병원" },
    { brand: "E사 메디케어D", format: "액상 200ml", key: "표준 균형영양 + 크롬", price: 39000, size: "24팩/박스", claim: "당뇨 영양보충", rating: 4.0, reviews: 2670, channel: "요양시설" },
  ],

  // Step 4: 배합설계 (초안) — 200ml 액상 1팩 기준
  formula: {
    servingSize: 200, // ml per pack
    servingsPerBox: 24,
    kcalPerServing: 200,
    ingredients: [
      // amount는 g 단위 (액상), price는 원/g
      { id: "iso",  name: "이소말툴로스 (저GI 탄수)",        amount: 22, unit: "g", role: "탄수",  price: 8,   moq: 100, yieldPct: 99 },
      { id: "rmd",  name: "저항성 말토덱스트린 (식이섬유)",   amount: 6,  unit: "g", role: "탄수",  price: 12,  moq: 50,  yieldPct: 99 },
      { id: "wpi",  name: "유청단백질 분리물 (WPI 90%)",       amount: 10, unit: "g", role: "단백",  price: 35,  moq: 25,  yieldPct: 97 },
      { id: "cas",  name: "카제인 나트륨",                     amount: 3,  unit: "g", role: "단백",  price: 22,  moq: 25,  yieldPct: 98 },
      { id: "mufa", name: "고올레산 해바라기유",                amount: 6,  unit: "g", role: "지방",  price: 14,  moq: 100, yieldPct: 99 },
      { id: "mct",  name: "MCT 오일 (C8·C10)",                 amount: 2,  unit: "g", role: "지방",  price: 45,  moq: 20,  yieldPct: 99 },
      { id: "vm",   name: "비타민·미네랄 프리믹스 (26종)",     amount: 1.2, unit: "g", role: "미량", price: 220, moq: 5,   yieldPct: 98 },
      { id: "cr",   name: "크롬 피콜리네이트 (0.1%)",           amount: 0.05, unit: "g", role: "미량", price: 480, moq: 5,   yieldPct: 99 },
      { id: "emul", name: "레시틴 · 유화안정제",               amount: 0.8, unit: "g", role: "안정", price: 18,  moq: 50,  yieldPct: 100 },
      { id: "flav", name: "바닐라·커피 향미",                   amount: 0.3, unit: "g", role: "관능", price: 320, moq: 20,  yieldPct: 100 },
      { id: "sw",   name: "수크랄로스 · 아세설팜K",             amount: 0.05, unit: "g", role: "감미", price: 850, moq: 5,   yieldPct: 100 },
      { id: "wat",  name: "정제수 (담체)",                     amount: 148.6, unit: "g", role: "담체", price: 0.5, moq: 1000, yieldPct: 100 },
    ],
    flavors: ["바닐라", "커피", "곡물", "무향"],
    formats: ["액상팩 200ml", "액상팩 250ml", "분말스틱", "액상 리큐베이스"],
  },

  // Step 5: 원가 파라미터
  cost: {
    packaging: {
      liquidPack: 240,     // 원/팩 (레토르트 파우치 + 알루미늄)
      outerBox: 620,       // 원/박스(24팩)
      shipperBox: 180,     // 원/박스 (분산)
      label: 120,          // 원/박스
      sterilization: 480,  // 원/박스 (레토르트 살균)
    },
    overhead: {
      labor: 780,          // 액상 라인은 노무비 높음
      utility: 340,
      qa: 320,             // FSMP는 검사 강화
      depreciation: 420,
      logistics: 380,      // 냉장 없이 상온 유통 가능
    },
    target: {
      wholesaleMarkup: 1.7,
      retailMarkup: 2.3,
      msrp: 45000,
    },
  },
};
