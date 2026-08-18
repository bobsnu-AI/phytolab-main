// 실시간 Multi-Agent 논의 스트림 Context
// - 서버(/api/agents/stepN/stream, SSE)로부터 Agent 발언을 하나씩 수신
// - 가운데 패널(RevealGate)과 오른쪽 대화 패널(LiveAgentPanel)이 동일한 스트림 상태를 공유
//   → "Agent가 논의한 결과가 실제로 패널에 반영된다"는 인과관계를 하나의 소스로 통일
(function () {
  const { createContext, useContext, useState, useEffect, useRef, useCallback } = React;

  const AgentStreamContext = createContext(null);

  // 라이브 논의가 연결된 스텝만 등록. (Step1에서 검증한 패턴을 Step2~5로 확장)
  const STEP_ENDPOINTS = {
    1: "/api/agents/step1/stream",
    2: "/api/agents/step2/stream",
    3: "/api/agents/step3/stream",
    4: "/api/agents/step4/stream",
  };
  // 서버 SSE 라우트가 ?dataset= 쿼리로 픽업하는 최상위 키들 (src/agents/routes.ts의 datasetKeys와 동일해야 함)
  const STEP_DATASET_KEYS = {
    1: ["product", "market", "competitors", "reviews", "concept"],
    2: ["product", "target", "nutritionCompare"],
    3: ["product", "formula"],
    4: ["product", "cost", "formula"],
  };

  function buildStepEndpoint(step) {
    const path = STEP_ENDPOINTS[step];
    if (!path) return null;
    if (!window.PHYTO_DATA?.generated) return path;
    const picked = {};
    (STEP_DATASET_KEYS[step] || []).forEach(k => { picked[k] = window.PHYTO_DATA[k]; });
    return `${path}?dataset=${encodeURIComponent(JSON.stringify(picked))}`;
  }

  // Step1의 모든 섹션 ID — done/error 시 미reveal 섹션 자동 공개에 사용
  const ALL_STEP1_SECTION_IDS = [
    "context", "kpi", "segments", "channels", "positioning",
    "matrix", "nutrition_compare", "naver_trend",
    "reviews", "concept_pod", "conclusion",
  ];

  function AgentStreamProvider({ step, children }) {
    const endpoint = buildStepEndpoint(step);
    const isLive = !!endpoint;

    const [turns, setTurns] = useState([]);
    const [status, setStatus] = useState("idle"); // idle | connecting | streaming | done | error
    const [revealed, setRevealed] = useState(() => new Set());
    const [runId, setRunId] = useState(0);
    const esRef = useRef(null);

    useEffect(() => {
      if (!isLive) {
        setTurns([]);
        setRevealed(new Set());
        setStatus("idle");
        return;
      }

      setTurns([]);
      setRevealed(new Set());
      setStatus("connecting");

      const es = new EventSource(endpoint);
      esRef.current = es;

      es.addEventListener("turn", (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch (_) { return; }
        setStatus("streaming");
        setTurns((prev) => [...prev, data]);
        if (data.revealsSection) {
          const ids = Array.isArray(data.revealsSection) ? data.revealsSection : [data.revealsSection];
          setRevealed((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        }
      });

      es.addEventListener("done", () => {
        // done 수신 시 아직 reveal 안 된 섹션 전부 공개 (타임아웃으로 일부 턴이 생략돼도 내용은 보여야 함)
        setRevealed((prev) => {
          const next = new Set(prev);
          ALL_STEP1_SECTION_IDS.forEach((id) => next.add(id));
          return next;
        });
        setStatus("done");
        es.close();
      });

      es.onerror = () => {
        // "done" 이벤트 수신 후 서버 연결 종료 시에도 onerror가 불림 → done 유지
        // "streaming" 상태 (데이터를 이미 받는 중) 에서 끊기면 완료로 간주 (일부 환경에서 정상 종료 패턴)
        setRevealed((prev) => {
          const next = new Set(prev);
          ALL_STEP1_SECTION_IDS.forEach((id) => next.add(id));
          return next;
        });
        setStatus((prev) => (prev === "done" || prev === "streaming" ? "done" : "error"));
        es.close();
      };

      return () => es.close();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, endpoint, runId]);

    const restart = useCallback(() => setRunId((r) => r + 1), []);

    const value = { step, isLive, turns, status, revealed, restart };
    return <AgentStreamContext.Provider value={value}>{children}</AgentStreamContext.Provider>;
  }

  function useAgentStream() {
    return useContext(AgentStreamContext);
  }

  // ============ RevealSection ============
  // 가운데 패널의 한 블록을 감싸서, 라이브 모드일 때 해당 섹션이
  // Agent 논의에서 실제로 "도출"되기 전까지는 스켈레톤으로 대기시킨다.
  // - 라이브 스트림이 없는 스텝(2~5)에서는 항상 즉시 렌더 (기존 동작 유지)
  function RevealSection({ id, label, agent, children }) {
    const live = window.useAgentStream ? window.useAgentStream() : null;

    if (!live?.isLive) return children;

    const isRevealed = live.revealed.has(id);
    if (isRevealed) {
      return <div className="reveal-in">{children}</div>;
    }

    const agentInfo = agent ? window.AGENTS[agent] : null;
    return (
      <div className="reveal-pending" style={agentInfo ? { "--agent-color": agentInfo.color } : undefined}>
        <div className="reveal-pending-inner">
          <div className="thinking-dots"><span></span><span></span><span></span></div>
          <span className="mono reveal-pending-label">
            {agentInfo ? `${agentInfo.name} 분석 대기 중` : "분석 대기 중"}
            {label ? ` · ${label}` : ""}
          </span>
        </div>
      </div>
    );
  }

  Object.assign(window, { AgentStreamProvider, useAgentStream, RevealSection });
})();
