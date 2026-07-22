// Step 1: Market Scan — FSMP 시장조사
// 라이브 논의 모드(useAgentStream.isLive)에서는 각 섹션이 RevealSection으로 감싸져
// 오른쪽 Agent 대화가 해당 결론에 도달하는 시점에 맞춰 순차적으로 나타난다.
// 스크립트 재생 모드(스텝2~5, 라이브 미연동)에서는 RevealSection이 children을 그대로 통과시켜
// 기존과 동일하게 즉시 렌더된다.
const Step1Market = () => {
  const d = PHYTO_DATA.market;
  const heat = (v) => `oklch(0.72 ${0.03 + (v/100)*0.14} 235 / ${0.15 + (v/100)*0.85})`;
  const Reveal = window.RevealSection || (({ children }) => children);

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 01 · MARKET SCAN</div>
          <h1 className="step-title">특수의료용도식품 · 당뇨환자용 시장</h1>
          <div className="step-desc">급여화 논의·고령화·당뇨 유병률 상승 · 병원·요양시설 B2B 65%</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">DATA</span><span className="badge-v-row"><span className="badge-v">식약처 · KDA · Global Data</span><window.SourceTag id="mfds_fsmp_standard" label="" /></span></div>
          <div className="badge"><span className="badge-k">SCAN</span><span className="badge-v-row"><span className="badge-v mono">FSMP 218 SKU</span><window.SourceTag id="agent_estimate" label="" /></span></div>
          <div className="badge"><span className="badge-k">UPDATED</span><span className="badge-v mono">2026-06-28</span></div>
        </div>
      </div>

      {/* 시장 컨텍스트 3줄 요약 — CLIO 발언으로 도출 */}
      <Reveal id="context" label="시장 컨텍스트" agent="clio">
        <div className="context-strip">
          <div className="cs-item">
            <div className="cs-tag mono">PREVALENCE</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.prevalence}</span><window.SourceTag id={d.context.prevalenceSourceKey} label="출처" /></div>
          </div>
          <div className="cs-item">
            <div className="cs-tag mono">UNMET NEED</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.unmet}</span><window.SourceTag id={d.context.unmetSourceKey} label="추정치" /></div>
          </div>
          <div className="cs-item">
            <div className="cs-tag mono">POLICY</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.policy}</span><window.SourceTag id={d.context.policySourceKey} label="출처" /></div>
          </div>
        </div>
      </Reveal>

      {/* KPI — MARA 발언으로 도출 */}
      <Reveal id="kpi" label="시장 규모 KPI" agent="mara">
        <div className="kpi-grid">
          <div className="kpi kpi-primary">
            <div className="kpi-label-row"><span className="kpi-label">국내 FSMP 시장</span><window.SourceTag id={d.domestic.sourceKey} label="출처" /></div>
            <div className="kpi-value"><span className="kpi-num">{d.domestic.size.toLocaleString()}</span><span className="kpi-unit">{d.domestic.unit}</span></div>
            <div className="kpi-delta up">▲ {d.domestic.year}→2033 성장 전망 (3배 이상)</div>
            <svg className="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,26 L20,22 L40,18 L60,12 L80,7 L100,2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M0,26 L20,22 L40,18 L60,12 L80,7 L100,2 L100,30 L0,30 Z" fill="currentColor" opacity="0.12"/>
            </svg>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">글로벌 의료식품 시장</span><window.SourceTag id={d.global.sourceKey} label="출처" /></div>
            <div className="kpi-value"><span className="kpi-num">{d.global.size}</span><span className="kpi-unit">B USD</span></div>
            <div className="kpi-delta up">▲ CAGR {d.global.cagr}% (2026–2035)</div>
            <svg className="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,22 L20,19 L40,16 L60,13 L80,9 L100,5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            </svg>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">B2B 채널 비중</span><window.SourceTag id="agent_estimate" label="추정치" /></div>
            <div className="kpi-value"><span className="kpi-num">65</span><span className="kpi-unit">%</span></div>
            <div className="kpi-delta">병원 + 요양시설 (Agent 추정)</div>
            <div className="kpi-scale">
              <div className="kpi-scale-bar" style={{width: "65%"}}></div>
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">평균 판가 밴드</span><window.SourceTag id="agent_estimate" label="추정치" /></div>
            <div className="kpi-value"><span className="kpi-num">38–54</span><span className="kpi-unit">천원</span></div>
            <div className="kpi-delta">경쟁사 판가 기준 (Step3 참조)</div>
            <div className="kpi-scale kpi-scale-range">
              <div className="kpi-scale-range-fill" style={{left: "20%", width: "48%"}}></div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="two-col">
        {/* 세그먼트 — MARA 발언으로 도출 */}
        <Reveal id="segments" label="세그먼트별 점유율" agent="mara">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">FSMP 세그먼트별 점유율 & 성장률 <window.SourceTag id="agent_estimate" label="추정치" /></div>
                <div className="panel-sub">공개 세그먼트 통계 부재 · Agent 추정 분해치</div>
              </div>
              <div className="panel-legend">
                <span className="lg-item"><span className="lg-dot lg-dot-hot"></span>Hot Zone</span>
                <span className="lg-item"><span className="lg-dot"></span>일반</span>
              </div>
            </div>
            <div className="segment-list">
              {d.segments.map((s, i) => (
                <div key={i} className={`segment-row ${s.hot ? "hot" : ""}`}>
                  <div className="segment-name">{s.label}</div>
                  <div className="segment-bar-wrap">
                    <div className="segment-bar" style={{width: `${(s.share/40)*100}%`}}></div>
                    <span className="segment-share mono">{s.share}%</span>
                  </div>
                  <div className={`segment-growth mono ${s.growth > 15 ? "up-strong" : "up"}`}>+{s.growth}%</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 유통 채널 — MARA 발언으로 도출 */}
        <Reveal id="channels" label="유통 채널" agent="mara">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">주요 유통 채널 <window.SourceTag id="agent_estimate" label="추정치" /></div>
                <div className="panel-sub">B2B 비중 우세 (공개 채널별 통계 부재 · Agent 추정)</div>
              </div>
            </div>
            <div className="channel-grid">
              {d.channels.map((c, i) => (
                <div key={i} className="channel-card">
                  <div className="channel-name">{c.name}</div>
                  <div className="channel-share">
                    <div className="channel-share-ring" style={{"--pct": `${c.share}%`}}>
                      <span className="mono">{c.share}%</span>
                    </div>
                  </div>
                  <div className="channel-cac">
                    <span>CAC</span>
                    <span className={`cac-tag cac-${c.cac === "낮음" ? "low" : c.cac === "중간" ? "mid" : "high"}`}>{c.cac}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* 적응증 검색 트렌드 — MARA 발언으로 도출 */}
      <Reveal id="trends" label="처방·구매 트렌드" agent="mara">
        <div className="panel">
          <div className="panel-header">
              <div>
              <div className="panel-title">FSMP 적응증별 임상영양 처방·구매 트렌드 <window.SourceTag id="agent_estimate" label="추정치" /></div>
              <div className="panel-sub">최근 6분기 지수 (공개 처방 데이터 미확보 · Agent 시연용 추정)</div>
            </div>
            <div className="panel-note mono">병원 처방 + B2B 발주</div>
          </div>
          <div className="heatmap">
            <div className="heatmap-header">
              <div className="heatmap-corner"></div>
              {d.trends.map((t, i) => <div key={i} className="heatmap-col mono">{t.q}</div>)}
            </div>
            {[
              { key: "diabetes",  label: "당뇨환자용" },
              { key: "oncol",     label: "암환자용" },
              { key: "renal",     label: "신장질환용" },
              { key: "dysphagia", label: "연하곤란용" },
            ].map((row) => (
              <div key={row.key} className="heatmap-row">
                <div className="heatmap-label">{row.label}</div>
                {d.trends.map((t, i) => (
                  <div key={i} className="heatmap-cell" style={{background: heat(t[row.key])}}>
                    <span className="mono">{t[row.key]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 결론 — MARA 발언으로 도출 */}
      <Reveal id="conclusion" label="종합 결론" agent="mara">
        <div className="callout">
          <div className="callout-tag mono">AGENT INSIGHT</div>
          <div className="callout-text">
            <strong>당뇨환자용 FSMP 6분기 연속 &gt;15% 성장</strong> · 60대+ 가정 대체식 수요 D2C로 확산 → <strong>병원 우선 진입 → D2C 확장</strong> 권장
          </div>
        </div>
      </Reveal>
    </div>
  );
};

window.Step1Market = Step1Market;
