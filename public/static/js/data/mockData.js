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
    targetPrice: 45000,           // 24팩 박스 목표 판가 (경쟁 포지셔닝 맵 · 매트릭스 표시용)
    targetEvidenceStrength: 8.8,  // 목표 근거강도 (경쟁 포지셔닝 맵 Y축)
    positioningSpec: "이소말툴로스 22g + WPI 10g + MUFA",
    positioningClaim: "저GI · 근감소 예방 · 저나트륨",
    positioningRating: 4.7,
    positioningChannel: "병원 → D2C",
  },

  // Step 1: 시장조사
  // ※ 시장 규모(domestic/global)와 context.prevalence는 실제 공개 출처(sources.js 참조) 확인.
  //   segments/channels는 공개 세그먼트 통계 부재로 Agent 추정치(agent_estimate)임을 명시.
  market: {
    headerTitle: "특수의료용도식품 · 당뇨환자용 시장",
    headerDesc: "급여화 논의·고령화·당뇨 유병률 상승 · 병원·요양시설 B2B 65% · 경쟁 SKU 벤치마킹 포함",
    domestic: { size: 6374, unit: "억원", cagr: 12.8, year: 2024, sourceKey: "rda_fsmp_market", cagrNote: "2024→2033 성장분 환산 (RDA 발표치 기반 역산)" },
    global: { size: 25.5, unit: "십억USD", cagr: 5.1, year: 2025, sourceKey: "medicalfoods_global" },
    segmentsSourceKey: "agent_estimate",
    channelsSourceKey: "agent_estimate",
    segments: [
      { label: "당뇨환자용 영양조제식품", share: 34, growth: 16.2, hot: true },
      { label: "고령친화 균형영양식", share: 26, growth: 18.4, hot: true },
      { label: "암환자용 영양보충", share: 18, growth: 12.1 },
      { label: "신장질환용 영양식", share: 12, growth: 8.7 },
      { label: "연하곤란·점도조절식", share: 10, growth: 22.3, hot: true },
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

  // Step 2: 영양 기준 설정 + 맞춤 기능성 도출
  target: {
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
    { brand: "A사 뉴케어DM", format: "액상 200ml", key: "이소말툴로스 24g · 단백 12g", price: 42000, size: "24팩/박스", claim: "혈당 관리용", rating: 4.3, reviews: 5820, channel: "병원·D2C", evidenceStrength: 6.4 },
    { brand: "B사 그린비아DM", format: "분말스틱", key: "저GI 복합탄수 · 크롬", price: 38000, size: "30포/박스", claim: "당뇨 균형영양", rating: 4.1, reviews: 3140, channel: "약국·D2C", evidenceStrength: 5.2 },
    { brand: "C사 인슐렌", format: "액상 250ml", key: "MUFA 강화 · 식이섬유 6g", price: 48000, size: "24팩/박스", claim: "당뇨환자 영양", rating: 4.4, reviews: 4210, channel: "요양시설·병원", evidenceStrength: 7.6 },
    { brand: "D사 글루세나", format: "액상 237ml", key: "이소말툴로스 + MUFA", price: 54000, size: "24팩/박스", claim: "혈당 안정화", rating: 4.6, reviews: 8940, channel: "글로벌·병원", evidenceStrength: 8.7 },
    { brand: "E사 메디케어D", format: "액상 200ml", key: "표준 균형영양 + 크롬", price: 39000, size: "24팩/박스", claim: "당뇨 영양보충", rating: 4.0, reviews: 2670, channel: "요양시설", evidenceStrength: 5.8 },
  ],

  // Step 1: 리뷰 시그널 (긍정/부정 키워드 워드클라우드)
  reviews: {
    positive: [
      {t:"혈당 안정", w: 44},{t:"식후 완만", w: 38},{t:"의사 추천", w: 34},
      {t:"편의성", w: 28},{t:"급여지원", w: 22},{t:"저작 부담↓", w: 32},
      {t:"체중 유지", w: 20},{t:"부담 없는 맛", w: 24},
    ],
    negative: [
      {t:"인공감미료", w: 40},{t:"가격 부담", w: 36},{t:"단조로운 맛", w: 32},
      {t:"환자만 별도식", w: 28},{t:"급여 미지원", w: 30},{t:"질감·목넘김", w: 24},
      {t:"장기복용 어려움", w: 22},{t:"포장 폐기", w: 16},
    ],
  },

  // Step 1: 컨셉 도출 & POD 발굴 (커뮤니티 LDA 토픽 + Pain Point + POD)
  concept: {
    sourceKey: "community_lda",
    sourceLabel: "실측 소규모표본",
    sourceNote: "네이버 카페 \"당뇨와건강\" 후기·체험단 공개 게시글 12건 · 형태소분석 + LDA 토픽모델링",
    sampleBadge: "n=12 · 실측 표본",
    topics: [
      {
        id: "A", name: "혈당관리 · CGM 루틴", docs: 5, totalDocs: 12, color: "us",
        kws: [
          {t:"혈당", w:100},{t:"잡곡밥", w:32},{t:"관리", w:27},{t:"식이섬유", w:24},
          {t:"연속혈당측정기", w:22},{t:"단백질", w:22},{t:"현미", w:20},{t:"루피니빈", w:17},{t:"렌틸콩", w:15},
        ],
      },
      {
        id: "B", name: "저당 간식 대체", docs: 4, totalDocs: 12, color: "avg",
        kws: [
          {t:"무슈콘", w:100},{t:"스콘", w:67},{t:"식단", w:66},{t:"탄수화물", w:53},
          {t:"단백질", w:52},{t:"아몬드", w:48},{t:"밀가루", w:48},{t:"저당", w:48},{t:"치즈", w:48},{t:"부담", w:48},
        ],
      },
      {
        id: "C", name: "환자용 영양식 대용식", docs: 3, totalDocs: 12, color: "target",
        kws: [
          {t:"케어", w:100},{t:"식사", w:88},{t:"아침", w:88},{t:"그린비아", w:76},
          {t:"정식품", w:63},{t:"대용", w:63},{t:"환자", w:51},{t:"필요", w:51},{t:"영양", w:39},
        ],
      },
    ],
    painPoints: [
      { label: "대용식", text: "맛이 단조롭다는 반복 불만 (Topic C)" },
      { label: "저당 간식", text: "저당이어도 여전히 심리적 부담 (Topic B)" },
      { label: "관리 루틴", text: "숫자(혈당수치) 의존형 관리의 피로감 (Topic A)" },
    ],
    pod: "숫자에 의존하지 않고도 맛으로 매 끼니 혈당 안정을 체감하는 액상 대용식",
    podBold: ["맛", "혈당 안정"],
    conclusion: "당뇨환자용 FSMP 6분기 연속 >15% 성장 · 60대+ 가정 대체식 수요 D2C로 확산 → 병원 우선 진입 → D2C 확장 권장",
    conclusionBold: ["당뇨환자용 FSMP 6분기 연속 >15% 성장", "병원 우선 진입 → D2C 확장"],
  },

  // Step 1: 영양 조성 비교 (GLUCARE-M vs 경쟁 평균 vs KDA 권고)
  nutritionCompare: [
    { label: "단백질 (g)",       our: 13, avg: 9.8, target: 12, max: 18 },
    { label: "저GI 탄수 (g)",     our: 28, avg: 22,  target: 25, max: 35 },
    { label: "MUFA 지방 (g)",     our: 6,  avg: 3.4, target: 5,  max: 10 },
    { label: "식이섬유 (g)",       our: 6,  avg: 4.2, target: 5,  max: 10 },
    { label: "나트륨 (mg, 낮을수록↑)", our: 180, avg: 260, target: 200, max: 400, inverse: true },
    { label: "당류 (g, 낮을수록↑)", our: 2, avg: 8, target: 5, max: 15, inverse: true },
  ],

  // Step 4: 배합설계 (초안) — 200ml 액상 1팩 기준
  formula: {
    servingSize: 200, // ml per pack
    servingsPerBox: 24,
    kcalPerServing: 200,
    // 저GI 추정식: giBaseline - (해당 원료량 / 총 탄수량) * giWeight
    giBaseline: 75,
    giIngredientId: "iso",
    giWeight: 45,
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
    // 기능성 · 임상 근거 바(EffBar) 4개 — 원료 id 기반 범용 공식 (합산 가중치, id 하나 또는 ids 배열)
    efficacyClaims: [
      { label: "식후혈당 완만화 (저GI)", target: "이소말툴로스 ≥20g + 식이섬유 ≥5g",
        parts: [{ id: "iso", divisor: 22, weight: 60 }, { id: "rmd", divisor: 6, weight: 40 }] },
      { label: "근감소증 예방 (고품질 단백)", target: "유청+카제인 총 ≥12g · 류신 ≥2g",
        parts: [{ role: "단백", divisor: 13, weight: 100 }] },
      { label: "지질 관리 (MUFA 비중)", target: "MUFA ≥5g · MUFA/전지방 >2/3",
        parts: [{ id: "mufa", divisor: 6, weight: 100 }] },
      { label: "미량영양소 강화 (26종 프리믹스)", target: "비타민·미네랄 RDA 25% 이상",
        parts: [{ id: "vm", divisor: 1.2, weight: 100 }] },
    ],
    // 관능 프로파일(SensoryRadar) 6축 — 동일한 parts 기반 범용 공식(weight는 음수로 감산 가능)
    sensoryAxes: [
      { label: "단맛", parts: [{ id: "iso", divisor: 40, weight: 35 }, { id: "sw", divisor: 1, weight: 65 }] },
      { label: "커피/바닐라 향", parts: [{ id: "flav", divisor: 2, weight: 70 }], flavorBonus: 25 },
      { label: "우유맛", parts: [{ ids: ["wpi", "cas"], divisor: 26, weight: 100 }] },
      { label: "감미료 잔미", parts: [{ id: "sw", divisor: 1, weight: 100 }] },
      { label: "점도·목넘김", parts: [{ ids: ["mufa", "mct", "emul"], divisor: 18.8, weight: 100 }] },
      { label: "이취(콩·비린맛)", parts: [{ ids: ["wpi", "cas"], divisor: 26, weight: 55 }, { id: "flav", divisor: 2, weight: -25 }] },
    ],
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
