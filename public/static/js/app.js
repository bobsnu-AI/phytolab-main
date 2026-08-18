// App Root: STAGE 00 Brief Landing ↔ STAGE 01-04 Workflow 라우팅
(function () {
  const { useState, useEffect } = React;

  function Workflow({ brief, onBackToBrief }) {
    const [step, setStep] = useState(() => {
      const saved = localStorage.getItem("phytolab-step");
      return saved ? +saved : 1;
    });
    const [activeAgents, setActiveAgents] = useState([]);
    const [chatOpen, setChatOpen] = useState(true);
    useEffect(() => { localStorage.setItem("phytolab-step", String(step)); }, [step]);

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
              {step === 2 && <window.Step2Target />}
              {step === 3 && <window.Step3Formula />}
              {step === 4 && <window.Step4Cost />}
            </div>
            {chatOpen && (
              <window.MultiAgentReasoning
                step={step}
                speed="normal"
                onActiveAgentsChange={setActiveAgents}
              />
            )}
            <button
              type="button"
              className="chat-toggle-tab"
              style={{ right: chatOpen ? "340px" : "0" }}
              onClick={() => setChatOpen(v => !v)}
              title={chatOpen ? "대화 패널 닫기" : "대화 패널 열기"}
            >
              {chatOpen ? "›" : "‹"}
            </button>
          </div>
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
            // FALLBACK 데이터("기본 원료 / AI 생성 실패") 감지 시 복원 무시
            const isValid = Array.isArray(parsed?.target?.ingredients)
              && parsed.target.ingredients.length > 0
              && parsed.target.ingredients[0]?.name !== "기본 원료";
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
      setBrief(sel);
      setScreen("workflow");
    };

    const handleBackToBrief = () => {
      localStorage.removeItem("phytolab-launched");
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
