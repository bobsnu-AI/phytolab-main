// Step 4: Cost Simulator — FSMP 액상 원가·판가·마진 시뮬레이터 (LIVE with FormulaContext)
// + 농산물 공공가격 API 연동 · 동결건조 분말 원가 계산기

/* ─────────────────────────────────────────────────────────
   IngredientPriceLookup: 원료 시세 조회 패널
   - 원료명 입력 → 공공데이터 농산물 가격 API 조회
   - NUTRIENT_DB 수분 자동 조회
   - 동결건조 분말 원가 계산
   - 계산 결과 → 자사단가(₩/g)로 자동 적용 콜백
───────────────────────────────────────────────────────── */
function IngredientPriceLookup({ onApplyPrice, initialKeyword, autoSearch }) {
  const [keyword, setKeyword] = React.useState(initialKeyword || "");
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem("phytolab-agro-apikey") || "");
  const [showApiKeyInput, setShowApiKeyInput] = React.useState(false);
  const [showFreezeDry, setShowFreezeDry] = React.useState(false); // 기본 접힘
  const [channel, setChannel] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  // initialKeyword 변경 시 keyword 갱신 + autoSearch면 자동 조회
  React.useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword);
      setResult(null);
      setError(null);
      if (autoSearch) {
        // 상태 갱신 후 다음 틱에 조회 실행
        setTimeout(() => triggerSearch(initialKeyword), 50);
      }
    }
  }, [initialKeyword, autoSearch]);

  // 동결건조 계산 state
  const [fdRawKg, setFdRawKg] = React.useState(100);
  const [fdMoisture, setFdMoisture] = React.useState(90.0);
  const [fdMfgCost, setFdMfgCost] = React.useState(150000);
  const [fdResult, setFdResult] = React.useState(null);

  // 자동완성
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSug, setShowSug] = React.useState(false);

  const CHANNELS = [
    { label: "전체", value: "" },
    { label: "소매", value: "1" },
    { label: "중도매", value: "2" },
    { label: "친환경", value: "3" },
    { label: "친환경(신규)", value: "7" },
  ];

  function handleKeywordChange(e) {
    const v = e.target.value;
    setKeyword(v);
    if (window.NUTRIENT_DB && v.trim().length >= 1) {
      const sug = window.NUTRIENT_DB.searchIngredients(v.trim());
      setSuggestions(sug);
      setShowSug(sug.length > 0);
    } else {
      setShowSug(false);
    }
    // 수분 자동 업데이트
    if (window.NUTRIENT_DB && v.trim()) {
      const m = window.NUTRIENT_DB.getMoisture(v.trim());
      setFdMoisture(m);
    }
  }

  function selectSuggestion(name) {
    setKeyword(name);
    setShowSug(false);
    if (window.NUTRIENT_DB) {
      setFdMoisture(window.NUTRIENT_DB.getMoisture(name));
    }
  }

  async function triggerSearch(kw) {
    const q = (kw || keyword).trim();
    if (!q) { setError("원료명을 입력하세요"); return; }
    setLoading(true); setError(null); setResult(null);
    localStorage.setItem("phytolab-agro-apikey", apiKey.trim());
    try {
      const params = new URLSearchParams({ keyword: q, apiKey: apiKey.trim(), ...(channel && { channel }) });
      const res = await fetch(`/api/ingredient-price?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) { setError(data.error || "조회 실패"); return; }
      setResult(data);
      if (window.NUTRIENT_DB) setFdMoisture(window.NUTRIENT_DB.getMoisture(q));
    } catch (e) {
      setError("네트워크 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!keyword.trim()) { setError("원료명을 입력하세요"); return; }
    await triggerSearch(keyword);
  }

  function calcFreezeDry() {
    if (!result || !result.avgPricePerKg) { setError("먼저 원료 시세를 조회하세요"); return; }
    const rawUnitPrice = result.avgPricePerKg;   // ₩/kg
    const totalRawCost = rawUnitPrice * fdRawKg;
    const solidPct = Math.max(0, 100 - fdMoisture);
    const powderYieldKg = fdRawKg * (solidPct / 100);
    const totalCost = totalRawCost + fdMfgCost;
    const powderCostPerKg = powderYieldKg > 0 ? totalCost / powderYieldKg : 0;
    const powderCostPerG = powderCostPerKg / 1000;
    setFdResult({ rawUnitPrice, totalRawCost, solidPct, powderYieldKg, totalCost, powderCostPerKg, powderCostPerG });
  }

  function handleApply(pricePerG) {
    if (onApplyPrice) onApplyPrice(keyword.trim(), pricePerG);
  }

  const nutrientInfo = keyword.trim() && window.NUTRIENT_DB ? window.NUTRIENT_DB.getNutrient(keyword.trim()) : null;

  return (
    <div className="panel ip-lookup-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">🌾 원료 시세 조회 · 동결건조 원가 계산기</div>
          <div className="panel-sub">농수산물 공공가격 API · 농촌진흥청 영양 DB 연동</div>
        </div>
      </div>

      {/* API 키 설정 — 서버에 AGRO_API_KEY 등록 시 입력 불필요 */}
      <div className="ip-apikey-row">
        <span className="ip-label ip-apikey-status">
          <span className="ip-key-dot"></span>서버 API 키 사용 중
        </span>
        <button
          className="ip-apikey-toggle"
          onClick={() => setShowApiKeyInput(v => !v)}
        >{showApiKeyInput ? "닫기" : "직접 키 입력 (선택)"}</button>
        {showApiKeyInput && (
          <>
            <input
              type="password"
              className="ip-input ip-input-key mono"
              placeholder="내 공공데이터포털 서비스키로 덮어쓰기 (선택)"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem("phytolab-agro-apikey", e.target.value); }}
            />
            <a href="https://www.data.go.kr/data/15100578/openapi.do" target="_blank" rel="noopener" className="ip-link">키 발급 →</a>
          </>
        )}
      </div>

      {/* 검색 입력 */}
      <div className="ip-search-row">
        <div className="ip-autocomplete-wrap">
          <input
            type="text"
            className="ip-input ip-input-kw"
            placeholder="원료명 입력 (예: 브로콜리, 케일, 당근)"
            value={keyword}
            onChange={handleKeywordChange}
            onFocus={() => suggestions.length && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          {showSug && (
            <div className="ip-suggestions">
              {suggestions.map((s, i) => (
                <div key={i} className="ip-sug-item" onMouseDown={() => selectSuggestion(s.name)}>
                  <span>{s.name}</span>
                  <span className="ip-sug-meta mono">수분 {s.moisture}g/100g</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <select className="ip-select" value={channel} onChange={e => setChannel(e.target.value)}>
          {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
        </select>

        <button className={`ip-btn ip-btn-primary ${loading ? "loading" : ""}`} onClick={handleSearch} disabled={loading}>
          {loading ? "조회 중…" : "시세 조회"}
        </button>
      </div>

      {error && <div className="ip-error">{error}</div>}

      {/* 영양 DB 매칭 결과 */}
      {nutrientInfo && (
        <div className="ip-nutrient-row">
          <span className="ip-nutrient-tag">📊 영양DB 매칭</span>
          <span className="ip-nutrient-name">{nutrientInfo.name}</span>
          <span className="ip-nutrient-item mono">수분 <b>{nutrientInfo.moisture}g</b>/100g</span>
          {nutrientInfo.energy != null && <span className="ip-nutrient-item mono">에너지 <b>{nutrientInfo.energy}kcal</b></span>}
          {nutrientInfo.protein != null && <span className="ip-nutrient-item mono">단백질 <b>{nutrientInfo.protein}g</b></span>}
        </div>
      )}

      {/* 조회 결과 */}
      {result && (
        <div className="ip-result">
          <div className="ip-result-summary">
            <div className="ip-result-kpi">
              <span className="ip-result-label">소매 평균 시세</span>
              <span className="ip-result-value mono">₩{result.avgPricePerKg.toLocaleString()}<small>/kg</small></span>
            </div>
            {result.avgPricePerGram && (
              <div className="ip-result-kpi ip-result-kpi-accent">
                <span className="ip-result-label">₩/g 환산</span>
                <span className="ip-result-value mono">₩{result.avgPricePerGram}<small>/g</small></span>
              </div>
            )}
            <div className="ip-result-kpi">
              <span className="ip-result-label">조회 건수</span>
              <span className="ip-result-value mono">{result.latestItems.length}건</span>
            </div>
            <div className="ip-result-kpi">
              <span className="ip-result-label">기간</span>
              <span className="ip-result-value mono">{result.start}~{result.end}</span>
            </div>
          </div>

          {/* 최신 시세 테이블 */}
          {result.latestItems.length > 0 && (
            <div className="ip-table-wrap">
              <div className="ip-table-header mono">
                <div>조사연월</div><div>유통구분</div><div>품목</div><div>등급</div><div>조사단위</div><div>1kg환산(₩)</div>
              </div>
              {result.latestItems.slice(0, 8).map((it, i) => (
                <div key={i} className="ip-table-row">
                  <div className="mono">{it.yearMonth}</div>
                  <div>{it.channelName}</div>
                  <div>{it.itemName}{it.varietyName ? ` (${it.varietyName})` : ""}</div>
                  <div>{it.gradeName}</div>
                  <div className="mono">{it.unitQty}{it.unit}</div>
                  <div className="mono ip-price-cell">₩{it.pricePerKg.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {result.latestItems.length === 0 && (
            <div className="ip-empty">해당 품목의 가격 데이터가 없습니다. 키워드를 달리 입력해보세요 (예: "깐마늘" → "마늘")</div>
          )}
        </div>
      )}

      {/* 동결건조 분말 원가 계산기 — 접이식 */}
      {result && result.avgPricePerKg > 0 && (
        <div className="fd-calc-section">
          <button className="fd-toggle" onClick={() => setShowFreezeDry(v => !v)}>
            🧊 동결건조 분말 원가 계산{showFreezeDry ? " ▲" : " ▼"}
          </button>
          {showFreezeDry && (
            <>
          <div className="fd-inputs">
            <label className="fd-label">
              <span>원물 투입량 (kg)</span>
              <input type="number" className="fd-input mono" min="1" max="10000" step="1"
                value={fdRawKg} onChange={e => setFdRawKg(+e.target.value)} />
            </label>
            <label className="fd-label">
              <span>수분 함량 (%)</span>
              <input type="number" className="fd-input mono" min="0" max="99.9" step="0.1"
                value={fdMoisture} onChange={e => setFdMoisture(+e.target.value)} />
              <span className="fd-hint">※ 영양DB 자동 조회</span>
            </label>
            <label className="fd-label">
              <span>추가 제조원가 (₩)</span>
              <input type="number" className="fd-input mono" min="0" step="1000"
                value={fdMfgCost} onChange={e => setFdMfgCost(+e.target.value)} />
            </label>
            <button className="ip-btn ip-btn-success" onClick={calcFreezeDry}>원가 계산</button>
          </div>

          {fdResult && (
            <div className="fd-result">
              <div className="fd-result-row"><span>1kg 원물 단가</span><span className="mono">₩{fdResult.rawUnitPrice.toLocaleString()} /kg</span></div>
              <div className="fd-result-row"><span>원물 {fdRawKg}kg 총 비용</span><span className="mono">₩{fdResult.totalRawCost.toLocaleString()}</span></div>
              <div className="fd-result-row"><span>수분 {fdMoisture}% → 고형분 {fdResult.solidPct.toFixed(1)}%</span><span className="mono">분말 {fdResult.powderYieldKg.toFixed(2)} kg</span></div>
              <div className="fd-result-row"><span>추가 제조원가</span><span className="mono">+ ₩{fdMfgCost.toLocaleString()}</span></div>
              <div className="fd-result-row fd-result-total">
                <span>총 생산 비용</span><span className="mono">₩{fdResult.totalCost.toLocaleString()}</span>
              </div>
              <div className="fd-result-final">
                <span>동결건조 분말 최종 원가</span>
                <div className="fd-result-prices">
                  <span className="fd-price-kg mono">₩{Math.round(fdResult.powderCostPerKg).toLocaleString()} <small>/kg</small></span>
                  <span className="fd-price-g mono">= ₩{fdResult.powderCostPerG.toFixed(2)} <small>/g</small></span>
                </div>
              </div>
              {onApplyPrice && (
                <button className="ip-btn ip-btn-apply" onClick={() => handleApply(fdResult.powderCostPerG)}>
                  ✅ "{keyword}" 자사단가로 적용 (₩{fdResult.powderCostPerG.toFixed(2)}/g)
                </button>
              )}
            </div>
          )}
            </>
          )}

          {/* 동결건조 미사용 시 원물 단가 직접 적용 */}
          {result.avgPricePerGram && !fdResult && onApplyPrice && (
            <button className="ip-btn ip-btn-apply-light" onClick={() => handleApply(result.avgPricePerGram)}>
              원물 단가 직접 적용 (₩{result.avgPricePerGram}/g)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   NaN-safe 포맷 헬퍼
───────────────────────────────────────────────────────── */
function fmtWon(v, opts) {
  return isFinite(v) ? v.toLocaleString(undefined, opts || { maximumFractionDigits: 0 }) : "계산 중";
}
function fmtFixed(v, d) {
  return isFinite(v) ? v.toFixed(d ?? 1) : "–";
}
function fmtWonFixed(v, d) {
  return isFinite(v) ? v.toFixed(d ?? 0) : "계산 중";
}

/* ─────────────────────────────────────────────────────────
   Step4Cost 메인 컴포넌트
───────────────────────────────────────────────────────── */
const Step4Cost = () => {
  const fPhyto = PHYTO_DATA.formula;
  const FALLBACK_COST = {
    packaging: { liquidPack: 240, outerBox: 620, shipperBox: 180, label: 120, sterilization: 480 },
    overhead:  { labor: 780, utility: 340, qa: 320, depreciation: 420, logistics: 380 },
    target:    { wholesaleMarkup: 1.7, retailMarkup: 2.3, msrp: 39000 },
  };
  const rawC = PHYTO_DATA.cost;
  const c = (rawC?.packaging && rawC?.overhead && rawC?.target) ? rawC : FALLBACK_COST;
  const ctx = window.useFormula ? window.useFormula() : null;
  const Reveal = window.RevealSection || (({ children }) => children);

  // 로컬 폴백 state
  const [localServings, setLocalServings] = useState(24);
  const [localYield, setLocalYield] = useState(93);
  const [localBatch, setLocalBatch] = useState(30000);
  const [localMsrp, setLocalMsrp] = useState(45000);
  const [localChannel, setLocalChannel] = useState("병원");
  const [localPriceMode, setLocalPriceMode] = useState("example");
  const [localCustomPrices, setLocalCustomPrices] = useState({});

  // 원료 시세 패널 열기/닫기 + 빠른 조회 원료명
  const [showPriceLookup, setShowPriceLookup] = useState(false);
  const [lookupIngredient, setLookupIngredient] = useState(null); // null = 수동 입력, string = 자동조회

  // 자동 시세 조회 결과 (예시단가 탭에 반영)
  const [autoFetchedPrices, setAutoFetchedPrices] = useState({}); // { [ing.id]: pricePerG }
  const [autoFetchStatus, setAutoFetchStatus] = useState({});    // { [ing.id]: "loading"|"ok"|"fail" }

  const servingsPerBox = ctx?.servings ?? localServings;
  const setServingsPerBox = ctx?.setServings || setLocalServings;
  const yieldOverall = ctx?.yieldOverall ?? localYield;
  const setYieldOverall = ctx?.setYieldOverall || setLocalYield;
  const batchSize = ctx?.batchSize ?? localBatch;
  const setBatchSize = ctx?.setBatchSize || setLocalBatch;
  const msrp = ctx?.msrp ?? localMsrp;
  const setMsrp = ctx?.setMsrp || setLocalMsrp;
  const channel = ctx?.channel ?? localChannel;
  const setChannel = ctx?.setChannel || setLocalChannel;

  // 원료 단가: 예시 단가(example) vs 기업이 직접 입력한 자사 단가(custom)
  const priceMode = ctx?.priceMode ?? localPriceMode;
  const setPriceMode = ctx?.setPriceMode || setLocalPriceMode;
  const customPrices = ctx?.customPrices ?? localCustomPrices;
  const updateCustomPrice = ctx?.updateCustomPrice || ((id, val) => setLocalCustomPrices(prev => {
    if (val === null || val === undefined || isNaN(val)) { const next = {...prev}; delete next[id]; return next; }
    return {...prev, [id]: Math.max(0, val)};
  }));
  // 예시 단가: autoFetchedPrices 우선, 없으면 ing.price(추정값) fallback
  // ※ ctx?.priceFor 는 autoFetchedPrices를 모르므로 항상 로컬 함수 사용
  const priceFor = (ing) => {
    if (priceMode === "custom" && customPrices[ing.id] != null) return customPrices[ing.id];
    if (priceMode === "example" && autoFetchedPrices[ing.id] != null) return autoFetchedPrices[ing.id];
    return ing.price;
  };

  // 원료 목록이 준비되면 자동 시세 조회 (예시단가 탭에 반영)
  const currentIngsForFetch = ctx?.ings || (fPhyto?.ingredients || []);

  const fetchKeyRef = React.useRef("");
  useEffect(() => {
    const ings = currentIngsForFetch.filter(x => x.id !== "wat");
    if (ings.length === 0) return;

    // 원료 구성이 바뀔 때만 재조회
    const key = ings.map(x => x.id).join(",");
    if (key === fetchKeyRef.current) return;
    fetchKeyRef.current = key;

    // 모든 원료를 순차 조회 (250ms 간격)
    ings.forEach((ing, i) => {
      setAutoFetchStatus(prev => ({ ...prev, [ing.id]: "loading" }));
      setTimeout(async () => {
        const baseName = ing.name.replace(/\s*[（(【\[].*/g, "").trim();
        try {
          const res = await fetch(`/api/ingredient-price?keyword=${encodeURIComponent(baseName)}`);
          const data = await res.json();
          if (data.ok && data.avgPricePerGram) {
            setAutoFetchedPrices(prev => ({ ...prev, [ing.id]: data.avgPricePerGram }));
            setAutoFetchStatus(prev => ({ ...prev, [ing.id]: "ok" }));
          } else {
            setAutoFetchStatus(prev => ({ ...prev, [ing.id]: "fail" }));
          }
        } catch {
          setAutoFetchStatus(prev => ({ ...prev, [ing.id]: "fail" }));
        }
      }, i * 300);
    });
  }); // 의존성 없음 — fetchKeyRef로 중복 방지

  // 원가 계산 — priceFor는 autoFetchedPrices 반영한 로컬 함수로 항상 직접 계산
  const currentIngs = ctx?.ings || fPhyto.ingredients;
  const ingCostPerPack = currentIngs.reduce((s, x) => s + x.amount * priceFor(x) / (x.yieldPct/100), 0);
  const rawPerBox = ingCostPerPack * servingsPerBox / (yieldOverall/100);
  const packPerBox = ctx?.packPerBox ?? (c.packaging.liquidPack * servingsPerBox + c.packaging.outerBox + c.packaging.shipperBox + c.packaging.label + c.packaging.sterilization);
  const ohPerBox = c.overhead.labor + c.overhead.utility + c.overhead.qa + c.overhead.depreciation + c.overhead.logistics;
  const ohAdjusted = ctx?.ohAdjusted ?? (ohPerBox * (30000 / Math.max(1, batchSize)) ** 0.15);
  const totalCost = ctx?.totalCost ?? (rawPerBox + packPerBox + ohAdjusted);
  const wholesale = totalCost * c.target.wholesaleMarkup;
  const marginPct = ctx?.marginPct ?? (((msrp - totalCost) / msrp) * 100);

  const f = fPhyto;

  // 인라인 토스트 상태
  const [applyToast, setApplyToast] = useState(null);
  function showToast(msg, isOk) {
    setApplyToast({ msg, isOk });
    setTimeout(() => setApplyToast(null), 3500);
  }

  // 원료 시세 조회 결과 → 자사단가 + 예시단가 동시 적용 핸들러
  function handleApplyIngredientPrice(keyword, pricePerG) {
    // 원료 이름으로 id 매칭 시도 (부분 일치)
    const kwLower = keyword.replace(/\s/g, "").toLowerCase();
    const ing = f.ingredients.find(x =>
      x.name.replace(/\s/g, "").toLowerCase().includes(kwLower) ||
      kwLower.includes(x.name.replace(/\s/g, "").toLowerCase())
    );
    if (ing) {
      // 예시단가 탭에도 API 조회가로 갱신 (🟢 표시)
      setAutoFetchedPrices(prev => ({ ...prev, [ing.id]: pricePerG }));
      setAutoFetchStatus(prev => ({ ...prev, [ing.id]: "ok" }));
      // 자사단가 탭으로 전환 + 적용
      setPriceMode("custom");
      updateCustomPrice(ing.id, pricePerG);
      setLookupIngredient(null); // 자동조회 키 초기화
      showToast(`✅ "${ing.name}" → ₩${pricePerG.toFixed(2)}/g 자사단가 적용`, true);
    } else {
      showToast(`"${keyword}"와 일치하는 배합 원료 없음 — 자사단가 탭에서 직접 수정`, false);
    }
  }

  // FSMP 채널 (병원·요양시설·급여 채널 반영)
  const channelFees = { "병원": 0.18, "요양시설": 0.15, "약국·H&B": 0.28, "온라인 D2C": 0.12, "홈쇼핑": 0.35 };
  const fee = channelFees[channel] || 0;
  const netRevenue = msrp * (1 - fee);
  const opProfit = netRevenue - totalCost;
  const opProfitPct = msrp > 0 ? (opProfit / msrp) * 100 : 0;

  const parts = [
    { label: "원료비",     value: isFinite(rawPerBox)   ? rawPerBox   : 0, color: "oklch(0.72 0.16 235)" },
    { label: "부자재·살균", value: isFinite(packPerBox)  ? packPerBox  : 0, color: "oklch(0.78 0.14 195)" },
    { label: "제조간접비", value: isFinite(ohAdjusted)  ? ohAdjusted  : 0, color: "oklch(0.7 0.16 275)" },
  ];
  const total = parts.reduce((s,x)=>s+x.value, 0);

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 04 · COST SIMULATOR</div>
          <h1 className="step-title">원가 · 판가 · 마진 시뮬레이션</h1>
          <div className="step-desc">배치 규모·수율·채널을 조정하며 실질 손익구조를 확인합니다</div>
        </div>
        <div className="step-badges">
          <div className="badge badge-accent"><span className="badge-k">MARGIN</span><span className="badge-v mono">{fmtFixed(marginPct, 1)}%</span></div>
          <div className="badge"><span className="badge-k">GM/박스</span><span className="badge-v mono">₩{fmtWon(msrp - totalCost)}</span></div>
        </div>
      </div>

      {applyToast && (
        <div className={`apply-toast ${applyToast.isOk ? "apply-toast-ok" : "apply-toast-warn"}`}>
          {applyToast.msg}
        </div>
      )}

      <Reveal id="pricing" label="목표 MSRP · 판가 포지셔닝" agent="mara">
      <div className="cost-kpi-row">
        <div className="ckpi">
          <div className="ckpi-label">박스당 총원가</div>
          <div className="ckpi-value mono">₩{fmtWon(totalCost)}</div>
          <div className="ckpi-sub mono">/ {servingsPerBox}팩 · ₩{fmtWonFixed(isFinite(totalCost) && servingsPerBox > 0 ? totalCost / servingsPerBox : NaN, 0)}/팩</div>
        </div>
        <div className="ckpi">
          <div className="ckpi-label">권장 도매가</div>
          <div className="ckpi-value mono">₩{fmtWon(wholesale)}</div>
          <div className="ckpi-sub">× {c.target.wholesaleMarkup} 마크업</div>
        </div>
        <div className="ckpi">
          <div className="ckpi-label">목표 MSRP</div>
          <div className="ckpi-value mono">₩{fmtWon(msrp)}</div>
          <div className="ckpi-sub">경쟁 밴드 3.8–5.4만원</div>
        </div>
        <div className="ckpi ckpi-primary">
          <div className="ckpi-label">영업이익률 <span className="mono">({channel})</span></div>
          <div className="ckpi-value mono">{fmtFixed(opProfitPct, 1)}%</div>
          <div className="ckpi-sub mono">순수익 ₩{fmtWon(opProfit)}/박스</div>
        </div>
      </div>
      </Reveal>

      <div className="cost-grid">
        <Reveal id="cost_breakdown" label="원가 구조" agent="finn">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">원가 구조</div>
              <div className="panel-sub">박스당 브레이크다운</div>
            </div>
          </div>

          <div className="donut-wrap">
            <svg viewBox="0 0 200 200" className="donut">
              {(() => {
                if (total <= 0) return (
                  <circle cx="100" cy="100" r="80" fill="none" strokeWidth="26"
                    stroke="oklch(0.3 0 0)" strokeDasharray="502.65 0" strokeDashoffset="0"
                    transform="rotate(-90 100 100)" />
                );
                let cum = 0;
                return parts.map((p, i) => {
                  const pct = p.value / total;
                  const dash = pct * 502.65;
                  const safeDash = isFinite(dash) ? dash : 0;
                  const el = (
                    <circle key={i} cx="100" cy="100" r="80"
                      fill="none" strokeWidth="26"
                      stroke={p.color}
                      strokeDasharray={`${safeDash} ${502.65 - safeDash}`}
                      strokeDashoffset={-cum}
                      transform="rotate(-90 100 100)"
                    />
                  );
                  cum += safeDash;
                  return el;
                });
              })()}
              <text x="100" y="94" textAnchor="middle" className="donut-num mono">₩{isFinite(total) ? Math.round(total).toLocaleString() : "–"}</text>
              <text x="100" y="112" textAnchor="middle" className="donut-sub mono">TOTAL / BOX</text>
            </svg>
            <div className="donut-legend">
              {parts.map((p,i) => (
                <div key={i} className="donut-item">
                  <span className="donut-dot" style={{background: p.color}}></span>
                  <div className="donut-item-body">
                    <div className="donut-item-label">{p.label}</div>
                    <div className="donut-item-value mono">₩{fmtWon(p.value)} <span className="donut-pct">({fmtFixed(total > 0 ? p.value / total * 100 : NaN, 1)}%)</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sim-controls">
            <SimSlider label="박스 수량 (팩)" value={servingsPerBox} min={6} max={60} step={6} onChange={setServingsPerBox} unit="팩" />
            <SimSlider label="전체 공정수율" value={yieldOverall} min={85} max={98} step={1} onChange={setYieldOverall} unit="%" />
            <SimSlider label="배치 규모 (박스)" value={batchSize} min={3000} max={150000} step={3000} onChange={setBatchSize} format={v => v.toLocaleString()} unit="박스" />
            <SimSlider label="MSRP" value={msrp} min={28000} max={72000} step={1000} onChange={setMsrp} format={v => "₩" + v.toLocaleString()} />
          </div>
        </div>
        </Reveal>

        <div className="right-col">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  원료비 상세 · 박스당
                  <window.SourceTag id={priceMode === "custom" ? "user_input_required" : "agent_estimate"} label={priceMode === "custom" ? "자사단가" : "예시단가"} />
                </div>
                <div className="panel-sub mono">{servingsPerBox}팩/박스 · 수율반영</div>
              </div>
              <div className="mono panel-tot">₩{fmtWon(rawPerBox)}</div>
            </div>

            <div className="price-mode-tabs">
              <button className={`pm-tab ${priceMode === "example" ? "active" : ""}`} onClick={() => setPriceMode("example")}>
                예시 단가 <span className="pm-tab-sub mono">(벤치마크 참고용)</span>
              </button>
              <button className={`pm-tab ${priceMode === "custom" ? "active" : ""}`} onClick={() => setPriceMode("custom")}>
                자사 단가 입력 <span className="pm-tab-sub mono">(실공급단가)</span>
              </button>
            </div>
            {priceMode === "example" && (
              <div className="pm-note">
                공공가격 API 시세가 <b>자동 반영</b>됩니다. 🟢 조회 완료 · ⚠️ 미매칭(추정값).
                🔍 버튼으로 개별 재조회 후 <b>자사단가</b>로 적용할 수 있습니다.
              </div>
            )}
            {priceMode === "custom" && (
              <div className="pm-note">
                실제 공급업체 계약단가를 아래에 직접 입력하세요. 비워두면 예시 단가가 참고치로 사용됩니다.
                상단 <b>🌾 원료 시세 조회</b> 버튼으로 공공가격 API에서 시세를 조회해 자동 적용할 수 있습니다.
              </div>
            )}

            <div className={`raw-table ${priceMode === "custom" ? "raw-table-editable" : ""}`}>
              <div className="rt-header mono" style={{gridTemplateColumns: priceMode==="example" ? "2fr 0.7fr 0.9fr 0.8fr 0.6fr 0.9fr 28px" : "2fr 0.7fr 0.9fr 0.8fr 0.6fr 0.9fr"}}>
                <div>원료</div>
                <div>1팩 (g)</div>
                <div>박스 (g)</div>
                <div>단가 (₩/g)</div>
                <div>수율</div>
                <div>박스당</div>
                {priceMode === "example" && <div></div>}
              </div>
              {f.ingredients.filter(x => x.id !== "wat").map(ing => {
                const perBox = ing.amount * servingsPerBox;
                const price = priceFor(ing);
                const boxCost = perBox * price / (ing.yieldPct/100);
                const isCustomFilled = priceMode === "custom" && customPrices[ing.id] != null;
                // 예시 단가 탭에서 시세조회 버튼 클릭 핸들러
                const handleQuickLookup = () => {
                  // 원료 기본명 추출 (괄호 앞 한글명)
                  const baseName = ing.name.replace(/\s*[（(].*/g, "").trim();
                  setLookupIngredient(baseName);
                  setShowPriceLookup(true);
                };
                return (
                  <div key={ing.id} className={`rt-row ${priceMode === "custom" && !isCustomFilled ? "rt-row-unfilled" : ""}`}
                       style={{gridTemplateColumns: priceMode==="example" ? "2fr 0.7fr 0.9fr 0.8fr 0.6fr 0.9fr 28px" : "2fr 0.7fr 0.9fr 0.8fr 0.6fr 0.9fr"}}>
                    <div className="rt-name">{ing.name}</div>
                    <div className="mono">{ing.amount}</div>
                    <div className="mono">{perBox.toFixed(1)}</div>
                    <div className="mono">
                      {priceMode === "custom" ? (
                        <input
                          type="number" step="0.1" min="0"
                          className="rt-price-input mono"
                          placeholder={ing.price.toFixed(1)}
                          value={customPrices[ing.id] ?? ""}
                          onChange={(e) => updateCustomPrice(ing.id, e.target.value === "" ? null : +e.target.value)}
                        />
                      ) : (
                        <span>
                          {autoFetchStatus[ing.id] === "loading"
                            ? <span className="af-loading">…</span>
                            : price.toFixed(1)
                          }
                          {autoFetchStatus[ing.id] === "ok"
                            ? <span className="af-badge af-ok" title="공공가격 API 시세">🟢</span>
                            : autoFetchStatus[ing.id] === "fail"
                              ? <span className="af-badge af-fail" title="API 조회 실패 · 추정값">⚠️</span>
                              : null
                          }
                        </span>
                      )}
                    </div>
                    <div className="mono">{ing.yieldPct}%</div>
                    <div className="mono rt-cost">₩{fmtWon(boxCost)}</div>
                    {priceMode === "example" && (
                      <button className="rt-lookup-btn" title={`"${ing.name}" 시세 조회`} onClick={handleQuickLookup}>🔍</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 원료 시세 조회 패널 — 원료비 상세 바로 아래 */}
          <div className="price-lookup-inline">
            <button
              className="pli-toggle"
              onClick={() => { setShowPriceLookup(v => !v); if (showPriceLookup) setLookupIngredient(null); }}
            >
              <span>🌾 원료 시세 조회 · 동결건조 원가 계산기</span>
              <span className="pli-chevron">{showPriceLookup ? "▲" : "▼"}</span>
            </button>
            {showPriceLookup && (
              <IngredientPriceLookup
                onApplyPrice={handleApplyIngredientPrice}
                initialKeyword={lookupIngredient || ""}
                autoSearch={!!lookupIngredient}
              />
            )}
          </div>

          <Reveal id="channel" label="채널별 손익 시뮬레이션" agent="finn">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">채널별 손익 시뮬</div>
                <div className="panel-sub">병원·요양시설 낮은 수수료</div>
              </div>
            </div>
            <div className="channel-pills">
              {Object.keys(channelFees).map(k => (
                <button key={k} className={`ch-pill ${channel === k ? "active" : ""}`} onClick={() => setChannel(k)}>
                  <span>{k}</span>
                  <span className="mono ch-fee">{(channelFees[k]*100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
            <ChannelBar msrp={msrp} fee={fee} cost={totalCost} />
            <div className="ch-summary">
              <div className="chs-row">
                <span>소비자가 (MSRP)</span>
                <span className="mono">₩{fmtWon(msrp)}</span>
              </div>
              <div className="chs-row minus">
                <span>채널 수수료 · {channel} <span className="mono">({fmtFixed(fee * 100, 0)}%)</span></span>
                <span className="mono">− ₩{fmtWon(msrp * fee)}</span>
              </div>
              <div className="chs-row minus">
                <span>제조 원가</span>
                <span className="mono">− ₩{fmtWon(totalCost)}</span>
              </div>
              <div className="chs-row total">
                <span>영업이익 <span className="chs-sub mono">({fmtFixed(opProfitPct, 1)}%)</span></span>
                <span className={`mono ${isFinite(opProfit) && opProfit > 0 ? "up" : "down"}`}>₩{fmtWon(opProfit)}</span>
              </div>
            </div>
          </div>
          </Reveal>

          <Reveal id="annual" label="연간 손익 예측" agent="finn">
          <div className="panel scenario-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">연간 손익 예측</div>
                <div className="panel-sub mono">연 {(batchSize*12).toLocaleString()}박스 가정</div>
              </div>
            </div>
            <div className="annual">
              <div className="annual-item">
                <div className="annual-label">연 매출</div>
                <div className="annual-val mono">₩{fmtFixed(batchSize * 12 * msrp / 1e8, 1)}<span className="annual-unit">억</span></div>
              </div>
              <div className="annual-item">
                <div className="annual-label">연 매출원가</div>
                <div className="annual-val mono">₩{fmtFixed(batchSize * 12 * totalCost / 1e8, 1)}<span className="annual-unit">억</span></div>
              </div>
              <div className="annual-item annual-item-primary">
                <div className="annual-label">연 영업이익</div>
                <div className="annual-val mono">₩{fmtFixed(batchSize * 12 * opProfit / 1e8, 1)}<span className="annual-unit">억</span></div>
              </div>
            </div>
          </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

function SimSlider({ label, value, min, max, step, onChange, unit, format }) {
  const display = format ? format(value) : `${value}${unit || ""}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="sim-row">
      <div className="sim-head">
        <span className="sim-label">{label}</span>
        <span className="mono sim-value">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(+e.target.value)}
             className="sim-slider"
             style={{"--pct": `${pct}%`}} />
      <div className="sim-range mono"><span>{format ? format(min) : min}</span><span>{format ? format(max) : max}</span></div>
    </div>
  );
}

function ChannelBar({ msrp, fee, cost }) {
  const feeAmt = msrp * fee;
  const feePct = (feeAmt / msrp) * 100;
  const costPct = (cost / msrp) * 100;
  const profitPct = Math.max(0, 100 - feePct - costPct);

  return (
    <div className="channel-bar-wrap">
      <div className="channel-bar">
        <div className="cb-seg cb-cost" style={{width: `${costPct}%`}}><span className="mono">{costPct.toFixed(0)}%</span></div>
        <div className="cb-seg cb-fee" style={{width: `${feePct}%`}}><span className="mono">{feePct.toFixed(0)}%</span></div>
        <div className={`cb-seg cb-profit ${profitPct < 0 ? "loss" : ""}`} style={{width: `${profitPct}%`}}><span className="mono">{profitPct.toFixed(0)}%</span></div>
      </div>
      <div className="channel-bar-legend mono">
        <span><span className="cb-dot cb-cost"></span>원가</span>
        <span><span className="cb-dot cb-fee"></span>수수료</span>
        <span><span className="cb-dot cb-profit"></span>영업이익</span>
      </div>
    </div>
  );
}

window.Step4Cost = Step4Cost;
