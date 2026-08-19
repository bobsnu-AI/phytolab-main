// 실시간 Multi-Agent 논의 스트림 Context
// - 서버(/api/agents/stepN/stream, SSE POST)로부터 Agent 발언을 하나씩 수신
// - dataset을 POST body로 전송 (이전: GET ?dataset= → URL 8KB+ 초과로 CF Workers 차단)
// - 가운데 패널(RevealGate)과 오른쪽 대화 패널(LiveAgentPanel)이 동일한 스트림 상태를 공유
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
  // 서버 SSE 라우트가 body.dataset에서 픽업하는 최상위 키들 (src/agents/routes.ts의 datasetKeys와 동일해야 함)
  const STEP_DATASET_KEYS = {
    1: ["product", "market", "competitors", "reviews", "concept"],
    2: ["product", "target", "nutritionCompare"],
    3: ["product", "formula"],
    4: ["product", "cost", "formula"],
  };

  function buildStepBody(step) {
    const path = STEP_ENDPOINTS[step];
    if (!path) return { path, body: null };
    if (!window.PHYTO_DATA?.generated) return { path, body: null };
    const picked = {};
    (STEP_DATASET_KEYS[step] || []).forEach(k => { picked[k] = window.PHYTO_DATA[k]; });
    // POST body: { dataset: { product, market, ... } }
    return { path, body: JSON.stringify({ dataset: picked }) };
  }

  // Step1의 모든 섹션 ID — done/error 시 미reveal 섹션 자동 공개에 사용
  const ALL_STEP1_SECTION_IDS = [
    "context", "kpi", "segments", "channels", "positioning",
    "matrix", "nutrition_compare", "naver_trend",
    "reviews", "concept_pod", "conclusion",
  ];

  // ── 스텝별 완료 상태 캐시 ──────────────────────────────────────────────────
  const _stepCache = new Map();

  function AgentStreamProvider({ step, children }) {
    const { path: endpoint, body: bodyStr } = buildStepBody(step);
    const isLive = !!endpoint;

    // runId per-step: 각 step마다 독립된 재시작 카운터를 유지
    const [runIds, setRunIds] = useState({});
    const runId = runIds[step] ?? 0;
    const cacheKey = `${step}:${runId}`;

    const [turns, setTurns]       = useState([]);
    const [status, setStatus]     = useState("idle");
    const [revealed, setRevealed] = useState(new Set());

    // abort controller ref — fetch 취소용
    const abortRef = useRef(null);

    // step 또는 runId 변경 시: 캐시 확인 → 있으면 복원만, 없으면 SSE 시작
    useEffect(() => {
      // 이전 fetch 취소
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

      if (!isLive) {
        setTurns([]);
        setRevealed(new Set());
        setStatus("idle");
        return;
      }

      // ── 캐시 히트: 이미 완료된 스텝 → 복원만 하고 fetch 열지 않음 ──
      const cached = _stepCache.get(cacheKey);
      if (cached && (cached.status === "done" || cached.status === "streaming")) {
        setTurns(cached.turns);
        setRevealed(cached.revealed);
        setStatus(cached.status);
        return;
      }

      // ── 캐시 미스: 새 SSE 스트림 시작 (fetch POST) ──
      setTurns([]);
      setRevealed(new Set());
      setStatus("connecting");

      let localTurns    = [];
      let localRevealed = new Set();
      let localStatus   = "connecting";

      const save = (t, r, s) => {
        _stepCache.set(cacheKey, { turns: t, revealed: r, status: s });
      };

      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyStr || "{}",
            signal: controller.signal,
          });

          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            // SSE 파싱: 이벤트 블록은 빈 줄(\n\n)로 구분
            const blocks = buf.split("\n\n");
            buf = blocks.pop() ?? "";   // 마지막 미완성 블록은 버퍼에 유지

            for (const block of blocks) {
              let event = "message", data = "";
              for (const line of block.split("\n")) {
                if (line.startsWith("event:")) event = line.slice(6).trim();
                else if (line.startsWith("data:")) data = line.slice(5).trim();
              }

              if (event === "turn") {
                let parsed;
                try { parsed = JSON.parse(data); } catch { continue; }
                localTurns = [...localTurns, parsed];
                localStatus = "streaming";
                setStatus("streaming");
                setTurns(localTurns);
                if (parsed.revealsSection) {
                  const ids = Array.isArray(parsed.revealsSection) ? parsed.revealsSection : [parsed.revealsSection];
                  ids.forEach((id) => localRevealed.add(id));
                  setRevealed(new Set(localRevealed));
                }
                save(localTurns, new Set(localRevealed), localStatus);

              } else if (event === "done") {
                ALL_STEP1_SECTION_IDS.forEach((id) => localRevealed.add(id));
                localStatus = "done";
                setRevealed(new Set(localRevealed));
                setStatus("done");
                save(localTurns, new Set(localRevealed), "done");
                reader.cancel();
                return;
              }
            }
          }

          // 스트림 자연 종료 (done 이벤트 없이 끊긴 경우)
          ALL_STEP1_SECTION_IDS.forEach((id) => localRevealed.add(id));
          const finalStatus = (localStatus === "done" || localStatus === "streaming") ? "done" : "error";
          localStatus = finalStatus;
          setRevealed(new Set(localRevealed));
          setStatus(finalStatus);
          save(localTurns, new Set(localRevealed), finalStatus);

        } catch (err) {
          if (err?.name === "AbortError") return;   // 정상 취소
          ALL_STEP1_SECTION_IDS.forEach((id) => localRevealed.add(id));
          const errStatus = (localStatus === "done" || localStatus === "streaming") ? "done" : "error";
          localStatus = errStatus;
          setRevealed(new Set(localRevealed));
          setStatus(errStatus);
          save(localTurns, new Set(localRevealed), errStatus);
        }
      })();

      return () => { controller.abort(); abortRef.current = null; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, cacheKey]);

    // restart: 현재 step의 runId만 +1 → 강제 재시작
    const restart = useCallback(() => {
      setRunIds((prev) => {
        const newRunId = (prev[step] ?? 0) + 1;
        _stepCache.delete(`${step}:${newRunId - 1}`);
        return { ...prev, [step]: newRunId };
      });
    }, [step]);

    const value = { step, isLive, turns, status, revealed, restart };
    return <AgentStreamContext.Provider value={value}>{children}</AgentStreamContext.Provider>;
  }

  function useAgentStream() {
    return useContext(AgentStreamContext);
  }

  // ============ RevealSection ============
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
