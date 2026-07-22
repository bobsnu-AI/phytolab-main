// Shell + Multi-Agent 협업 컴포넌트
// TitleBar, StepNav, AgentRoster, HandoffDiagram, MultiAgentReasoning(script mode), ConsensusMeter
(function () {
  const { useState, useEffect, useRef } = React;

  const STEPS = [
    { id: 1, key: "market", label: "시장조사", en: "Market Scan", icon: "◔" },
    { id: 2, key: "target", label: "건강 타겟", en: "Health Target", icon: "◑" },
    { id: 3, key: "analysis", label: "제품 분석", en: "Product Analysis", icon: "◕" },
    { id: 4, key: "formula", label: "배합 설계", en: "Formulation", icon: "●" },
    { id: 5, key: "cost", label: "원가 시뮬", en: "Cost Simulator", icon: "◈" },
  ];

  function TitleBar() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
      const t = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(t);
    }, []);
    const timeStr = time.toISOString().slice(11, 19) + " UTC";
    return (
      <div className="titlebar">
        <div className="titlebar-left">
          <div className="logo-mark">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
              <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="11" cy="11" r="1.8" fill="currentColor" />
              <line x1="11" y1="0.5" x2="11" y2="4" stroke="currentColor" strokeWidth="1.2" />
              <line x1="11" y1="18" x2="11" y2="21.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="0.5" y1="11" x2="4" y2="11" stroke="currentColor" strokeWidth="1.2" />
              <line x1="18" y1="11" x2="21.5" y2="11" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="brand">
            <div className="brand-name">PHYTOLAB<span className="brand-dot">.</span>AI</div>
            <div className="brand-sub">Product Design Agent · v2.4</div>
          </div>
        </div>
        <div className="titlebar-center">
          <div className="pill pill-status">
            <span className="dot pulse"></span>
            <span>AGENT ACTIVE</span>
          </div>
          <div className="crumb">
            <span className="mono">PROJECT</span>
            <span className="crumb-sep">/</span>
            <span>{window.PHYTO_DATA.product.codename}</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-target">{window.PHYTO_DATA.product.target}</span>
          </div>
        </div>
        <div className="titlebar-right">
          <div className="mono time">{timeStr}</div>
          <button className="tbtn"><span>공유</span></button>
          <button className="tbtn tbtn-primary"><span>제안서 출력</span></button>
        </div>
      </div>
    );
  }

  function StepNav({ current, setCurrent }) {
    return (
      <nav className="stepnav">
        <div className="stepnav-header">
          <div className="stepnav-title">WORKFLOW</div>
          <div className="stepnav-sub">5 stages · autonomous</div>
        </div>
        <ol className="stepnav-list">
          {STEPS.map((s, i, arr) => {
            const status = s.id < current ? "done" : s.id === current ? "active" : "pending";
            return (
              <li key={s.id} className={`stepnav-item stepnav-${status}`} onClick={() => setCurrent(s.id)}>
                <div className="stepnav-rail">
                  <div className="stepnav-marker">
                    {status === "done" ? "✓" : <span className="mono">{String(s.id).padStart(2, "0")}</span>}
                  </div>
                  {i < arr.length - 1 && <div className="stepnav-line"></div>}
                </div>
                <div className="stepnav-body">
                  <div className="stepnav-label">{s.label}</div>
                  <div className="stepnav-en mono">{s.en.toUpperCase()}</div>
                  {status === "active" && <div className="stepnav-bar"><div className="stepnav-bar-fill"></div></div>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="stepnav-footer">
          <div className="foot-row"><span>실행 시간</span><span className="mono">02:47:14</span></div>
          <div className="foot-row"><span>검토 논문</span><span className="mono">312</span></div>
          <div className="foot-row"><span>스캔 SKU</span><span className="mono">218</span></div>
          <div className="foot-row"><span>가이드라인</span><span className="mono">KDA·ADA·ESPEN</span></div>
        </div>
      </nav>
    );
  }

  // ============ Source Tag (출처 배지 · 클릭 시 팝오버) ============
  function SourceTag({ id, label }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const src = window.SOURCES?.[id];

    useEffect(() => {
      if (!open) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    if (!src) return null;

    return (
      <span className="src-tag-wrap" ref={ref}>
        <button
          type="button"
          className={`src-tag ${src.verified ? "src-verified" : "src-unverified"}`}
          onClick={() => setOpen(v => !v)}
          title={src.verified ? "출처 보기" : "미검증 · 추정치"}
        >
          <span className="src-tag-icon">{src.verified ? "ⓘ" : "△"}</span>
          <span className="src-tag-label">{label || "출처"}</span>
        </button>
        {open && (
          <div className="src-pop">
            <div className={`src-pop-status mono ${src.verified ? "ok" : "warn"}`}>
              {src.verified ? "✓ 검증된 출처" : "△ 미검증 · 시연용 추정치"}
            </div>
            <div className="src-pop-org">{src.org}</div>
            <div className="src-pop-label">{src.label}</div>
            {src.detail && <div className="src-pop-detail">{src.detail}</div>}
            {src.asOf && <div className="src-pop-asof mono">기준: {src.asOf}</div>}
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="src-pop-link">
                원문 보기 ↗
              </a>
            ) : (
              <div className="src-pop-nolink mono">공개 링크 없음</div>
            )}
          </div>
        )}
      </span>
    );
  }

  // ============ Agent Roster (상단 아바타 바) ============
  function AgentRoster({ activeAgents, currentStep }) {
    const leadInfo = window.STEP_LEADS[currentStep];
    const agentList = Object.values(window.AGENTS);

    return (
      <div className="agent-roster">
        <div className="roster-label mono">MULTI-AGENT TEAM · {agentList.length}/5 ACTIVE</div>
        <div className="roster-avatars">
          {agentList.map(a => {
            const isLead = leadInfo?.lead === a.id;
            const isSupport = leadInfo?.support?.includes(a.id);
            const isActive = activeAgents.includes(a.id);
            return (
              <div key={a.id} className={`roster-item ${isLead ? "lead" : isSupport ? "support" : "idle"} ${isActive ? "active" : ""}`}>
                <div className="ra-avatar" style={{ "--agent-color": a.color, "--agent-soft": a.colorSoft }}>
                  <span>{a.initial}</span>
                  {isActive && <div className="ra-pulse"></div>}
                </div>
                <div className="ra-info">
                  <div className="ra-name">{a.name}</div>
                  <div className="ra-role">{a.role}</div>
                </div>
                {isLead && <div className="ra-badge mono">LEAD</div>}
                {isSupport && <div className="ra-badge ra-badge-support mono">SUPPORT</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============ Handoff Diagram ============
  function HandoffDiagram({ currentStep }) {
    const info = window.STEP_LEADS[currentStep];
    if (!info) return null;
    const lead = window.AGENTS[info.lead];
    const support = info.support.map(id => window.AGENTS[id]);

    return (
      <div className="handoff-diagram">
        <div className="hd-title mono">STEP {String(currentStep).padStart(2, "0")} · AGENT ORCHESTRATION</div>
        <div className="hd-flow">
          <div className="hd-lead" style={{ "--agent-color": lead.color }}>
            <div className="hd-avatar hd-lead-avatar">
              <span>{lead.initial}</span>
            </div>
            <div className="hd-lead-info">
              <div className="hd-name">{lead.name}</div>
              <div className="hd-tag mono">LEAD</div>
            </div>
          </div>
          <div className="hd-arrow">
            <svg viewBox="0 0 40 20" width="40" height="20">
              <path d="M2,10 L34,10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
              <path d="M28,4 L36,10 L28,16" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
            </svg>
          </div>
          <div className="hd-support-group">
            <div className="hd-support-label mono">SUPPORTING</div>
            <div className="hd-support-list">
              {support.map(a => (
                <div key={a.id} className="hd-support-item" style={{ "--agent-color": a.color }}>
                  <div className="hd-avatar hd-support-avatar">
                    <span>{a.initial}</span>
                  </div>
                  <div className="hd-name">{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ Multi-Agent Reasoning ============
  // step 1: 실시간 LLM 논의(라이브 스트림, useAgentStream)를 소비.
  // step 2-5: 기존 스크립트 재생(MULTI_REASONING) — 추후 동일 패턴으로 확장 예정.
  function MultiAgentReasoning({ step, speed, onActiveAgentsChange }) {
    const live = window.useAgentStream ? window.useAgentStream() : null;
    const isLive = !!live?.isLive;

    if (isLive) {
      return <LiveMultiAgentReasoning step={step} onActiveAgentsChange={onActiveAgentsChange} live={live} />;
    }
    return <ScriptedMultiAgentReasoning step={step} speed={speed} onActiveAgentsChange={onActiveAgentsChange} />;
  }

  function AgentMessageItem({ it, keyPrefix }) {
    const agent = window.AGENTS[it.agent];
    if (!agent) return null;
    return (
      <div className={`ma-item ma-${it.type}`} style={{ "--agent-color": agent.color, "--agent-soft": agent.colorSoft }}>
        <div className="ma-avatar">
          <span>{agent.initial}</span>
        </div>
        <div className="ma-body">
          <div className="ma-header-row">
            <span className="ma-name">{agent.name}</span>
            <span className="ma-role">{agent.role}</span>
            {it.t && <span className="ma-time mono">+{it.t}</span>}
          </div>
          {it.tool && (
            <div className="ma-tool mono">
              <span className="ma-tool-icon">⚙</span>
              <span>{it.tool}</span>
            </div>
          )}
          <div className={`ma-msg ma-msg-${it.type}`}>
            {it.type === "flag" && <span className="ma-tag ma-tag-flag mono">⚠ FLAG</span>}
            {it.type === "vote" && <span className="ma-tag ma-tag-vote mono">✓ VOTE</span>}
            {it.type === "consensus" && <span className="ma-tag ma-tag-consensus mono">◈ CONSENSUS</span>}
            {it.type === "handoff" && <span className="ma-tag ma-tag-handoff mono">→ HANDOFF · {window.AGENTS[it.to]?.name}</span>}
            {it.msg}
          </div>
        </div>
      </div>
    );
  }

  function ScriptedMultiAgentReasoning({ step, speed, onActiveAgentsChange }) {
    const scriptItems = window.MULTI_REASONING[step] || [];
    const [shown, setShown] = useState(0);
    const streamRef = useRef(null);

    const speedMs = speed === "fast" ? 250 : speed === "deliberate" ? 900 : 500;

    useEffect(() => {
      setShown(0);
      let i = 0;
      const t = setInterval(() => {
        i++;
        setShown(i);
        if (i >= scriptItems.length) clearInterval(t);
      }, speedMs);
      return () => clearInterval(t);
    }, [step]);

    useEffect(() => {
      const recent = scriptItems.slice(Math.max(0, shown - 2), shown).map(x => x.agent);
      onActiveAgentsChange?.([...new Set(recent)]);
    }, [shown]);

    useEffect(() => {
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }, [shown]);

    const displayedScript = scriptItems.slice(0, shown);

    return (
      <aside className="agent-panel multi-agent-panel">
        <div className="agent-header">
          <div className="agent-title-row">
            <div className="ma-header-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <circle cx="12" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="6" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="18" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <line x1="12" y1="9" x2="7" y2="14" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="12" y1="9" x2="17" y2="14" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
              </svg>
            </div>
            <div>
              <div className="agent-title">TEAM CONVERSATION</div>
              <div className="agent-sub mono">scripted demo · step {step}/5 · {displayedScript.length} exchanges</div>
            </div>
          </div>
          <div className="agent-toolbar">
            <button className="chip active">대화</button>
            <button className="chip">툴 콜</button>
            <button className="chip">투표</button>
          </div>
        </div>
        <div className="agent-stream ma-stream" ref={streamRef}>
          {displayedScript.map((it, i) => (
            <AgentMessageItem key={`s-${step}-${i}`} it={it} />
          ))}
          {shown < scriptItems.length && (
            <div className="ma-thinking">
              <div className="thinking-dots"><span></span><span></span><span></span></div>
              <span className="mono">agents deliberating…</span>
            </div>
          )}
        </div>
        <div className="agent-input">
          <div className="input-wrap">
            <span className="input-prompt mono">▸</span>
            <input placeholder="라이브 Agent 채팅은 추후 지원 예정" disabled />
            <button className="input-send" disabled>↵</button>
          </div>
        </div>
      </aside>
    );
  }

  // ============ Live Multi-Agent Reasoning (실시간 LLM 스트림) ============
  function LiveMultiAgentReasoning({ step, onActiveAgentsChange, live }) {
    const { turns, status, restart } = live;
    const streamRef = useRef(null);

    useEffect(() => {
      const recent = turns.slice(-2).map(x => x.agent);
      onActiveAgentsChange?.([...new Set(recent)]);
    }, [turns.length]);

    useEffect(() => {
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }, [turns.length]);

    const isThinking = status === "connecting" || status === "streaming";
    const isError = status === "error";

    return (
      <aside className="agent-panel multi-agent-panel">
        <div className="agent-header">
          <div className="agent-title-row">
            <div className="ma-header-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <circle cx="12" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="6" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="18" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <line x1="12" y1="9" x2="7" y2="14" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="12" y1="9" x2="17" y2="14" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
              </svg>
            </div>
            <div>
              <div className="agent-title">
                TEAM CONVERSATION
                <span className="live-badge"><span className="live-dot"></span>LIVE</span>
              </div>
              <div className="agent-sub mono">실시간 AI 논의 · step {step}/5 · {turns.length} exchanges</div>
            </div>
          </div>
          <div className="agent-toolbar">
            <button className="chip active">대화</button>
            <button className="chip">툴 콜</button>
            <button className="chip">투표</button>
          </div>
        </div>
        <div className="agent-stream ma-stream" ref={streamRef}>
          {turns.map((it, i) => (
            <AgentMessageItem key={`live-${step}-${i}`} it={it} />
          ))}
          {isThinking && (
            <div className="ma-thinking">
              <div className="thinking-dots"><span></span><span></span><span></span></div>
              <span className="mono">{status === "connecting" ? "agents connecting…" : "agents deliberating…"}</span>
            </div>
          )}
          {isError && (
            <div className="ma-thinking" style={{ color: "var(--danger)" }}>
              <span className="mono">⚠ 연결 오류 · 재시도해 주세요</span>
            </div>
          )}
        </div>
        <div className="agent-input">
          <div className="input-wrap">
            <span className="input-prompt mono">▸</span>
            <input placeholder="라이브 Agent 채팅은 추후 지원 예정" disabled />
            <button className="input-send" disabled>↵</button>
          </div>
        </div>
        {status === "done" && (
          <div className="ma-actions" style={{ padding: "0 12px 12px" }}>
            <button className="ma-action-btn" style={{ "--agent-color": "var(--accent)" }} onClick={restart}>
              <span>↻</span>
              <strong>다시 논의하기</strong>
              <span style={{ opacity: 0.75, fontWeight: 400 }}>· 같은 근거로 Agent들이 다시 논의합니다</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  // ============ Consensus Meter ============
  function ConsensusMeter({ step }) {
    const live = window.useAgentStream ? window.useAgentStream() : null;
    const items = live?.isLive ? live.turns : (window.MULTI_REASONING[step] || []);
    const votes = items.filter(x => x.type === "vote");
    const total = Object.keys(window.AGENTS).length;
    const approved = votes.length;
    const pct = total > 0 ? (approved / total) * 100 : 0;
    const reached = approved === total && total >= 3;

    if (step !== 4) return null;

    return (
      <div className={`consensus-meter ${reached ? "reached" : ""}`}>
        <div className="cm-header">
          <div>
            <div className="cm-title">배합안 합의 지표</div>
            <div className="cm-sub mono">전원 승인 시 STEP 5 오픈</div>
          </div>
          <div className="cm-score mono">
            <span className="cm-num">{approved}</span>
            <span className="cm-sep">/</span>
            <span className="cm-total">{total}</span>
          </div>
        </div>
        <div className="cm-bar">
          <div className="cm-bar-fill" style={{ width: `${pct}%` }}></div>
        </div>
        <div className="cm-agents">
          {Object.values(window.AGENTS).map(a => {
            const vote = items.find(x => x.agent === a.id && x.type === "vote");
            const voted = !!vote;
            return (
              <div key={a.id} className={`cm-agent ${voted ? "voted" : "pending"}`} style={{ "--agent-color": a.color }}>
                <div className="cm-avatar">
                  <span>{a.initial}</span>
                  {voted && <div className="cm-check">✓</div>}
                </div>
                <div className="cm-agent-name">{a.name}</div>
                <div className="cm-vote-status mono">{voted ? "APPROVED" : "PENDING"}</div>
              </div>
            );
          })}
        </div>
        {reached && (
          <div className="cm-message">
            <span className="mono">🎉 만장일치</span> · 배합안 최종 승인
          </div>
        )}
      </div>
    );
  }

  window.Shell = { TitleBar, StepNav, STEPS };
  window.SourceTag = SourceTag;
  window.AgentRoster = AgentRoster;
  window.HandoffDiagram = HandoffDiagram;
  window.MultiAgentReasoning = MultiAgentReasoning;
  window.ConsensusMeter = ConsensusMeter;
})();
