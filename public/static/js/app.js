// App Root: STAGE 00 Brief Landing ↔ STAGE 01-04 Workflow 라우팅
(function () {
  const { useState, useEffect } = React;

  // 저장된/요청된 step이 아직 잠긴 상태(이전 단계 AI 논의 미완료)라면
  // 순차적으로 unlocked인 마지막 단계까지만 허용 — STEP2를 건너뛰고
  // STEP3·4로 곧바로 진입하는 것을 원천 차단.
  function clampToUnlocked(requested) {
    let s = 1;
    for (let i = 2; i <= requested; i++) {
      if (window.StepGate?.isStepUnlocked(i)) s = i; else break;
    }
    return s;
  }

  function Workflow({ brief, onBackToBrief }) {
    const [step, _setStep] = useState(() => {
      const saved = localStorage.getItem("phytolab-step");
      return clampToUnlocked(saved ? +saved : 1);
    });
    const [activeAgents, setActiveAgents] = useState([]);
    const [chatOpen, setChatOpen] = useState(true);
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [lockToast, setLockToast] = useState(null);

    // live 상태 — MobileBottomNav 점 표시용
    const live = window.useAgentStream ? window.useAgentStream() : null;

    // StepNav·모바일 네비 클릭을 이 함수로만 받는다 — 잠긴 단계로는 절대 이동 불가.
    const setStep = (target) => {
      if (window.StepGate?.isStepUnlocked(target)) {
        _setStep(target);
      } else {
        setLockToast(`STEP ${target - 1}의 AI 논의가 완료되어야 STEP ${target}을 열 수 있습니다`);
        setTimeout(() => setLockToast(null), 2600);
      }
    };

    useEffect(() => { localStorage.setItem("phytolab-step", String(step)); }, [step]);

    // 모바일에서 step 변경 시 chat drawer 자동 닫기
    useEffect(() => { setMobileChatOpen(false); }, [step]);

    const briefSummary = React.useMemo(() => {
      if (!brief) return null;
      const parts = [];
      window.BRIEF_AXES.forEach(ax => {
        const v = brief[ax.id];
        if (!v || (Array.isArray(v) && !v.length)) return;
        const vals = Array.isArray(v) ? v : [v];
        const labels = vals.map(x => ax.options.find(o => o.id === x)?.label).filter(Boolean);
        if (labels.length) parts.push(labels.join("·"));
      });
      return parts.join(" / ");
    }, [brief]);

    const AgentStreamProvider = window.AgentStreamProvider || (({ children }) => children);

    return (
      <AgentStreamProvider step={step}>
        <div className="app has-roster" data-screen-label={`0${step} ${window.Shell.STEPS[step - 1]?.en || ""}`}>
          <window.Shell.TitleBar />
          {briefSummary && (
            <div className="workflow-brief-strip">
              <button className="brief-back-btn" onClick={onBackToBrief}>
                <span className="mono">← BRIEF</span>
              </button>
              <button className="brief-regen-btn" title="데이터 재생성 (브리프 유지, AI 다시 생성)"
                onClick={() => {
                  localStorage.removeItem("phytolab-generated-dataset");
                  onBackToBrief();
                  setTimeout(() => {
                    const launchBtn = document.querySelector(".brief-launch-btn, [data-launch]");
                    if (launchBtn) launchBtn.click();
                  }, 100);
                }}>
                <span className="mono">↺ 재생성</span>
              </button>
              <span className="workflow-brief-eyebrow mono">CURRENT BRIEF</span>
              <span className="workflow-brief-summary">{briefSummary}</span>
              {window.PHYTO_DATA?.product?.category && (
                <span className="workflow-brief-type-badge">
                  <span className="workflow-brief-type-label">{window.PHYTO_DATA.product.category}</span>
                  {window.PHYTO_DATA.product.regClass && (
                    <span className="workflow-brief-reg-label mono"> · {window.PHYTO_DATA.product.regClass}</span>
                  )}
                </span>
              )}
            </div>
          )}
          <window.AgentRoster activeAgents={activeAgents} currentStep={step} />
          <div className={`workspace ${chatOpen ? "" : "no-agent"}`}>
            <window.Shell.StepNav current={step} setCurrent={setStep} />
            <div className="main-col">
              {step === 3 && <window.ConsensusMeter step={step} />}
              {step === 1 && <window.Step1Market />}
              {step === 2 && (window.StepGate?.isStepUnlocked(2) !== false ? <window.Step2Target /> : <window.StepLockedNotice step={2} prevStep={1} onGoBack={() => setStep(1)} />)}
              {step === 3 && (window.StepGate?.isStepUnlocked(3) !== false ? <window.Step3Formula /> : <window.StepLockedNotice step={3} prevStep={2} onGoBack={() => setStep(2)} />)}
              {step === 4 && (window.StepGate?.isStepUnlocked(4) !== false ? <window.Step4Cost /> : <window.StepLockedNotice step={4} prevStep={3} onGoBack={() => setStep(3)} />)}
            </div>
            {lockToast && (
              <div className="step-lock-toast">🔒 {lockToast}</div>
            )}
            <div className={`chat-panel-wrap ${chatOpen ? "open" : "closed"}`}>
              <button
                type="button"
                className="chat-toggle-tab"
                onClick={() => setChatOpen(v => !v)}
                title={chatOpen ? "대화 패널 닫기" : "대화 패널 열기"}
              >
                {chatOpen ? "›" : "‹"}
              </button>
              {chatOpen && (
                <window.MultiAgentReasoning
                  step={step}
                  speed="normal"
                  onActiveAgentsChange={setActiveAgents}
                />
              )}
            </div>
          </div>

          {/* ── 모바일 전용 UI ── */}
          {window.MobileBottomNav && (
            <window.MobileBottomNav
              step={step}
              setStep={setStep}
              chatOpen={mobileChatOpen}
              setChatOpen={setMobileChatOpen}
              liveStatus={live?.status}
            />
          )}
          {window.MobileChatDrawer && (
            <window.MobileChatDrawer
              open={mobileChatOpen}
              onClose={() => setMobileChatOpen(false)}
              step={step}
              onActiveAgentsChange={setActiveAgents}
            />
          )}
        </div>
      </AgentStreamProvider>
    );
  }

  function App() {
    const [screen, setScreen] = useState(() => {
      const launched = localStorage.getItem("phytolab-launched");
      // 새로고침 시 이전에 생성된 데이터셋을 window.PHYTO_DATA에 복원 (없으면 mockData.js 기본값 유지)
      if (launched === "1") {
        const savedDataset = localStorage.getItem("phytolab-generated-dataset");
        if (savedDataset) {
          try {
            const parsed = JSON.parse(savedDataset);
            // FALLBACK 데이터("기본 원료 / AI 생성 실패 / 기본값") 감지 시 복원 무시
            const isValid = Array.isArray(parsed?.target?.ingredients)
              && parsed.target.ingredients.length > 0
              && parsed.target.ingredients[0]?.name !== "기본 원료"
              && !parsed.market?.headerDesc?.includes("기본값")
              && !parsed.market?.context?.unmet?.includes("준비 중");
            if (isValid) {
              Object.assign(window.PHYTO_DATA, parsed);
            } else {
              // 무효 캐시 제거
              localStorage.removeItem("phytolab-generated-dataset");
            }
          } catch (e) {}
        }
      }
      return launched === "1" ? "workflow" : "brief";
    });
    const [brief, setBrief] = useState(() => {
      const saved = localStorage.getItem("phytolab-brief-confirmed");
      return saved ? JSON.parse(saved) : null;
    });

    const handleLaunch = (sel) => {
      // 새 브리프 시작 시 이전 세션의 단계 위치·완료 상태를 초기화.
      // 이걸 안 하면 이전에 STEP3(배합설계)까지 갔던 사용자가 완전히 새 브리프를
      // 생성해도 STEP1·STEP2를 건너뛰고 곧바로 STEP3로 진입하는 버그가 발생함.
      localStorage.removeItem("phytolab-step");
      window.StepGate?.resetStepCompletion();
      setBrief(sel);
      setScreen("workflow");
    };

    const handleBackToBrief = () => {
      localStorage.removeItem("phytolab-launched");
      localStorage.removeItem("phytolab-generated-dataset");
      setScreen("brief");
    };

    const FormulaProvider = window.FormulaProvider || (({ children }) => children);

    return (
      <>
        {screen === "brief" && window.BriefLanding && (
          <window.BriefLanding onLaunch={handleLaunch} />
        )}
        {screen === "workflow" && (
          <FormulaProvider key={(window.PHYTO_DATA?.product?.codename) || (brief && JSON.stringify(brief)) || "default"}>
            <Workflow brief={brief} onBackToBrief={handleBackToBrief} />
          </FormulaProvider>
        )}
      </>
    );
  }

  class Boundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) {
      console.error('[Boundary]', err, info);
    }
    render() {
      if (this.state.err) {
        return (
          <div style={{ padding: 24, fontFamily: 'monospace', color: '#ff9', background: '#221', minHeight: '100vh' }}>
            <h2 style={{ color: '#fff' }}>렌더 에러</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.err.message || this.state.err)}</pre>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, opacity: 0.7 }}>{String(this.state.err.stack || '').slice(0, 1200)}</pre>
          </div>
        );
      }
      return this.props.children;
    }
  }

  ReactDOM.createRoot(document.getElementById("app-root")).render(
    <Boundary><App /></Boundary>
  );
})();
