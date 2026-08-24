// Mobile UI 컴포넌트: Bottom Nav + Chat Drawer
// ≤768px 에서만 렌더. 데스크탑에서는 CSS display:none으로 숨겨짐.
// app.js의 Workflow 컴포넌트가 step/setStep을 prop으로 내려줌.
(function () {
  const { useState, useEffect, useCallback, useRef } = React;

  // ── 모바일 여부 감지 훅 ──────────────────────────────────────────────────
  function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 768px)");
      const handler = (e) => setIsMobile(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
  }

  // Step 메타 정보
  const STEP_META = [
    { id: 1, icon: "📊", label: "Market",  en: "MARKET"  },
    { id: 2, icon: "🎯", label: "Target",  en: "TARGET"  },
    { id: 3, icon: "⚗️", label: "Formula", en: "FORMULA" },
    { id: 4, icon: "💰", label: "Cost",    en: "COST"    },
  ];

  // ── Bottom Navigation Bar ───────────────────────────────────────────────
  // step 탭 전환 + Chat Drawer 열기 버튼
  function MobileBottomNav({ step, setStep, chatOpen, setChatOpen, liveStatus }) {
    const isMobile = useIsMobile();
    if (!isMobile) return null;

    const isLive = liveStatus === "connecting" || liveStatus === "streaming";
    const isDone = liveStatus === "done";

    return (
      <nav className="mobile-bottom-nav" role="navigation" aria-label="하단 내비게이션">
        {STEP_META.map((s) => {
          const unlocked = window.StepGate?.isStepUnlocked(s.id) !== false;
          return (
            <button
              key={s.id}
              className={`mobile-nav-item ${step === s.id ? "active" : ""} ${!unlocked ? "locked" : ""}`}
              onClick={() => setStep(s.id)}
              aria-label={!unlocked ? `${s.en} 잠김 · 이전 단계 완료 필요` : `${s.en} 단계로 이동`}
              style={{ position: "relative" }}
            >
              <span className="mobile-nav-icon">{!unlocked ? "🔒" : s.icon}</span>
              <span className="mobile-nav-label">{s.label}</span>
              {/* 현재 step이 live 진행 중이면 점 표시 */}
              {step === s.id && isLive && (
                <span className="mobile-nav-dot pulse" />
              )}
            </button>
          );
        })}

        {/* Chat Drawer 열기 버튼 */}
        <button
          className={`mobile-nav-item ${chatOpen ? "active" : ""}`}
          onClick={() => setChatOpen((v) => !v)}
          aria-label="Agent 대화 열기"
          style={{ position: "relative" }}
        >
          <span className="mobile-nav-icon">
            {isLive ? (
              <span style={{ position: "relative", display: "inline-block" }}>
                💬
                <span
                  style={{
                    position: "absolute", top: -2, right: -2,
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--accent)",
                    animation: "pulse 1.6s ease-in-out infinite"
                  }}
                />
              </span>
            ) : "💬"}
          </span>
          <span className="mobile-nav-label">
            {isDone ? "Review" : isLive ? "Live" : "Chat"}
          </span>
        </button>
      </nav>
    );
  }

  // ── Chat Drawer ─────────────────────────────────────────────────────────
  // 위에서 슬라이드업되는 드로어. 내부에 MultiAgentReasoning 패널 포함.
  function MobileChatDrawer({ open, onClose, step, onActiveAgentsChange }) {
    const isMobile = useIsMobile();
    const panelRef = useRef(null);

    // 드로어 열릴 때 body 스크롤 막기
    useEffect(() => {
      if (!isMobile) return;
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => { document.body.style.overflow = ""; };
    }, [open, isMobile]);

    // 터치 스와이프 다운으로 닫기
    useEffect(() => {
      if (!isMobile || !open) return;
      const panel = panelRef.current;
      if (!panel) return;

      let startY = 0;
      let startTranslate = 0;
      let dragging = false;

      const onTouchStart = (e) => {
        // handle 영역에서만 드래그
        if (!e.target.closest(".mobile-drawer-handle")) return;
        startY = e.touches[0].clientY;
        startTranslate = 0;
        dragging = true;
        panel.style.transition = "none";
      };
      const onTouchMove = (e) => {
        if (!dragging) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0) {
          panel.style.transform = `translateY(${dy}px)`;
        }
      };
      const onTouchEnd = (e) => {
        if (!dragging) return;
        dragging = false;
        panel.style.transition = "";
        const dy = e.changedTouches[0].clientY - startY;
        if (dy > 80) {
          panel.style.transform = "";
          onClose();
        } else {
          panel.style.transform = "translateY(0)";
        }
      };

      panel.addEventListener("touchstart", onTouchStart, { passive: true });
      panel.addEventListener("touchmove", onTouchMove, { passive: true });
      panel.addEventListener("touchend", onTouchEnd, { passive: true });
      return () => {
        panel.removeEventListener("touchstart", onTouchStart);
        panel.removeEventListener("touchmove", onTouchMove);
        panel.removeEventListener("touchend", onTouchEnd);
      };
    }, [open, isMobile, onClose]);

    if (!isMobile) return null;

    return (
      <div className={`mobile-chat-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="mobile-drawer-backdrop" onClick={onClose} aria-label="드로어 닫기" />
        <div className="mobile-drawer-panel" ref={panelRef} role="dialog" aria-modal="true">
          <div className="mobile-drawer-handle" title="아래로 드래그하여 닫기" />
          {window.MultiAgentReasoning && (
            <window.MultiAgentReasoning
              step={step}
              speed="normal"
              onActiveAgentsChange={onActiveAgentsChange}
            />
          )}
        </div>
      </div>
    );
  }

  // 전역 등록
  Object.assign(window, { MobileBottomNav, MobileChatDrawer, useIsMobile });
})();
