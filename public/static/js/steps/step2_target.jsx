// ============ 지식그래프 근거 섹션 (dietkg · 식약처 인정 원료 ↔ 연구 문헌) ============
// 데이터는 window.PhytoKG(kg_context.js)가 공급. 그래프 로드 전이면 로딩 표시, 실패하면 섹션 자체를 숨긴다.
const KG_TYPE_META = {
  FunctionalIngredient: { label: "식약처 인정 원료", color: "var(--accent)",   r: 11 },
  Phytochemical:        { label: "지표성분",          color: "var(--accent-2)", r: 6 },
  Functionality:        { label: "연구 효능",         color: "var(--accent-3)", r: 10 },
  FoodConcept:          { label: "연구 소재",         color: "var(--success)",  r: 7 },
  RiskTarget:           { label: "주의 대상",         color: "var(--danger)",   r: 6 },
};

// 동심원 레이아웃: 중심=연구 효능, 중간 링=식약처 인정 원료, 바깥 링=지표성분·연구 소재·주의 대상.
// 바깥 노드는 연결된 안쪽 노드의 각도 근처에 배치해 엣지 교차를 줄인다. ponytail: 결정적·O(n·m) — 수백 노드면 d3-force로 교체
function kgLayout(nodes, edges, W, H) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 24;
  const ring = n => n.type === "Functionality" ? 0 : n.type === "FunctionalIngredient" ? 1 : 2;
  const radius = [R * 0.3, R * 0.62, R * 0.98];
  const at = new Map();
  const place = (list, r, angleOf) => {
    const sorted = angleOf ? list.map(n => [n, angleOf(n)]).sort((a, b) => a[1] - b[1]).map(x => x[0]) : list;
    sorted.forEach((n, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(sorted.length, 1); at.set(n.id, { id: n.id, x: cx + Math.cos(a) * (sorted.length === 1 ? 0 : r), y: cy + Math.sin(a) * (sorted.length === 1 ? 0 : r), a }); });
  };
  const byRing = [[], [], []]; nodes.forEach(n => byRing[ring(n)].push(n));
  place(byRing[0], radius[0]);
  // 원료: 연결된 효능(이름 매칭 경유)이 없어 단순 등간격
  place(byRing[1], radius[1]);
  const nb = id => edges.filter(e => e.src === id || e.dst === id).map(e => at.get(e.src === id ? e.dst : e.src)).filter(Boolean);
  place(byRing[2], radius[2], n => { const ns = nb(n.id); if (!ns.length) return Math.PI; const sx = ns.reduce((s, p) => s + Math.cos(p.a), 0), sy = ns.reduce((s, p) => s + Math.sin(p.a), 0); return Math.atan2(sy, sx); });
  return at;
}

const KgGraphSection = ({ ingredientNames }) => {
  const { useState, useEffect, useMemo } = React;
  const [ready, setReady] = useState(!!window.PhytoKG?.isReady());
  const [failed, setFailed] = useState(!window.PhytoKG);
  const [selId, setSelId] = useState(null);
  const [studies, setStudies] = useState(null); // null=미요청, []=없음
  const [loadingEv, setLoadingEv] = useState(false);

  useEffect(() => {
    if (!window.PhytoKG) return;
    window.PhytoKG.load().then(() => setReady(true)).catch(() => setFailed(true));
  }, []);

  const names = (ingredientNames || []).join("|");
  const sg = useMemo(() => ready ? window.PhytoKG.subgraphFor(null, ingredientNames) : null, [ready, names]);
  const W = 640, H = 400;
  const layout = useMemo(() => sg ? kgLayout(sg.nodes, sg.edges, W, H) : null, [sg]);

  useEffect(() => { setStudies(null); }, [selId]);

  if (failed) return null;
  const sel = selId && sg ? sg.nodes.find(n => n.id === selId) : null;

  const conceptLabelsFor = fnId => sg.edges.filter(e => e.type === "SHOWS_AGG" && e.dst === fnId).map(e => sg.nodes.find(n => n.id === e.src)?.label).filter(Boolean);
  const showStudies = async (fnId, labels) => {
    setLoadingEv(true);
    try { setStudies(await window.PhytoKG.loadEvidence(fnId, labels)); } finally { setLoadingEv(false); }
  };

  const renderDetail = () => {
    if (!sel) return <div className="kg-hint">노드를 클릭하면 상세 정보가 표시됩니다. 실선은 그래프의 실제 관계, 점선은 이름 매칭으로 추론한 연결입니다.</div>;
    const p = sel.props || {};
    if (sel.type === "FunctionalIngredient") {
      const risks = sg.edges.filter(e => e.type === "CAUTIONS_FOR" && e.src === sel.id).map(e => sg.nodes.find(n => n.id === e.dst)?.label).filter(Boolean);
      const markers = sg.edges.filter(e => e.type === "MARKER_OF" && e.src === sel.id).map(e => sg.nodes.find(n => n.id === e.dst)?.label).filter(Boolean);
      const approvals = sg.approvalsOf(sel.id);
      return (
        <div>
          <div className="kg-detail-title">{sel.label} <span className="kg-kind mono">{p.kind}</span></div>
          <div className="kg-detail-src mono">출처: 식약처 기능성원료 인정현황 · 품목제조보고{sel._why?.length ? ` · 선정 근거: ${sel._why.join(", ")}` : ""}</div>
          <dl className="kg-dl">
            <dt>지표성분</dt><dd>{p.marker || markers.join(", ") || "—"}</dd>
            <dt>일일섭취량</dt><dd>{p.intake || "—"}</dd>
            <dt>인정 기능성</dt><dd className="kg-pre">{p.functionality || "—"}</dd>
            <dt>주의 대상</dt><dd>{risks.length ? risks.join(" · ") : "—"}</dd>
            {p.caution && <><dt>섭취 주의</dt><dd className="kg-pre kg-clamp">{p.caution}</dd></>}
            <dt>현황</dt><dd className="mono">제품 {Number(p.n_products || 0).toLocaleString()}개 · 인정 {p.n_approvals ?? 0}건 · 이상사례 {Number(p.adverse_total || 0).toLocaleString()}건</dd>
            {approvals.length > 0 && <><dt>인정 내역</dt><dd className="mono">{approvals.slice(0, 6).map(a => a.label).join(" · ")}{approvals.length > 6 ? ` 외 ${approvals.length - 6}건` : ""}</dd></>}
          </dl>
        </div>
      );
    }
    if (sel.type === "FoodConcept") {
      const st = sg.conceptStatus(sel);
      return (
        <div>
          <div className="kg-detail-title">{sel.label} <span className="kg-kind mono">연구 소재</span></div>
          <div className="kg-detail-src mono">출처: 문헌 코퍼스 (논문이 보인 효능 · 식약처 인정과 별개)</div>
          <div className={`kg-status kg-status-${st.state}`}>{st.label}{st.state === "unlinked" && " · 그래프에 논문 시료가 아직 연결되지 않은 소재입니다"}</div>
          {st.rows && (
            <table className="kg-table"><tbody>
              {st.rows.map(e => { const fn = sg.nodes.find(n => n.id === e.dst) || window.PhytoKG.node(e.dst); return (
                <tr key={e.dst}><td>{fn?.label}</td><td className="mono">연구 {e.props.n_studies} · 논문 {e.props.n_publications} · {e.props.year_min}–{e.props.year_max}</td>
                  <td><button type="button" className="kg-btn" onClick={() => showStudies(e.dst, [sel.label])}>논문</button></td></tr>
              ); })}
            </tbody></table>
          )}
        </div>
      );
    }
    if (sel.type === "Functionality") {
      const rows = sg.edges.filter(e => e.type === "SHOWS_AGG" && e.dst === sel.id);
      const total = rows.reduce((s, e) => s + (e.props.n_studies || 0), 0);
      return (
        <div>
          <div className="kg-detail-title">{sel.label} <span className="kg-kind mono">연구 효능</span></div>
          <div className="kg-detail-src mono">출처: 문헌 코퍼스 · 이 브리프에 연결된 소재 {rows.length}종 · 연구 {total}건</div>
          <button type="button" className="kg-btn" disabled={!rows.length} onClick={() => showStudies(sel.id, conceptLabelsFor(sel.id))}>연결된 소재의 논문 보기</button>
        </div>
      );
    }
    return (
      <div>
        <div className="kg-detail-title">{sel.label} <span className="kg-kind mono">{KG_TYPE_META[sel.type]?.label || sel.type}</span></div>
        <div className="kg-detail-src mono">{sel.type === "Phytochemical" ? "식약처 인정 원료의 지표성분" : "원료 주의사항 문면에서 추출한 주의 대상"}</div>
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">지식그래프 근거 · 식약처 인정 원료 ↔ 연구 문헌</div>
          <div className="panel-sub">dietkg 지식그래프 · 브리프 건강이슈·원료 후보 기준 서브그래프{sg?.meta?.exported_at ? ` · ${sg.meta.exported_at} 내보냄` : ""}</div>
        </div>
        <window.SourceTag id="dietkg" label="출처" />
      </div>
      {!ready && <div className="kg-hint">지식그래프 불러오는 중…</div>}
      {ready && sg && !sg.nodes.length && <div className="kg-hint">이 브리프의 건강이슈·원료와 연결된 그래프 노드가 없습니다.</div>}
      {ready && sg && sg.nodes.length > 0 && (
        <div className="kg-wrap">
          <div className="kg-canvas">
            <svg viewBox={`0 0 ${W} ${H}`} className="kg-svg" role="img" aria-label="지식그래프 서브그래프">
              {sg.edges.map((e, i) => { const a = layout.get(e.src), b = layout.get(e.dst); if (!a || !b) return null;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`kg-edge ${e.props?.inferred ? "kg-edge-inferred" : ""} ${(selId === e.src || selId === e.dst) ? "kg-edge-hot" : ""}`} />; })}
              {sg.nodes.map(n => { const p = layout.get(n.id); const m = KG_TYPE_META[n.type] || { color: "var(--text-3)", r: 5 }; if (!p) return null;
                const dim = n.type === "FoodConcept" && !n.props.has_samples;
                return (
                  <g key={n.id} transform={`translate(${p.x},${p.y})`} className={`kg-node ${selId === n.id ? "kg-node-sel" : ""} ${dim ? "kg-node-dim" : ""}`} onClick={() => setSelId(n.id)} tabIndex={0} role="button" aria-label={n.label} onKeyDown={ev => { if (ev.key === "Enter") setSelId(n.id); }}>
                    <circle r={m.r} fill={m.color} />
                    {(n.type === "FunctionalIngredient" || n.type === "Functionality" || selId === n.id) && <text y={m.r + 11} textAnchor="middle" className="kg-label">{n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}</text>}
                  </g>
                ); })}
            </svg>
            <div className="kg-legend">
              {Object.entries(KG_TYPE_META).map(([t, m]) => <span key={t} className="kg-legend-item"><i style={{ background: m.color }}></i>{m.label}</span>)}
              <span className="kg-legend-item"><i className="kg-legend-dash"></i>이름 매칭(추론)</span>
            </div>
          </div>
          <div className="kg-detail">
            {renderDetail()}
            {loadingEv && <div className="kg-hint">논문 불러오는 중…</div>}
            {studies && !loadingEv && (
              <div className="kg-studies">
                <div className="kg-studies-head mono">논문 {studies.length}편{studies.length > 20 ? " · 최신 20편 표시" : ""} · <span className="kg-pmid-tag">PMID 미확인</span></div>
                {studies.length === 0 && <div className="kg-hint">조건에 맞는 연구가 없습니다.</div>}
                {studies.slice(0, 20).map(s => (
                  <div key={s.id} className="kg-study">
                    <div className="kg-study-title">{s.publication?.title || "(제목 없음)"}</div>
                    <div className="kg-study-meta mono">{[s.publication?.journal, s.publication?.year].filter(Boolean).join(" · ")}</div>
                    <div className="kg-study-meta">{[s.props?.study_type, s.props?.model, (s.samples || []).map(x => [x.concept, x.part, x.process, x.dose].filter(Boolean).join(" ")).join("; ")].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
window.KgGraphSection = KgGraphSection;

// Step 2: Patient Profiling — 브리프별 영양 기준 + 기능성 도출 (동적)
const Step2Target = () => {
  const { useState, useEffect } = React;

  // useState로 스냅샷을 찍어 PHYTO_DATA 교체(새 브리프 생성 후 onLaunch) 시 re-render 보장.
  // FormulaProvider key={codename}가 상위에서 re-mount를 트리거하지만,
  // 직접 참조보다 안전한 방어 레이어로 유지한다.
  const [snap, setSnap] = useState(() => ({
    target: PHYTO_DATA.target,
    product: PHYTO_DATA.product,
    generated: !!PHYTO_DATA.generated,
  }));

  // PHYTO_DATA가 교체될 경우를 대비해 mount 시 한 번 더 동기화
  useEffect(() => {
    setSnap({
      target: PHYTO_DATA.target,
      product: PHYTO_DATA.product,
      generated: !!PHYTO_DATA.generated,
    });
  }, []);

  const d = snap.target;
  const n = d.nutritionTarget;
  const product = snap.product;
  const Reveal = window.RevealSection || (({ children }) => children);

  // 브리프별 동적 라벨 생성
  const isGenerated = snap.generated;
  const productTarget = product?.target || "타깃 수요층";

  // productType 기반 규제 라벨 (LLM이 임의 생성한 regClass 대신 사용)
  const PRODUCT_TYPE_REG_LABEL = {
    tea:          "일반식품 · 식품공전 기준",
    soymilk:      "두유류 · 식품공전 기준",
    rawfood:      "생식류 · 식품공전 기준",
    proteinbar:   "과자류 · 단백질 함량 기준",
    proteinshake: "건강기능식품 또는 일반식품 단백질 보충제",
    fsmp:         "특수의료용도식품 · FSMP 표준제조기준",
  };
  const PRODUCT_TYPE_GUIDELINE = {
    tea:          "식품공전 · 차류 기준",
    soymilk:      "식품공전 · 두유류 기준",
    rawfood:      "식품공전 · 생식류 기준",
    proteinbar:   "식품공전 · 영양성분 표시 기준",
    proteinshake: "건강기능식품법 또는 식품공전",
    fsmp:         "KDA · ADA · ESPEN · 식약처 고시",
  };
  const pt = product?.productType || "";
  const regLabel = PRODUCT_TYPE_REG_LABEL[pt] || product?.regClass || "식품공전 기준";
  const guidelineLabel = PRODUCT_TYPE_GUIDELINE[pt] || (product?.regClass ? product.regClass : "해당 가이드라인");

  // 패널 타이틀: 생성된 데이터면 브리프 기반, 아니면 기존 GLUCARE-M 텍스트
  const nutritionPanelTitle = isGenerated
    ? `${productTarget} 맞춤 영양 목표치 · ${regLabel}`
    : "FSMP 영양 목표치 · 당뇨환자용 표준제조기준";
  const nutritionPanelSub = isGenerated
    ? `${regLabel} 브리프 기반 AI 생성 · ${product?.positioningClaim || "핵심 기능성 기준"}`
    : "표준제조기준 + KDA 2024";
  const guidelineBadge = isGenerated ? guidelineLabel : "KDA · ADA · ESPEN";
  const evidenceStrength = product?.targetEvidenceStrength
    ? `${product.targetEvidenceStrength.toFixed(1)} / 10`
    : "A · 91.2%";

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 02 · NUTRITION & FUNCTIONALITY</div>
          <h1 className="step-title">영양 기준 설정 + 맞춤 기능성 도출</h1>
          <div className="step-desc">{isGenerated ? `${productTarget} 맞춤 · 임상 근거 논문 · 기능성 원료 후보` : "FSMP 표준제조기준 · 임상 근거 논문 · 맞춤 기능성 원료 후보"}</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">GUIDELINES</span><span className="badge-v mono">{guidelineBadge}</span></div>
          <div className="badge"><span className="badge-k">EVIDENCE</span><span className="badge-v mono">{evidenceStrength}</span></div>
        </div>
      </div>

      {/* FSMP 영양 기준 타겟 */}
      <Reveal id="nutrition" label="FSMP 영양 목표치" agent="clio">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{nutritionPanelTitle}</div>
            <div className="panel-sub">{nutritionPanelSub}</div>
          </div>
          <div className="panel-note mono">1식 200ml·200kcal</div>
        </div>
        <div className="nutrition-target-grid">
          {Object.entries(n).map(([k, v]) => (
            <div key={k} className="nut-card">
              <div className="nut-value">
                <span className="mono nut-num">{v.value}</span>
                <span className="nut-unit">{v.unit}</span>
              </div>
              <div className="nut-label">{{calories:"열량", carbRatio:"탄수 비율", proteinRatio:"단백 비율", fatRatio:"지방 비율", giIndex:"GI 지수", sodium:"나트륨"}[k]}</div>
              <div className="nut-note">{v.note}</div>
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      <Reveal id="ingredients" label="기능성 원료 후보" agent="clio">
      <div className="panel">
        <div className="panel-header">
            <div>
            <div className="panel-title">기능성 원료 후보 · 임상 근거 등급</div>
            <div className="panel-sub">Evidence(A/B/C) · 권장량 · Cost · 개별 RCT 기준 (PubMed 확인)</div>
          </div>
        </div>
        <div className="ingredient-list">
          {(d.ingredients || []).map((ing, i) => (
            <div key={i} className="ingredient-row">
              <div className="ing-name">
                {ing.name}
                {ing.note && <div className="ing-note">{ing.note}</div>}
              </div>
              <div className={`evidence evidence-${(ing.evidence || "C").replace("+","p")}`}>{ing.evidence || "C"}</div>
              <div className="mono ing-dose">{ing.dose}/일</div>
              <div className="ing-cost">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`cost-dot ${n <= ing.cost ? "active" : ""}`}></span>
                ))}
              </div>
              <window.SourceTag id={ing.sourceKey} label="근거" />
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      {/* 지식그래프 근거 — 원료 후보와 같은 턴(ingredients)에 공개 */}
      <Reveal id="ingredients" label="지식그래프 근거" agent="clio">
        <window.KgGraphSection ingredientNames={(d.ingredients || []).map(i => i.name)} />
      </Reveal>

      <Reveal id="papers" label="채택 논문" agent="clio">
      <div className="panel">
        <div className="panel-header">
            <div>
            <div className="panel-title">채택 논문 · 임상영양 근거</div>
            <div className="panel-sub mono">검색 소스: {d.papersSearchNote}</div>
          </div>
        </div>
        <div className="papers-grid">
          {(d.papers || []).map((p, i) => {
            const Tag = p.pmid ? "a" : "div";
            const linkProps = p.pmid ? { href: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`, target: "_blank", rel: "noopener noreferrer" } : {};
            return (
              <Tag key={i} className={`paper-card ${p.pmid ? "paper-card-link" : ""}`} {...linkProps}>
                <div className="paper-header">
                  <span className="mono paper-idx">#{String(i+1).padStart(2,"0")}{p.pmid ? ` · PMID ${p.pmid}` : ""}</span>
                  <span className="paper-journal">{p.journal} · {p.year}</span>
                </div>
                <div className="paper-title">{p.title}{p.pmid && <span className="paper-link-icon"> ↗</span>}</div>
                <div className="paper-stats">
                  <span className="mono">n = {p.n}</span>
                  <span className="paper-effect">{p.effect}</span>
                </div>
                <div className="paper-key">
                  <span className="mono paper-key-label">KEY</span>
                  <span>{p.key}</span>
                </div>
              </Tag>
            );
          })}
        </div>
      </div>
      </Reveal>
    </div>
  );
};

window.Step2Target = Step2Target;
