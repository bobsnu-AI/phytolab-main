// 지식그래프(dietkg) 클라이언트 — STAGE 02 영양·기능성 단계용
// - /static/data/kg/kg_core.json (식약처 기능성원료 인정현황 · 품목제조보고 · 문헌 코퍼스 집계) 1회 로드
// - 브리프(건강이슈·원료 선호)와 생성된 원료 후보로 서브그래프를 뽑아
//   (1) 화면 시각화(step2_target.jsx KgGraphSection) (2) 에이전트 FACTS 주입(kgEvidence) 두 곳에 공급
// - 효능별 논문 상세(kg_evidence_by_functionality/NNN.json)는 클릭 시 지연 로드
// 주의: FunctionalIngredient.props.functionality(식약처 제도 인정 문구)와 Functionality 노드(논문이 보인 효능)는
//       다른 체계라 섞지 않는다. UI·FACTS 모두 출처를 분리해 표기한다.
(function () {
  const BASE = "/static/data/kg/";
  const CORE_URL = BASE + "kg_core.json";

  // 브리프 건강이슈(brief.js condition id) → 논문 효능 노드(Functionality id) 목록
  const CONDITION_TO_FN = {
    metabolic: ["fn:079", "fn:081", "fn:064", "fn:057", "fn:010", "fn:029"],
    sarco:     ["fn:022", "fn:048", "fn:053"],
    cog:       ["fn:023", "fn:058", "fn:027", "fn:046", "fn:070"],
    immune:    ["fn:033", "fn:032", "fn:031", "fn:075"],
    gut:       ["fn:059", "fn:042", "fn:055", "fn:063"],
    cardio:    ["fn:095", "fn:096", "fn:062", "fn:065", "fn:097", "fn:049", "fn:080", "fn:086"],
    bone:      ["fn:038", "fn:020", "fn:030"],
    renal:     ["fn:047", "fn:015", "fn:051"],
    cancer:    ["fn:089", "fn:082"],
    dysph:     ["fn:042"],
    sleep:     ["fn:044", "fn:092"],
    beauty:    ["fn:074", "fn:078", "fn:034", "fn:035"],
    energy:    ["fn:093", "fn:053"],
    weight:    ["fn:085", "fn:086", "fn:048"],
  };
  // 브리프 건강이슈 → 식약처 인정 기능성 문구(FunctionalIngredient.props.functionality) 키워드
  const CONDITION_TO_REG_KW = {
    metabolic: /혈당/, sarco: /근력|근육/, cog: /기억력|인지/, immune: /면역/,
    gut: /배변|장 ?건강|유익균|장내/, cardio: /콜레스테롤|혈압|혈행|중성지/, bone: /관절|뼈|칼슘/,
    renal: /요로|신장/, cancer: /항산화/, dysph: /소화/, sleep: /수면|스트레스|긴장/,
    beauty: /피부|자외선/, energy: /피로/, weight: /체지방/,
  };
  const MAX_FI = 12, MAX_FC = 14;

  let core = null, loadP = null;
  const idx = { byId: new Map(), out: new Map(), inn: new Map(), byType: new Map() };
  const evidenceCache = new Map();

  function addAdj(map, k, e) { (map.get(k) || map.set(k, []).get(k)).push(e); }

  function load() {
    if (loadP) return loadP;
    loadP = fetch(CORE_URL).then(r => { if (!r.ok) throw new Error("kg_core " + r.status); return r.json(); })
      .then(d => {
        core = d;
        for (const n of d.nodes) {
          idx.byId.set(n.id, n);
          (idx.byType.get(n.type) || idx.byType.set(n.type, []).get(n.type)).push(n);
        }
        for (const e of d.edges) { addAdj(idx.out, e.src, e); addAdj(idx.inn, e.dst, e); }
        return d;
      })
      .catch(err => { console.warn("[PhytoKG] load failed", err); loadP = null; throw err; });
    return loadP;
  }
  const isReady = () => !!core;
  const node = id => idx.byId.get(id);
  const outE = (id, type) => (idx.out.get(id) || []).filter(e => !type || e.type === type);
  const inE  = (id, type) => (idx.inn.get(id) || []).filter(e => !type || e.type === type);

  // 괄호·공백·특수문자 제거한 비교용 키 ("강황(심황,우콘)" → "강황")
  const stem = s => String(s || "").replace(/\(.*?\)/g, "").replace(/[\s·,/\-]/g, "").trim();
  const contains = (a, b) => { a = stem(a); b = stem(b); return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)); };
  // 원료명 ↔ 연구 소재명 브리지: 소재명이 원료명의 접두어이거나(녹차추출물↔녹차) 원료명이 소재명에 포함(마늘↔산마늘)될 때만.
  // 임의 부분 문자열("밀전분유래…"의 "전분"·"분유")은 제외해 잡음을 막는다.
  const bridges = (ingredientLabel, conceptLabel) => { const a = stem(ingredientLabel), b = stem(conceptLabel); return a.length >= 2 && b.length >= 2 && (a.startsWith(b) || b.includes(a)); };

  function readBrief() {
    try { return JSON.parse(localStorage.getItem("phytolab-brief-confirmed")) || {}; } catch { return {}; }
  }
  const asArr = v => Array.isArray(v) ? v : v ? [v] : [];

  // ---------- 서브그래프 추출 ----------
  // brief: {condition:[], ingredient:[]}, ingredientNames: 생성된 target.ingredients[].name
  function subgraphFor(brief, ingredientNames) {
    if (!core) return null;
    brief = brief || readBrief();
    const conditions = asArr(brief.condition);
    const fnIds = new Set(conditions.flatMap(c => CONDITION_TO_FN[c] || []).filter(id => node(id)));
    const regKws = conditions.map(c => CONDITION_TO_REG_KW[c]).filter(Boolean);

    const FI = idx.byType.get("FunctionalIngredient") || [];
    const scored = new Map(); // fi id → {score, why}
    const bump = (n, s, why) => { const cur = scored.get(n.id) || { n, score: 0, why: new Set() }; cur.score += s; cur.why.add(why); scored.set(n.id, cur); };
    for (const n of FI) {
      for (const name of ingredientNames || []) if (contains(n.label, name)) bump(n, 10, "원료 후보 일치");
      for (const kw of regKws) if (kw.test(n.props.functionality || "")) bump(n, 3, "식약처 인정 기능성 일치");
    }
    const fiPick = [...scored.values()]
      .sort((a, b) => b.score - a.score || (b.n.props.n_products || 0) - (a.n.props.n_products || 0))
      .slice(0, MAX_FI);

    const nodes = new Map(), edges = [];
    const addN = n => { if (n && !nodes.has(n.id)) nodes.set(n.id, n); };
    const addE = e => edges.push(e);

    fnIds.forEach(id => addN(node(id)));

    // FoodConcept 후보: 해당 효능에 SHOWS_AGG가 있는 소재(연구 많은 순) + 원료 후보와 이름이 닿는 소재
    const fcScore = new Map();
    for (const fid of fnIds) for (const e of inE(fid, "SHOWS_AGG")) fcScore.set(e.src, (fcScore.get(e.src) || 0) + (e.props.n_studies || 0));
    const FC = idx.byType.get("FoodConcept") || [];
    for (const fc of FC) {
      const hit = fiPick.some(p => bridges(p.n.label, fc.label)) || (ingredientNames || []).some(nm => bridges(nm, fc.label));
      if (hit) fcScore.set(fc.id, (fcScore.get(fc.id) || 0) + 1000);
    }
    const fcPick = [...fcScore.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_FC).map(([id]) => node(id)).filter(Boolean);

    for (const { n, why } of fiPick) {
      addN(n); n._why = [...why];
      for (const e of outE(n.id, "MARKER_OF")) { addN(node(e.dst)); addE(e); }
      for (const e of outE(n.id, "CAUTIONS_FOR")) { addN(node(e.dst)); addE(e); }
      // 제도(FI) ↔ 논문(FC) 브리지: 이름 포함 매칭 (그래프에 직접 연결 없음 → 추론 엣지로 표기)
      for (const fc of fcPick) if (bridges(n.label, fc.label)) addE({ src: n.id, dst: fc.id, type: "NAME_MATCH", props: { inferred: true } });
    }
    for (const fc of fcPick) {
      addN(fc);
      for (const e of outE(fc.id, "SHOWS_AGG")) if (fnIds.has(e.dst)) addE(e);
    }
    return {
      nodes: [...nodes.values()], edges,
      functionalityIds: [...fnIds],
      conditions, meta: core.meta,
      approvalsOf: fiId => outE(fiId, "HAS_APPROVAL").map(e => node(e.dst)).filter(Boolean),
      adverseOf: fiId => outE(fiId, "ADVERSE_REPORTED").map(e => node(e.dst)?.label).filter(Boolean),
      // FoodConcept 상태: "연결 안 됨"(시료 없음) vs "근거 없음"(시료 있으나 해당 효능 0건) vs 근거 n건
      conceptStatus: fc => {
        if (!fc.props.has_samples) return { state: "unlinked", label: "아직 그래프에 연결 안 됨" };
        const rows = outE(fc.id, "SHOWS_AGG").filter(e => fnIds.has(e.dst));
        if (!rows.length) return { state: "none", label: "해당 효능 연구 근거 없음" };
        const n = rows.reduce((s, e) => s + (e.props.n_studies || 0), 0);
        return { state: "evidence", label: `연구 ${n}건`, rows };
      },
    };
  }

  // ---------- 에이전트 FACTS용 압축 요약 ----------
  const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
  function factsFor(dataset, brief) {
    if (!core) return null;
    const names = (dataset?.target?.ingredients || []).map(i => i.name).filter(Boolean);
    const sg = subgraphFor(brief || readBrief(), names);
    if (!sg) return null;
    const fi = sg.nodes.filter(n => n.type === "FunctionalIngredient");
    const fc = sg.nodes.filter(n => n.type === "FoodConcept");
    const approvedIngredients = fi.map(n => ({
      name: n.label, kind: n.props.kind, marker: n.props.marker || null,
      intake: clip(n.props.intake, 80), functionality: clip(n.props.functionality, 160),
      cautionTargets: outE(n.id, "CAUTIONS_FOR").map(e => node(e.dst)?.label).filter(Boolean),
      n_products: n.props.n_products, n_approvals: n.props.n_approvals, adverse_total: n.props.adverse_total,
      matchedBy: n._why,
    }));
    const researchEvidence = [];
    for (const c of fc) for (const e of outE(c.id, "SHOWS_AGG")) if (sg.functionalityIds.includes(e.dst)) {
      researchEvidence.push({ material: c.label, effect: node(e.dst)?.label, n_studies: e.props.n_studies, n_publications: e.props.n_publications, years: `${e.props.year_min}–${e.props.year_max}` });
    }
    researchEvidence.sort((a, b) => b.n_studies - a.n_studies);
    const unlinked = fc.filter(c => !c.props.has_samples).map(c => c.label);
    if (!approvedIngredients.length && !researchEvidence.length) return null;
    return {
      source: "식의학유전체실 dietkg 지식그래프 (식약처 기능성원료 인정현황·품목제조보고·문헌 코퍼스 집계)",
      rules: "approvedIngredients는 식약처 제도 정보(인정 문구·일일섭취량·주의대상), researchEvidence는 논문 코퍼스가 보인 효능으로 서로 다른 체계이므로 섞어 말하지 말 것. 논문 PMID는 미확인 상태이므로 PMID를 지어내지 말고 '연구 n건·논문 n편(연도)' 형태로만 인용할 것.",
      approvedIngredients,
      researchEvidence: researchEvidence.slice(0, 20),
      unlinkedMaterials: unlinked.length ? unlinked : undefined,
    };
  }

  // ---------- 효능별 논문 상세 지연 로드 ----------
  async function loadEvidence(fnId, conceptLabels) {
    const fn = node(fnId); if (!fn?.props?.file) return [];
    if (!evidenceCache.has(fnId)) {
      evidenceCache.set(fnId, fetch(BASE + fn.props.file).then(r => r.ok ? r.json() : { studies: [] }).catch(() => ({ studies: [] })));
    }
    const d = await evidenceCache.get(fnId);
    let studies = d.studies || [];
    if (conceptLabels?.length) {
      const keys = conceptLabels.map(stem);
      studies = studies.filter(s => (s.samples || []).some(smp => keys.some(k => contains(smp.concept, k))));
    }
    // 한 논문이 시험·시료 단위로 여러 Study 행으로 들어오므로 출판물 기준 1건만 남긴다(시료 목록은 합침)
    const seen = new Map();
    for (const s of studies) {
      const key = s.publication?.id || s.publication?.title || s.id;
      const cur = seen.get(key);
      if (!cur) seen.set(key, { ...s, samples: [...(s.samples || [])], n_rows: 1 });
      else { cur.n_rows++; for (const smp of s.samples || []) if (!cur.samples.some(x => x.concept === smp.concept && x.dose === smp.dose)) cur.samples.push(smp); }
    }
    return [...seen.values()].sort((a, b) => String(b.publication?.year || "").localeCompare(String(a.publication?.year || "")));
  }

  window.PhytoKG = { load, isReady, subgraphFor, factsFor, loadEvidence, node, CONDITION_TO_FN };
  // 백그라운드 선로드 (1.8MB · STAGE 02 도달 전 완료 목표). 실패해도 앱 동작엔 영향 없음.
  load().catch(() => {});
})();
