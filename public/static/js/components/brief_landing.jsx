// STAGE 00 · Brief Landing — 앱 진입 화면
// v2: "선택형" → "AI 추천형"
//   1) 사용자는 리드 축(생애주기·건강이슈) 2개만 고른다.
//   2) 서버(/api/brief/recommend)가 규칙 테이블로 나머지 6개 축을 추천하고,
//      담당 Agent 페르소나가 LLM으로 추천 이유를 실시간 생성한다.
//   3) 사용자는 추천된 값을 그대로 쓰거나 자유롭게 수정해서 검토만 하면 된다.
// 프리셋(Quick Start)은 기존처럼 8축을 즉시 확정하며 추천 흐름을 건너뛴다.

const { useState, useEffect, useMemo, useRef } = React;

// category → 표준 규제 경로 (서버 brief_recommend.ts의 CATEGORY_DEFAULT_REG와 동기화 유지)
const CATEGORY_DEFAULT_REG = {
  fsmp: "fsmp", hfunc: "hfunc-i", senior: "seniorks",
  personal: "hfunc-i", general: "label", sports: "label",
  meal: "regular", infant: "fsmp",
};

const REC_AXES = ["category", "ingredient", "format", "reg", "channel", "strategy"];

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

function recKey(lifecycle, condition) {
  return lifecycle && condition && condition.length ? `${lifecycle}|${[...condition].sort().join(",")}` : null;
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
              생애주기 · 건강이슈 선택 시 AI 추천이 시작됩니다
              <span className="mono">try: 생애주기 → 건강이슈</span>
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
function RecommendationBanner({ status, lifeLabel, condLabel, onRetry, onManual }) {
  if (status === "loading") {
    return (
      <div className="brief-rec-banner brief-rec-loading">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <div className="brief-rec-banner-text">
          <strong>{lifeLabel} × {condLabel}</strong> 조합을 분석해 나머지 6개 축을 추천하고 있습니다…
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
        <div className="brief-rec-banner-text">AI 추천이 완료되었습니다. 준비되면 시작하세요.</div>
        <button className="brief-btn-ghost brief-rec-retry" onClick={onRetry}>다시 추천받기</button>
      </div>
    );
  }
  return null;
}

function BriefSummary({ canStart, loading, onStart, onReset }) {
  const disabled = !canStart || loading;
  return (
    <div className="brief-summary brief-summary-solo">
      <button className="brief-btn-ghost" onClick={onReset} disabled={loading}>초기화</button>
      <button
        className={`brief-btn-primary ${disabled ? "disabled" : ""}`}
        onClick={disabled ? undefined : onStart}
        disabled={disabled}
      >
        <span className="brief-btn-primary-label">{loading ? "생성 중…" : "4-Stage 리서치 시작"}</span>
        {!loading && <span className="brief-btn-primary-arrow">→</span>}
      </button>
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
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // category와 reg가 불일치하면 reg를 category 기준으로 재정렬
    // (이전 세션의 잘못된 추천값이 캐시된 채 복원되는 것을 방지)
    if (parsed.category && parsed.reg) {
      const correctReg = CATEGORY_DEFAULT_REG[parsed.category];
      if (correctReg && parsed.reg !== correctReg) {
        parsed.reg = correctReg;
        localStorage.setItem("phytolab-brief", JSON.stringify(parsed));
      }
    }
    return parsed;
  });
  const [events, setEvents] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [presetId, setPresetId] = useState(null);
  const [genState, setGenState] = useState("idle"); // idle | loading | error
  const eventTimerRef = useRef(0);

  // 추천 상태: idle(아직 시작 안함) | loading | done | error
  // key는 "lifecycle|condition들" — 같은 조합에 대한 중복 호출을 막는 캐시 키 역할
  const [recState, setRecState] = useState(() => {
    const k = recKey(sel.lifecycle, sel.condition);
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
  const fetchRecommendation = async (lifecycle, condition) => {
    const key = recKey(lifecycle, condition);
    setRecState({ status: "loading", key, reasons: {} });
    try {
      const res = await fetch("/api/brief/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle, condition }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const rec = data.recommendation;
      // category와 reg 불일치 시 클라이언트에서도 재정렬 (서버 로직과 동기화)
      const safeReg = CATEGORY_DEFAULT_REG[rec.category] || rec.reg;
      if (rec.reg !== safeReg) rec.reg = safeReg;

      setSel(prev => ({
        ...prev,
        category: rec.category,
        ingredient: rec.ingredient,
        format: rec.format,
        reg: rec.reg,
        channel: rec.channel,
        strategy: rec.strategy,
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

  // 생애주기 · 건강이슈가 모두 정해지면 자동으로 추천 호출 (프리셋 경유 시엔 건너뜀)
  useEffect(() => {
    if (presetId) return;
    const key = recKey(sel.lifecycle, sel.condition);
    if (!key) return;
    if (recState.key === key) return;
    fetchRecommendation(sel.lifecycle, sel.condition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.lifecycle, sel.condition, presetId]);

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
    setRecState({ status: "done", key: recKey(p.axes.lifecycle, p.axes.condition), reasons: {} });
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

  // "기존 당뇨환자용 FSMP" 프리셋(id: diabetes)은 실제 근거(PubMed·정부 통계)가 붙은 고정 데모이므로
  // 생성을 건너뛰고 mockData.js의 GLUCARE-M 데이터를 그대로 사용한다. 그 외에는 브리프에 맞춰 매번 새로 생성한다.
  const launch = async () => {
    if (presetId === "diabetes") {
      localStorage.setItem("phytolab-brief-confirmed", JSON.stringify(sel));
      localStorage.setItem("phytolab-launched", "1");
      localStorage.removeItem("phytolab-generated-dataset");
      onLaunch(sel);
      return;
    }
    // 새 생성 시작 전 이전 캐시 선제 삭제 — 구 FALLBACK 데이터가 새 세션에 노출되지 않도록
    localStorage.removeItem("phytolab-generated-dataset");
    setGenState("loading");
    try {
      const res = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 브리프 전체 정보를 서버에 전달 (category/reg/format/channel/strategy 포함)
        body: JSON.stringify({
          lifecycle: sel.lifecycle,
          condition: sel.condition,
          category: sel.category,
          reg: sel.reg,
          format: sel.format,
          ingredient: sel.ingredient,
          channel: sel.channel,
          strategy: sel.strategy,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const dataset = await res.json();
      // FALLBACK 데이터(AI 생성 실패)인 경우 localStorage에 저장하지 않음
      const isValidDataset = Array.isArray(dataset?.target?.ingredients)
        && dataset.target.ingredients.length > 0
        && dataset.target.ingredients[0]?.name !== "기본 원료";
      Object.assign(window.PHYTO_DATA, dataset);
      if (isValidDataset) {
        localStorage.setItem("phytolab-generated-dataset", JSON.stringify(dataset));
      }
      localStorage.setItem("phytolab-brief-confirmed", JSON.stringify(sel));
      localStorage.setItem("phytolab-launched", "1");
      setGenState("idle");
      onLaunch(sel);
    } catch (err) {
      setGenState("error");
    }
  };

  const launchWithFallback = () => {
    // 생성 실패 시에도 기존 GLUCARE-M 예시 데이터로 계속 진행 가능하게
    localStorage.setItem("phytolab-brief-confirmed", JSON.stringify(sel));
    localStorage.setItem("phytolab-launched", "1");
    localStorage.removeItem("phytolab-generated-dataset");
    setGenState("idle");
    onLaunch(sel);
  };

  const leadAxes = window.BRIEF_AXES.filter(ax => ax.id === "lifecycle" || ax.id === "condition");
  const leadReady = !!(sel.lifecycle && sel.condition && sel.condition.length);

  const lifeLabel = leadAxes[0].options.find(o => o.id === sel.lifecycle)?.label || "";
  const condLabel = (sel.condition || []).map(id => leadAxes[1].options.find(o => o.id === id)?.label).filter(Boolean).join("·");

  // 제품 유형 표시용 — 브리프 선택값 기반 (AI 생성 전)
  const categoryAxis = window.BRIEF_AXES.find(ax => ax.id === "category");
  const regAxis = window.BRIEF_AXES.find(ax => ax.id === "reg");
  const selectedCategoryLabel = categoryAxis?.options.find(o => o.id === sel.category)?.label || "";
  const selectedCategorySubLabel = categoryAxis?.options.find(o => o.id === sel.category)?.sub || "";
  const selectedRegLabel = regAxis?.options.find(o => o.id === sel.reg)?.label || "";
  const selectedRegSubLabel = regAxis?.options.find(o => o.id === sel.reg)?.sub || "";

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
        </div>
        <div className="brief-topbar-right">
          <span className="pill pill-status"><span className="dot pulse"></span><span>TEAM READY · 5/5</span></span>
        </div>
      </div>

      {/* 헤드라인 */}
      <div className="brief-hero">
        <div className="brief-hero-eyebrow mono">STAGE 00 · PROJECT BRIEF</div>
        <h1 className="brief-hero-title">생애주기 × 건강이슈</h1>
        <BriefPresets onApply={applyPreset} current={presetId} />
      </div>

      {/* 본체: 좌측 축 카드 + 우측 Agent 스트림 */}
      <div className="brief-workspace">
        <div className="brief-axes-col">
          {/* 리드 축 (생애주기·건강이슈) — 좌우 배치 */}
          <div className="brief-lead-grid">
            {leadAxes.map((ax) => (
              <AxisSection
                key={ax.id}
                axis={ax}
                selected={sel[ax.id]}
                onToggle={toggle}
                defaultOpen={true}
              />
            ))}
          </div>

          {leadReady && (
            <RecommendationBanner
              status={recState.status}
              lifeLabel={lifeLabel}
              condLabel={condLabel}
              onRetry={() => fetchRecommendation(sel.lifecycle, sel.condition)}
            />
          )}
        </div>

        <BriefAgentStream events={events} agents={activeAgents} />
      </div>

      {/* 하단 sticky 요약 */}
      <BriefSummary
        canStart={canStart}
        loading={genState === "loading"}
        onStart={launch}
        onReset={reset}
      />

      {genState === "loading" && (
        <div className="brief-gen-overlay">
          <div className="brief-gen-box">
            <div className="thinking-dots"><span></span><span></span><span></span></div>
            <div className="brief-gen-text">AI가 브리프에 맞는 제품 데이터를 생성하고 있습니다…</div>
            {(selectedCategoryLabel || selectedRegLabel) && (
              <div className="brief-gen-product-type">
                {/* 제품 정의: 카테고리 + 규제 클래스를 하나의 제품 정의 블록으로 표시 */}
                <div className="brief-gen-type-header mono">생성 대상 제품</div>
                <div className="brief-gen-type-definition">
                  {selectedCategoryLabel && (
                    <div className="brief-gen-type-row">
                      <span className="brief-gen-type-key mono">카테고리</span>
                      <div className="brief-gen-type-val-wrap">
                        <span className="brief-gen-type-val">{selectedCategoryLabel}</span>
                        {selectedCategorySubLabel && (
                          <span className="brief-gen-type-sub mono">{selectedCategorySubLabel}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedRegLabel && (
                    <div className="brief-gen-type-row">
                      <span className="brief-gen-type-key mono">규제 경로</span>
                      <div className="brief-gen-type-val-wrap">
                        <span className="brief-gen-type-val">{selectedRegLabel}</span>
                        {selectedRegSubLabel && (
                          <span className="brief-gen-type-sub mono">{selectedRegSubLabel}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedCategoryLabel && selectedRegLabel && (
                    <div className="brief-gen-type-note mono">
                      ✦ {selectedCategoryLabel} 제품을 {selectedRegLabel} 경로로 개발합니다
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {genState === "error" && (
        <div className="brief-gen-overlay">
          <div className="brief-gen-box brief-gen-error">
            <span className="brief-rec-icon">⚠</span>
            <div className="brief-gen-text">데이터 생성에 실패했습니다.</div>
            <div className="brief-gen-actions">
              <button className="brief-btn-ghost" onClick={launch}>다시 시도</button>
              <button className="brief-btn-primary" onClick={launchWithFallback}>
                <span className="brief-btn-primary-label">예시 데이터로 계속하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.BriefLanding = BriefLanding;
