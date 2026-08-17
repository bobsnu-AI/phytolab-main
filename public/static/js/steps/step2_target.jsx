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
  const category = product?.subcategory || product?.category || "기능성 식품";
  const regClass = product?.regClass || "해당 카테고리";
  // 패널 타이틀: 생성된 데이터면 브리프 기반, 아니면 기존 GLUCARE-M 텍스트
  const nutritionPanelTitle = isGenerated
    ? `${productTarget} 맞춤 영양 목표치 · ${regClass}`
    : "FSMP 영양 목표치 · 당뇨환자용 표준제조기준";
  const nutritionPanelSub = isGenerated
    ? `${category} 브리프 기반 AI 생성 · ${product?.positioningClaim || "핵심 기능성 기준"}`
    : "표준제조기준 + KDA 2024";
  const guidelineBadge = isGenerated
    ? (product?.regClass ? product.regClass : "해당 가이드라인")
    : "KDA · ADA · ESPEN";
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
