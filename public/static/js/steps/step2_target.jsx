// Step 2: Patient Profiling — FSMP 환자 프로파일
const Step2Target = () => {
  const d = PHYTO_DATA.target;
  const n = d.nutritionTarget;
  const Reveal = window.RevealSection || (({ children }) => children);

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 02 · PATIENT PROFILING</div>
          <h1 className="step-title">환자 프로파일 · 2형 당뇨 성인</h1>
          <div className="step-desc">임상 근거 기반 페인포인트 · 대표 페르소나 · FSMP 표준제조기준 매트릭스</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">GUIDELINES</span><span className="badge-v mono">KDA · ADA · ESPEN</span></div>
          <div className="badge"><span className="badge-k">CONFIDENCE</span><span className="badge-v mono">A · 91.2%</span></div>
        </div>
      </div>

      <div className="target-grid">
        <Reveal id="persona" label="환자 페르소나" agent="mara">
        <div className="panel persona-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">대표 환자 페르소나</div>
              <div className="panel-sub">클러스터 41.8%</div>
            </div>
          </div>
          <div className="persona-body">
            <div className="persona-avatar">
              <svg viewBox="0 0 80 80" width="72" height="72">
                <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                <circle cx="40" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M18,66 Q40,48 62,66" fill="none" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            </div>
            <div className="persona-info">
              <div className="persona-name">{d.persona.name}</div>
              <div className="persona-role">{d.persona.job}</div>
            </div>
            <div className="condition-box">
              <div className="condition-label mono">CLINICAL</div>
              <div className="condition-text">{d.persona.condition}</div>
            </div>
            <dl className="persona-stats">
              <div><dt>복약</dt><dd>{d.persona.meds}</dd></div>
              <div><dt>가구</dt><dd>{d.persona.family}</dd></div>
              <div><dt>접근채널</dt><dd>{d.persona.channel}</dd></div>
            </dl>
            <div className="persona-symptoms">
              <div className="symptoms-label">주요 임상 이슈</div>
              <div className="symptoms-chips">
                {d.persona.symptoms.map((s, i) => (
                  <span key={i} className="chip chip-symptom">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        </Reveal>

        <Reveal id="painpoints" label="임상 니즈 매트릭스" agent="clio">
        <div className="panel painpoints-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">임상 니즈 매트릭스 <window.SourceTag id="agent_estimate" label="추정치" /></div>
              <div className="panel-sub">빈도·심각도·미충족 (예시 표본 · 실사용 전 실측 서베이로 교체 필요)</div>
            </div>
            <div className="panel-note mono" title="공개 코호트 데이터 아님 · 시연용 가상 표본수">예시 n = 1,842 (가상)</div>
          </div>
          <div className="painpoints">
            <div className="painpoints-header mono">
              <div>임상 이슈</div>
              <div className="pp-col">빈도 %</div>
              <div className="pp-col">심각도 /10</div>
              <div className="pp-col">미충족 /10</div>
              <div className="pp-col">우선순위</div>
            </div>
            {d.painPoints.map((p, i) => {
              const priority = (p.freq/100 * 0.3 + p.severity/10 * 0.35 + p.unmet/10 * 0.35) * 100;
              return (
                <div key={i} className="painpoint-row">
                  <div className="pp-name">{p.pain}</div>
                  <div className="pp-col mono">{p.freq}</div>
                  <div className="pp-col"><div className="pp-bar" style={{width: `${p.severity*10}%`}}></div><span className="mono pp-num">{p.severity}</span></div>
                  <div className="pp-col"><div className="pp-bar pp-bar-unmet" style={{width: `${p.unmet*10}%`}}></div><span className="mono pp-num">{p.unmet}</span></div>
                  <div className="pp-col">
                    <div className="priority-tag" style={{"--p": `${priority}%`}}>
                      <span className="mono">{priority.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </Reveal>
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

      <Reveal id="papers" label="채택 논문" agent="clio">
      <div className="panel">
        <div className="panel-header">
            <div>
            <div className="panel-title">채택 논문 · 임상영양 근거</div>
            <div className="panel-sub mono">검색 소스: PubMed (pubmed.ncbi.nlm.nih.gov) · {d.papersSearchNote}</div>
          </div>
        </div>
        <div className="papers-grid">
          {d.papers.map((p, i) => (
            <a key={i} className="paper-card paper-card-link" href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`} target="_blank" rel="noopener noreferrer">
              <div className="paper-header">
                <span className="mono paper-idx">#{String(i+1).padStart(2,"0")} · PMID {p.pmid}</span>
                <span className="paper-journal">{p.journal} · {p.year}</span>
              </div>
              <div className="paper-title">{p.title} <span className="paper-link-icon">↗</span></div>
              <div className="paper-stats">
                <span className="mono">n = {p.n}</span>
                <span className="paper-effect">{p.effect}</span>
              </div>
              <div className="paper-key">
                <span className="mono paper-key-label">KEY</span>
                <span>{p.key}</span>
              </div>
            </a>
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
    </div>
  );
};

window.Step2Target = Step2Target;
