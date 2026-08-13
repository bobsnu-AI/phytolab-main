// Step 4: Cost Simulator — FSMP 액상 원가·판가·마진 시뮬레이터 (LIVE with FormulaContext)
const Step4Cost = () => {
  const fPhyto = PHYTO_DATA.formula;
  const c = PHYTO_DATA.cost;
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
  const priceFor = ctx?.priceFor || ((ing) => (priceMode === "custom" && customPrices[ing.id] != null) ? customPrices[ing.id] : ing.price);

  // Context에서 원가 계산치 우선 사용 (단, priceMode가 로컬 폴백일 때는 재계산 필요하므로 ctx 없을 때만 ctx 값 사용)
  const currentIngs = ctx?.ings || fPhyto.ingredients;
  const ingCostPerPack = ctx?.ingCostPerPack ?? currentIngs.reduce((s, x) => s + x.amount * priceFor(x) / (x.yieldPct/100), 0);
  const rawPerBox = ctx?.rawPerBox ?? (ingCostPerPack * servingsPerBox / (yieldOverall/100));
  const packPerBox = ctx?.packPerBox ?? (c.packaging.liquidPack * servingsPerBox + c.packaging.outerBox + c.packaging.shipperBox + c.packaging.label + c.packaging.sterilization);
  const ohPerBox = c.overhead.labor + c.overhead.utility + c.overhead.qa + c.overhead.depreciation + c.overhead.logistics;
  const ohAdjusted = ctx?.ohAdjusted ?? (ohPerBox * (30000 / batchSize) ** 0.15);
  const totalCost = ctx?.totalCost ?? (rawPerBox + packPerBox + ohAdjusted);
  const wholesale = totalCost * c.target.wholesaleMarkup;
  const marginPct = ctx?.marginPct ?? (((msrp - totalCost) / msrp) * 100);

  // Step 5에서 f 참조를 formula로 rename
  const f = fPhyto;

  // FSMP 채널 (병원·요양시설·급여 채널 반영)
  const channelFees = { "병원": 0.18, "요양시설": 0.15, "약국·H&B": 0.28, "온라인 D2C": 0.12, "홈쇼핑": 0.35 };
  const fee = channelFees[channel] || 0;
  const netRevenue = msrp * (1 - fee);
  const opProfit = netRevenue - totalCost;
  const opProfitPct = (opProfit / msrp) * 100;

  const parts = [
    { label: "원료비", value: rawPerBox, color: "oklch(0.72 0.16 235)" },
    { label: "부자재·살균", value: packPerBox, color: "oklch(0.78 0.14 195)" },
    { label: "제조간접비", value: ohAdjusted, color: "oklch(0.7 0.16 275)" },
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
          <div className="badge badge-accent"><span className="badge-k">MARGIN</span><span className="badge-v mono">{marginPct.toFixed(1)}%</span></div>
          <div className="badge"><span className="badge-k">GM/박스</span><span className="badge-v mono">₩{(msrp - totalCost).toLocaleString(undefined, {maximumFractionDigits:0})}</span></div>
        </div>
      </div>

      <Reveal id="pricing" label="목표 MSRP · 판가 포지셔닝" agent="mara">
      <div className="cost-kpi-row">
        <div className="ckpi">
          <div className="ckpi-label">박스당 총원가</div>
          <div className="ckpi-value mono">₩{totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
          <div className="ckpi-sub mono">/ {servingsPerBox}팩 · ₩{(totalCost/servingsPerBox).toFixed(0)}/팩</div>
        </div>
        <div className="ckpi">
          <div className="ckpi-label">권장 도매가</div>
          <div className="ckpi-value mono">₩{wholesale.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
          <div className="ckpi-sub">× {c.target.wholesaleMarkup} 마크업</div>
        </div>
        <div className="ckpi">
          <div className="ckpi-label">목표 MSRP</div>
          <div className="ckpi-value mono">₩{msrp.toLocaleString()}</div>
          <div className="ckpi-sub">경쟁 밴드 3.8–5.4만원</div>
        </div>
        <div className="ckpi ckpi-primary">
          <div className="ckpi-label">영업이익률 <span className="mono">({channel})</span></div>
          <div className="ckpi-value mono">{opProfitPct.toFixed(1)}%</div>
          <div className="ckpi-sub mono">순수익 ₩{opProfit.toLocaleString(undefined, {maximumFractionDigits:0})}/박스</div>
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
                let cum = 0;
                return parts.map((p, i) => {
                  const pct = p.value/total;
                  const dash = pct * 502.65;
                  const el = (
                    <circle key={i} cx="100" cy="100" r="80"
                      fill="none" strokeWidth="26"
                      stroke={p.color}
                      strokeDasharray={`${dash} ${502.65 - dash}`}
                      strokeDashoffset={-cum}
                      transform="rotate(-90 100 100)"
                    />
                  );
                  cum += dash;
                  return el;
                });
              })()}
              <text x="100" y="94" textAnchor="middle" className="donut-num mono">₩{Math.round(total).toLocaleString()}</text>
              <text x="100" y="112" textAnchor="middle" className="donut-sub mono">TOTAL / BOX</text>
            </svg>
            <div className="donut-legend">
              {parts.map((p,i) => (
                <div key={i} className="donut-item">
                  <span className="donut-dot" style={{background: p.color}}></span>
                  <div className="donut-item-body">
                    <div className="donut-item-label">{p.label}</div>
                    <div className="donut-item-value mono">₩{p.value.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="donut-pct">({(p.value/total*100).toFixed(1)}%)</span></div>
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
              <div className="mono panel-tot">₩{rawPerBox.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>

            <div className="price-mode-tabs">
              <button className={`pm-tab ${priceMode === "example" ? "active" : ""}`} onClick={() => setPriceMode("example")}>
                예시 단가 <span className="pm-tab-sub mono">(벤치마크 참고용)</span>
              </button>
              <button className={`pm-tab ${priceMode === "custom" ? "active" : ""}`} onClick={() => setPriceMode("custom")}>
                자사 단가 입력 <span className="pm-tab-sub mono">(실공급단가)</span>
              </button>
            </div>
            {priceMode === "custom" && (
              <div className="pm-note">
                실제 공급업체 계약단가를 아래에 직접 입력하세요. 비워두면 예시 단가가 참고치로 사용됩니다. 입력값은 이 브라우저 세션에만 저장되며 외부로 전송되지 않습니다.
              </div>
            )}

            <div className={`raw-table ${priceMode === "custom" ? "raw-table-editable" : ""}`}>
              <div className="rt-header mono">
                <div>원료</div>
                <div>1팩 (g)</div>
                <div>박스 (g)</div>
                <div>단가 (₩/g)</div>
                <div>수율</div>
                <div>박스당</div>
              </div>
              {f.ingredients.filter(x => x.id !== "wat").map(ing => {
                const perBox = ing.amount * servingsPerBox;
                const price = priceFor(ing);
                const boxCost = perBox * price / (ing.yieldPct/100);
                const isCustomFilled = priceMode === "custom" && customPrices[ing.id] != null;
                return (
                  <div key={ing.id} className={`rt-row ${priceMode === "custom" && !isCustomFilled ? "rt-row-unfilled" : ""}`}>
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
                      ) : price.toFixed(1)}
                    </div>
                    <div className="mono">{ing.yieldPct}%</div>
                    <div className="mono rt-cost">₩{boxCost.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
                );
              })}
            </div>
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
                <span className="mono">₩{msrp.toLocaleString()}</span>
              </div>
              <div className="chs-row minus">
                <span>채널 수수료 · {channel} <span className="mono">({(fee*100).toFixed(0)}%)</span></span>
                <span className="mono">− ₩{(msrp*fee).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div className="chs-row minus">
                <span>제조 원가</span>
                <span className="mono">− ₩{totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div className="chs-row total">
                <span>영업이익 <span className="chs-sub mono">({opProfitPct.toFixed(1)}%)</span></span>
                <span className={`mono ${opProfit > 0 ? "up" : "down"}`}>₩{opProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
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
                <div className="annual-val mono">₩{(batchSize*12*msrp/1e8).toFixed(1)}<span className="annual-unit">억</span></div>
              </div>
              <div className="annual-item">
                <div className="annual-label">연 매출원가</div>
                <div className="annual-val mono">₩{(batchSize*12*totalCost/1e8).toFixed(1)}<span className="annual-unit">억</span></div>
              </div>
              <div className="annual-item annual-item-primary">
                <div className="annual-label">연 영업이익</div>
                <div className="annual-val mono">₩{(batchSize*12*opProfit/1e8).toFixed(1)}<span className="annual-unit">억</span></div>
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
