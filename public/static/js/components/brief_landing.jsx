// STAGE 00 · Brief Landing — 앱 진입 화면
// v2: "선택형" → "AI 추천형"
//   1) 사용자는 리드 축(카테고리·생애주기) 2개만 고른다.
//   2) 서버(/api/brief/recommend)가 규칙 테이블로 나머지 6개 축을 추천하고,
//      담당 Agent 페르소나가 LLM으로 추천 이유를 실시간 생성한다.
//   3) 사용자는 추천된 값을 그대로 쓰거나 자유롭게 수정해서 검토만 하면 된다.
// 프리셋(Quick Start)은 기존처럼 8축을 즉시 확정하며 추천 흐름을 건너뛴다.

const { useState, useEffect, useMemo, useRef } = React;

const REC_AXES = ["condition", "ingredient", "format", "reg", "channel", "strategy"];

// ---------- 유틸: 스코어 계산 ----------
function calcScores(sel) {
  const W = window.BRIEF_SCORE_WEIGHTS;
  const dims = ["evidence", "market", "reg_diff", "cost"];
  const out = {};
  for (const dim of dims) {
    let sum = 0, cnt = 0;
    const w = W[dim] || {};
    for (const [axis, val] of Object.entries(sel)) {
      const axW = w[axis];
      if (!axW) continue;
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) {
        if (axW[v] != null) { sum += axW[v]; cnt++; }
      }
    }
    out[dim] = cnt ? sum / cnt : 0;
  }
  return out;
}

function recKey(category, lifecycle) {
  return category && lifecycle ? `${category}|${lifecycle}` : null;
}

// ---------- 우측: 실시간 Agent 반응 스트림 ----------
function BriefAgentStream({ events, agents }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events.length]);

  return (
    <aside className="brief-agent-panel">
      <div className="brief-agent-header">
        <div className="brief-agent-title-row">
          <div className="brief-agent-title">TEAM · LIVE BRIEF</div>
          <div className="brief-agent-sub mono">5 agents · listening</div>
        </div>
        <div className="brief-agent-roster">
          {Object.values(window.AGENTS).map(a => {
            const active = agents.includes(a.id);
            return (
              <div key={a.id} className={`brief-mini-agent ${active ? "active" : ""}`}
                   style={{"--ac": a.color}}>
                <div className="brief-mini-dot"></div>
                <span className="mono">{a.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="brief-agent-stream" ref={listRef}>
        {events.length === 0 && (
          <div className="brief-agent-empty">
            <div className="brief-agent-empty-dot pulse"></div>
            <div className="brief-agent-empty-txt">
              카테고리 · 생애주기 선택 시 AI 추천이 시작됩니다
              <span className="mono">try: 카테고리 → 생애주기</span>
            </div>
          </div>
        )}
        {events.map((e, i) => {
          const a = window.AGENTS[e.agent];
          return (
            <div key={i} className={`brief-msg brief-msg-${e.tone || "info"}`} style={{"--ac": a.color}}>
              <div className="brief-msg-head">
                <span className="brief-msg-avatar" style={{background: a.color}}>{a.initial}</span>
                <span className="brief-msg-who mono">{a.name}</span>
                <span className="brief-msg-role">{a.role}</span>
                {e.tone === "flag" && <span className="brief-msg-badge">⚠ FLAG</span>}
                {e.tone === "insight" && <span className="brief-msg-badge">INSIGHT</span>}
                {e.tone === "rec" && <span className="brief-msg-badge">AI 추천</span>}
                <span className="brief-msg-time mono">+{e.t}</span>
              </div>
              <div className="brief-msg-body">{e.msg}</div>
              {e.ref && <div className="brief-msg-ref mono">{e.ref}</div>}
            </div>
          );
        })}
      </div>

      <div className="brief-agent-input">
        <div className="input-wrap">
          <span className="input-prompt mono">▸</span>
          <input placeholder="에이전트에게 질문 · 예: '이 조합이 진짜 될까?'" />
          <button className="input-send">↵</button>
        </div>
      </div>
    </aside>
  );
}

// ---------- 축 카드 그리드 ----------
function AxisSection({ axis, selected, onToggle, defaultOpen, aiReason, aiAgentId, locked }) {
  const [open, setOpen] = useState(defaultOpen);
  const isMulti = axis.multi;
  const values = isMulti ? (selected || []) : (selected ? [selected] : []);
  const lead = window.AGENTS[axis.lead];
  const selectedLabels = values.map(v => axis.options.find(o => o.id === v)?.label).filter(Boolean);
  const reasonAgent = aiAgentId ? window.AGENTS[aiAgentId] : null;

  return (
    <section className={`brief-axis ${open ? "open" : "closed"} ${values.length ? "has-value" : ""} ${aiReason ? "has-ai-rec" : ""}`}>
      <header className="brief-axis-head" onClick={() => setOpen(!open)}>
        <div className="brief-axis-marker" style={{"--ac": lead.color}}>
          <span className="brief-axis-icon">{axis.icon}</span>
        </div>
        <div className="brief-axis-titles">
          <div className="brief-axis-title-row">
            <span className="brief-axis-label">{axis.label}</span>
            {axis.required && <span className="brief-axis-req mono">REQUIRED</span>}
            {axis.multi && <span className="brief-axis-multi mono">MULTI</span>}
            {aiReason && <span className="brief-axis-ai-tag mono">✦ AI 추천</span>}
          </div>
          <div className="brief-axis-en mono">{axis.en}</div>
        </div>
        <div className="brief-axis-lead" style={{"--ac": lead.color}}>
          <span className="brief-axis-lead-avatar">{lead.initial}</span>
          <span className="brief-axis-lead-name mono">LEAD · {lead.name}</span>
        </div>
        <div className="brief-axis-summary">
          {selectedLabels.length > 0 ? (
            <div className="brief-axis-chips">
              {selectedLabels.slice(0, 3).map((l, i) => <span key={i} className="brief-axis-chip">{l}</span>)}
              {selectedLabels.length > 3 && <span className="brief-axis-chip more">+{selectedLabels.length - 3}</span>}
            </div>
          ) : (
            <span className="brief-axis-empty mono">{locked ? "AI 추천 대기 중" : "미선택"}</span>
          )}
        </div>
        <div className="brief-axis-toggle">{open ? "−" : "+"}</div>
      </header>

      {open && (
        <div className="brief-axis-body">
          {aiReason && (
            <div className="brief-axis-ai-reason" style={{"--ac": reasonAgent?.color}}>
              <span className="brief-axis-ai-reason-avatar" style={{background: reasonAgent?.color}}>
                {reasonAgent?.initial}
              </span>
              <div className="brief-axis-ai-reason-body">
                <span className="brief-axis-ai-reason-who mono">{reasonAgent?.name} · 추천 이유</span>
                <span className="brief-axis-ai-reason-text">{aiReason}</span>
              </div>
            </div>
          )}
          <div className="brief-axis-grid">
            {axis.options.map(opt => {
              const active = values.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  className={`brief-opt ${active ? "active" : ""} ${opt.hot ? "hot" : ""}`}
                  onClick={() => onToggle(axis.id, opt.id, isMulti)}
                  style={{"--ac": lead.color}}
                >
                  <div className="brief-opt-head">
                    <span className="brief-opt-label">{opt.label}</span>
                    {opt.hot && <span className="brief-opt-hot mono">HOT</span>}
                  </div>
                  <div className="brief-opt-sub mono">{opt.sub}</div>
                  {active && <div className="brief-opt-check">✓</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- 추천 배너 (리드 축 선택 직후 ~ 추천 완료까지) ----------
function RecommendationBanner({ status, catLabel, lifeLabel, onRetry, onManual }) {
  if (status === "loading") {
    return (
      <div className="brief-rec-banner brief-rec-loading">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <div className="brief-rec-banner-text">
          <strong>{catLabel} × {lifeLabel}</strong> 조합을 5명의 Agent가 분석해 나머지 6개 축을 추천하고 있습니다…
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="brief-rec-banner brief-rec-error">
        <span className="brief-rec-icon">⚠</span>
        <div className="brief-rec-banner-text">추천 생성에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.</div>
        <button className="brief-btn-ghost brief-rec-retry" onClick={onRetry}>다시 시도</button>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="brief-rec-banner brief-rec-done">
        <span className="brief-rec-icon">✦</span>
        <div className="brief-rec-banner-text">AI 추천이 아래 6개 축에 적용되었습니다. 필요한 부분만 자유롭게 조정하세요.</div>
        <button className="brief-btn-ghost brief-rec-retry" onClick={onRetry}>다시 추천받기</button>
      </div>
    );
  }
  return null;
}

// ---------- 하단 요약 · 스코어 게이지 ----------
function ScoreBar({ label, value, tone = "up", suffix = "" }) {
  const pct = Math.round(value * 100);
  const cls = tone === "down" ? "score-down" : tone === "warn" ? "score-warn" : "score-up";
  return (
    <div className={`brief-score ${cls}`}>
      <div className="brief-score-head">
        <span className="brief-score-label">{label}</span>
        <span className="brief-score-val mono">{pct}<span className="brief-score-unit">/100</span></span>
      </div>
      <div className="brief-score-track">
        <div className="brief-score-fill" style={{width: `${pct}%`}}></div>
        <div className="brief-score-ticks">
          {[20,40,60,80].map(t => <span key={t} style={{left: `${t}%`}}></span>)}
        </div>
      </div>
      <div className="brief-score-legend mono">{suffix}</div>
    </div>
  );
}

function BriefSummary({ sel, scores, canStart, missingAxes, onStart, onReset }) {
  const readablePairs = [];
  window.BRIEF_AXES.forEach(ax => {
    const val = sel[ax.id];
    if (!val || (Array.isArray(val) && !val.length)) return;
    const vals = Array.isArray(val) ? val : [val];
    const labels = vals.map(v => ax.options.find(o => o.id === v)?.label).filter(Boolean);
    if (labels.length) readablePairs.push({ ax: ax.label, val: labels.join(" · ") });
  });

  return (
    <div className="brief-summary">
      <div className="brief-summary-top">
        <div className="brief-summary-left">
          <div className="brief-summary-eyebrow mono">PROJECT BRIEF · WORKING DRAFT</div>
          <div className="brief-summary-headline">
            {readablePairs.length === 0 ? (
              <span className="brief-summary-placeholder">
                아직 정의된 축이 없습니다. 위에서 카테고리부터 선택하세요.
              </span>
            ) : (
              readablePairs.map((p, i) => (
                <span key={i} className="brief-summary-chunk">
                  <span className="brief-summary-key mono">{p.ax}</span>
                  <span className="brief-summary-val">{p.val}</span>
                  {i < readablePairs.length - 1 && <span className="brief-summary-sep">·</span>}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="brief-summary-actions">
          <button className="brief-btn-ghost" onClick={onReset}>초기화</button>
          <button
            className={`brief-btn-primary ${canStart ? "" : "disabled"}`}
            onClick={canStart ? onStart : undefined}
            disabled={!canStart}
          >
            <span className="brief-btn-primary-label">5-Stage 리서치 시작</span>
            <span className="brief-btn-primary-arrow">→</span>
          </button>
        </div>
      </div>

      <div className="brief-summary-scores">
        <ScoreBar label="근거 강도"    value={scores.evidence} tone="up"   suffix="논문·가이드라인 근거 확보 용이성" />
        <ScoreBar label="시장 매력도"  value={scores.market}   tone="up"   suffix="시장 규모 × 성장률 × 진입 여지" />
        <ScoreBar label="규제 난이도"  value={scores.reg_diff} tone="warn" suffix="허가 소요 기간·비용 (높을수록 부담)" />
        <ScoreBar label="원가 부담"    value={scores.cost}     tone="down" suffix="원료·제조·물류 비중 (높을수록 부담)" />
      </div>

      {!canStart && missingAxes.length > 0 && (
        <div className="brief-summary-missing">
          <span className="mono">필수 축 미완:</span>
          {missingAxes.map(m => <span key={m} className="brief-summary-missing-chip">{m}</span>)}
        </div>
      )}
    </div>
  );
}

// ---------- 프리셋 러너 ----------
function BriefPresets({ onApply, current }) {
  return (
    <div className="brief-presets">
      <div className="brief-presets-label mono">QUICK START ·</div>
      {window.BRIEF_PRESETS.map(p => (
        <button key={p.id}
          className={`brief-preset ${current === p.id ? "active" : ""}`}
          onClick={() => onApply(p)}>
          <span className={`brief-preset-tag brief-preset-tag-${p.tag === "기존" ? "old" : p.tag === "추천" ? "hot" : "new"}`}>{p.tag}</span>
          <span className="brief-preset-label">{p.label}</span>
          <span className="brief-preset-sub mono">{p.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- 메인 랜딩 ----------
function BriefLanding({ onLaunch }) {
  const [sel, setSel] = useState(() => {
    const saved = localStorage.getItem("phytolab-brief");
    return saved ? JSON.parse(saved) : {};
  });
  const [events, setEvents] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [presetId, setPresetId] = useState(null);
  const eventTimerRef = useRef(0);

  // 추천 상태: idle(아직 시작 안함) | loading | done | error
  // key는 "category|lifecycle" — 같은 조합에 대한 중복 호출을 막는 캐시 키 역할
  const [recState, setRecState] = useState(() => {
    const k = recKey(sel.category, sel.lifecycle);
    if (k) {
      const hasRest = REC_AXES.some(a => {
        const v = sel[a];
        return v && (!Array.isArray(v) || v.length);
      });
      if (hasRest) return { status: "done", key: k, reasons: {} };
    }
    return { status: "idle", key: null, reasons: {} };
  });

  useEffect(() => { localStorage.setItem("phytolab-brief", JSON.stringify(sel)); }, [sel]);

  const scores = useMemo(() => calcScores(sel), [sel]);

  const missingAxes = window.BRIEF_AXES.filter(ax => {
    if (!ax.required) return false;
    const v = sel[ax.id];
    return !v || (Array.isArray(v) && !v.length);
  }).map(ax => ax.label);
  const canStart = missingAxes.length === 0;

  // Agent 반응 트리거 (기존 축 클릭 리액션 — 리드 축 등 자유 클릭 시에도 유지)
  const pushAgentReaction = (axisId, optId) => {
    const axis = window.BRIEF_AXES.find(a => a.id === axisId);
    const opt = axis.options.find(o => o.id === optId);
    if (!opt) return;

    const reactions = [];
    const leadId = axis.lead;
    const leadMsg = window.BRIEF_AGENT_REACTIONS[leadId]?.[axisId]?.[optId];
    if (leadMsg) {
      reactions.push({ agent: leadId, msg: leadMsg, tone: "insight" });
    } else {
      reactions.push({ agent: leadId, msg: `"${opt.label}" 선택 확인. 관련 데이터 스캔 중…`, tone: "info" });
    }

    ["mara","clio","rena","finn","rega"].forEach(id => {
      if (id === leadId) return;
      const msg = window.BRIEF_AGENT_REACTIONS[id]?.[axisId]?.[optId];
      if (msg) {
        const tone = msg.startsWith("⚠") ? "flag" : "info";
        reactions.push({ agent: id, msg, tone });
      }
    });

    const baseT = eventTimerRef.current;
    reactions.forEach((r, i) => {
      const t = (baseT + (i + 1) * 0.6).toFixed(1);
      setTimeout(() => {
        setEvents(prev => [...prev, { ...r, t, ref: `axis:${axis.en} → ${opt.label}` }]);
        setActiveAgents(prev => Array.from(new Set([...prev, r.agent])));
        setTimeout(() => setActiveAgents(prev => prev.filter(a => a !== r.agent)), 3000);
      }, i * 500);
    });
    eventTimerRef.current = baseT + reactions.length * 0.6;
  };

  // ---------- AI 추천 호출 ----------
  const fetchRecommendation = async (category, lifecycle) => {
    const key = recKey(category, lifecycle);
    setRecState({ status: "loading", key, reasons: {} });
    try {
      const res = await fetch("/api/brief/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, lifecycle }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();

      setSel(prev => ({
        ...prev,
        condition: data.recommendation.condition,
        ingredient: data.recommendation.ingredient,
        format: data.recommendation.format,
        reg: data.recommendation.reg,
        channel: data.recommendation.channel,
        strategy: data.recommendation.strategy,
      }));
      setRecState({ status: "done", key, reasons: data.reasons });

      // 추천 이유를 우측 Agent 스트림에도 시차를 두고 흘려보낸다
      const baseT = eventTimerRef.current;
      REC_AXES.forEach((axis, i) => {
        const r = data.reasons[axis];
        if (!r) return;
        const t = (baseT + (i + 1) * 0.7).toFixed(1);
        setTimeout(() => {
          setEvents(prev => [...prev, { agent: r.agent, msg: r.text, tone: "rec", t, ref: `AI 추천 · ${axis}` }]);
          setActiveAgents(prev => Array.from(new Set([...prev, r.agent])));
          setTimeout(() => setActiveAgents(prev => prev.filter(a => a !== r.agent)), 3000);
        }, i * 550);
      });
      eventTimerRef.current = baseT + REC_AXES.length * 0.7;
    } catch (err) {
      setRecState({ status: "error", key, reasons: {} });
    }
  };

  // 카테고리 · 생애주기가 모두 정해지면 자동으로 추천 호출 (프리셋 경유 시엔 건너뜀)
  useEffect(() => {
    if (presetId) return;
    const key = recKey(sel.category, sel.lifecycle);
    if (!key) return;
    if (recState.key === key) return;
    fetchRecommendation(sel.category, sel.lifecycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.category, sel.lifecycle, presetId]);

  const toggle = (axisId, optId, isMulti) => {
    setSel(prev => {
      const cur = prev[axisId];
      if (isMulti) {
        const arr = Array.isArray(cur) ? cur : [];
        const next = arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId];
        return { ...prev, [axisId]: next };
      } else {
        if (cur === optId) {
          const cp = { ...prev }; delete cp[axisId]; return cp;
        }
        return { ...prev, [axisId]: optId };
      }
    });
    setPresetId(null);
    pushAgentReaction(axisId, optId);
  };

  const applyPreset = (p) => {
    setSel({ ...p.axes });
    setPresetId(p.id);
    setEvents([]);
    eventTimerRef.current = 0;
    // 프리셋은 이미 8축이 확정된 시나리오이므로 추천 호출을 건너뛰고 done으로 표시
    setRecState({ status: "done", key: recKey(p.axes.category, p.axes.lifecycle), reasons: {} });
    setTimeout(() => {
      setEvents([
        { agent: "mara",  msg: `프리셋 "${p.label}" 로드 · ${p.sub}`, tone: "info", t: "0.3" },
        { agent: "clio",  msg: `해당 조합의 임상 근거 스캔 완료. 근거 강도 ${Math.round(calcScores(p.axes).evidence * 100)}점.`, tone: "insight", t: "1.1" },
        { agent: "finn",  msg: `원가·마진 시뮬을 이 조합에 맞춰 준비하겠습니다.`, tone: "info", t: "1.8" },
      ]);
      eventTimerRef.current = 2.4;
    }, 100);
  };

  const reset = () => {
    setSel({});
    setEvents([]);
    setPresetId(null);
    setRecState({ status: "idle", key: null, reasons: {} });
    eventTimerRef.current = 0;
    localStorage.removeItem("phytolab-brief");
  };

  const launch = () => {
    localStorage.setItem("phytolab-brief-confirmed", JSON.stringify(sel));
    localStorage.setItem("phytolab-launched", "1");
    onLaunch(sel);
  };

  const leadAxes = window.BRIEF_AXES.filter(ax => ax.id === "category" || ax.id === "lifecycle");
  const restAxes = window.BRIEF_AXES.filter(ax => ax.id !== "category" && ax.id !== "lifecycle");
  const leadReady = !!(sel.category && sel.lifecycle);

  const catLabel = leadAxes[0].options.find(o => o.id === sel.category)?.label || "";
  const lifeLabel = leadAxes[1].options.find(o => o.id === sel.lifecycle)?.label || "";

  return (
    <div className="brief-app" data-screen-label="00 Brief Landing">
      {/* 상단 미니 타이틀바 */}
      <div className="brief-topbar">
        <div className="brief-topbar-left">
          <div className="logo-mark">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.35"/>
              <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="11" cy="11" r="1.8" fill="currentColor"/>
              <line x1="11" y1="0.5" x2="11" y2="4" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="11" y1="18" x2="11" y2="21.5" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="0.5" y1="11" x2="4" y2="11" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="18" y1="11" x2="21.5" y2="11" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </div>
          <div className="brand">
            <div className="brand-name">PHYTOLAB<span className="brand-dot">.</span>AI</div>
            <div className="brand-sub">Product Design Agent · New Project</div>
          </div>
        </div>
        <div className="brief-topbar-crumb">
          <span className="mono brief-crumb-active">STAGE 00</span>
          <span className="brief-crumb-sep">·</span>
          <span className="mono brief-crumb-dim">01</span>
          <span className="brief-crumb-sep">·</span>
          <span className="mono brief-crumb-dim">02</span>
          <span className="brief-crumb-sep">·</span>
          <span className="mono brief-crumb-dim">03</span>
          <span className="brief-crumb-sep">·</span>
          <span className="mono brief-crumb-dim">04</span>
          <span className="brief-crumb-sep">·</span>
          <span className="mono brief-crumb-dim">05</span>
        </div>
        <div className="brief-topbar-right">
          <span className="pill pill-status"><span className="dot pulse"></span><span>TEAM READY · 5/5</span></span>
        </div>
      </div>

      {/* 헤드라인 */}
      <div className="brief-hero">
        <div className="brief-hero-eyebrow mono">STAGE 00 · PROJECT BRIEF</div>
        <h1 className="brief-hero-title">
          카테고리와 생애주기만 고르면, <span className="brief-hero-em">나머지는 AI가</span> 추천합니다
        </h1>
        <div className="brief-hero-desc">
          <strong>제품 카테고리</strong>와 <strong>생애주기</strong> 두 가지만 선택하세요.
          5명의 전문 Agent가 건강이슈·원료·제형·규제·채널·전략 6개 축을 즉시 추천하고,
          왜 그런지 이유까지 설명합니다. 마음에 들지 않으면 자유롭게 바꾸면 됩니다.
        </div>
        <BriefPresets onApply={applyPreset} current={presetId} />
      </div>

      {/* 본체: 좌측 축 카드 + 우측 Agent 스트림 */}
      <div className="brief-workspace">
        <div className="brief-axes-col">
          {/* 1단계: 리드 축 (카테고리·생애주기) */}
          <div className="brief-axes-group">
            <div className="brief-axes-group-label mono">1 · 리드 입력 (이 2가지만 고르세요)</div>
            {leadAxes.map((ax, i) => (
              <AxisSection
                key={ax.id}
                axis={ax}
                selected={sel[ax.id]}
                onToggle={toggle}
                defaultOpen={true}
              />
            ))}
          </div>

          {/* 2단계: AI 추천 배너 */}
          {leadReady && (
            <RecommendationBanner
              status={recState.status}
              catLabel={catLabel}
              lifeLabel={lifeLabel}
              onRetry={() => fetchRecommendation(sel.category, sel.lifecycle)}
            />
          )}

          {/* 3단계: 추천된 6개 축 검토 */}
          {leadReady ? (
            <div className="brief-axes-group">
              <div className="brief-axes-group-label mono">2 · AI 추천 검토 (자유롭게 조정 가능)</div>
              {restAxes.map(ax => (
                <AxisSection
                  key={ax.id}
                  axis={ax}
                  selected={sel[ax.id]}
                  onToggle={toggle}
                  defaultOpen={false}
                  aiReason={recState.reasons?.[ax.id]?.text}
                  aiAgentId={recState.reasons?.[ax.id]?.agent}
                  locked={recState.status === "loading"}
                />
              ))}
            </div>
          ) : (
            <div className="brief-axes-placeholder">
              <span className="brief-axes-placeholder-icon">✦</span>
              위에서 카테고리 · 생애주기를 선택하면 나머지 6개 축(건강이슈·원료·제형·규제·채널·전략)이
              AI 추천과 함께 이 자리에 나타납니다.
            </div>
          )}
        </div>

        <BriefAgentStream events={events} agents={activeAgents} />
      </div>

      {/* 하단 sticky 요약 */}
      <BriefSummary
        sel={sel}
        scores={scores}
        canStart={canStart}
        missingAxes={missingAxes}
        onStart={launch}
        onReset={reset}
      />
    </div>
  );
}

window.BriefLanding = BriefLanding;
