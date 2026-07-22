// App Root: STAGE 00 Brief Landing ↔ STAGE 01-05 Workflow 라우팅
(function () {
  const { useState, useEffect } = React;

  function Workflow({ brief, onBackToBrief }) {
    const [step, setStep] = useState(() => {
      const saved = localStorage.getItem("phytolab-step");
      return saved ? +saved : 1;
    });
    const [activeAgents, setActiveAgents] = useState([]);
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
            </div>
          )}
          <window.AgentRoster activeAgents={activeAgents} currentStep={step} />
          <div className="workspace">
            <window.Shell.StepNav current={step} setCurrent={setStep} />
            <div className="main-col">
              {step === 4 && <window.ConsensusMeter step={step} />}
              {step === 1 && <window.Step1Market />}
              {step === 2 && <window.Step2Target />}
              {step === 3 && <window.Step3Analysis />}
              {step === 4 && <window.Step4Formula />}
              {step === 5 && <window.Step5Cost />}
            </div>
            <window.MultiAgentReasoning
              step={step}
              speed="normal"
              onActiveAgentsChange={setActiveAgents}
            />
          </div>
        </div>
      </AgentStreamProvider>
    );
  }

  function App() {
    const [screen, setScreen] = useState(() => {
      const launched = localStorage.getItem("phytolab-launched");
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

    return (
      <>
        {screen === "brief" && window.BriefLanding && (
          <window.BriefLanding onLaunch={handleLaunch} />
        )}
        {screen === "workflow" && (
          <Workflow brief={brief} onBackToBrief={handleBackToBrief} />
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

  function Root() {
    const FP = window.FormulaProvider;
    return FP ? <FP><App /></FP> : <App />;
  }

  ReactDOM.createRoot(document.getElementById("app-root")).render(
    <Boundary><Root /></Boundary>
  );
})();
