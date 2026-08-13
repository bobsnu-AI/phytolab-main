// Step 2: Patient Profiling — FSMP 환자 프로파일
const Step2Target = () => {
  const d = PHYTO_DATA.target;
  const n = d.nutritionTarget;
  const Reveal = window.RevealSection || (({ children }) => children);

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 02 · NUTRITION & FUNCTIONALITY</div>
          <h1 className="step-title">영양 기준 설정 + 맞춤 기능성 도출</h1>
          <div className="step-desc">FSMP 표준제조기준 · 임상 근거 논문 · 맞춤 기능성 원료 후보</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">GUIDELINES</span><span className="badge-v mono">KDA · ADA · ESPEN</span></div>
          <div className="badge"><span className="badge-k">CONFIDENCE</span><span className="badge-v mono">A · 91.2%</span></div>
        </div>
      </div>

      {/* FSMP 영양 기준 타겟 */}
      <Reveal id="nutrition" label="FSMP 영양 목표치" agent="clio">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">FSMP 영양 목표치 · 당뇨환자용 표준제조기준</div>
            <div className="panel-sub">표준제조기준 + KDA 2024</div>
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
          {d.ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <div className="ing-name">
                {ing.name}
                {ing.note && <div className="ing-note">{ing.note}</div>}
              </div>
              <div className={`evidence evidence-${ing.evidence.replace("+","p")}`}>{ing.evidence}</div>
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
          {d.papers.map((p, i) => {
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
