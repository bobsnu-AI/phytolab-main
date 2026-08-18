// Step 3: Formulation — FSMP 배합설계 + 영양기준 준수 검증 (LIVE with FormulaContext)

// 원료 id/role 기반 범용 가중합 계산 — EffBar·SensoryRadar 공통 사용
// parts: [{ id?: string, ids?: string[], role?: string, divisor: number, weight: number }]
function sumParts(ings, parts) {
  return parts.reduce((sum, p) => {
    let base;
    if (p.role) base = ings.filter(x => x.role === p.role).reduce((s, x) => s + x.amount, 0);
    else if (p.ids) base = p.ids.reduce((s, id) => s + (ings.find(x => x.id === id)?.amount || 0), 0);
    else base = ings.find(x => x.id === p.id)?.amount || 0;
    return sum + (base / p.divisor) * p.weight;
  }, 0);
}

const Step3Formula = () => {
  const initial = PHYTO_DATA.formula;
  const f = window.useFormula ? window.useFormula() : null;
  const Reveal = window.RevealSection || (({ children }) => children);

  // FormulaContext 사용, 없으면 로컬 state 폴백
  const [localIngs, setLocalIngs] = useState(
    window.normalizeIngs ? window.normalizeIngs(initial.ingredients) : initial.ingredients
  );
  const [localFlavor, setLocalFlavor] = useState(
    (initial.flavors && initial.flavors[0]) || "바닐라"
  );
  const [localFormat, setLocalFormat] = useState(
    (initial.formats && initial.formats[0]) || "액상팩 200ml"
  );
  const [localServings, setLocalServings] = useState(initial.servingsPerBox || 24);

  const ings = f?.ings || localIngs;
  const flavor = f?.flavor ?? localFlavor;
  const setFlavor = f?.setFlavor || setLocalFlavor;
  const format = f?.format ?? localFormat;
  const setFormat = f?.setFormat || setLocalFormat;
  const servings = f?.servings ?? localServings;
  const setServings = f?.setServings || setLocalServings;
  const highlight = f?.highlight;

  const updateAmount = (id, val) => {
    if (f) f.updateAmount(id, val);
    else setLocalIngs(prev => prev.map(x => x.id === id ? {...x, amount: Math.max(0, val)} : x));
  };
  const resetIngs = () => {
    if (f) f.resetIngs();
    else setLocalIngs(initial.ingredients);
  };

  // 파생 계산 (Context에서 이미 계산된 값 우선)
  const waterAmount = f?.waterAmount ?? Math.max(0, 200 - ings.filter(x => x.id !== "wat").reduce((s,x) => s + x.amount, 0));
  const nonWater = f?.nonWater ?? ings.filter(x => x.id !== "wat").reduce((s,x) => s + x.amount, 0);
  const totalTarget = 200;
  const carb = f?.carb ?? ings.filter(x => x.role === "탄수").reduce((s,x) => s + x.amount, 0);
  const protein = f?.protein ?? ings.filter(x => x.role === "단백").reduce((s,x) => s + x.amount, 0);
  const fat = f?.fat ?? ings.filter(x => x.role === "지방").reduce((s,x) => s + x.amount, 0);
  const kcal = f?.kcal ?? (carb*4 + protein*4 + fat*9);
  const carbPct = f?.carbPct ?? (kcal > 0 ? (carb*4/kcal)*100 : 0);
  const proteinPct = f?.proteinPct ?? (kcal > 0 ? (protein*4/kcal)*100 : 0);
  const fatPct = f?.fatPct ?? (kcal > 0 ? (fat*9/kcal)*100 : 0);
  const costPerPack = f?.ingCostPerPack ?? ings.reduce((s, x) => {
    const active = x.id === "wat" ? waterAmount : x.amount;
    return s + active * x.price / (x.yieldPct/100);
  }, 0);
  const estimatedGi = f?.estimatedGi ?? (
    carb > 0
      ? Math.round(initial.giBaseline - ((ings.find(x => x.id === initial.giIngredientId)?.amount || 0) / Math.max(1, carb)) * initial.giWeight)
      : (initial.giBaseline ?? 75)
  );

  const formats = initial.formats;

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 03 · FORMULATION</div>
          <h1 className="step-title">배합 설계 · {PHYTO_DATA.product?.regClass || "FSMP"} 영양기준 검증</h1>
          <div className="step-desc">{PHYTO_DATA.product?.target ? `${PHYTO_DATA.product.target} 맞춤 ` : ""}원료·용량·제형을 조정하면 표준제조기준 준수도를 실시간 검증합니다</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">TOTAL</span><span className="badge-v mono">{(nonWater + waterAmount).toFixed(1)} g/팩</span></div>
          <div className="badge"><span className="badge-k">KCAL</span><span className="badge-v mono">{kcal.toFixed(0)} kcal</span></div>
          <div className="badge"><span className="badge-k">COST/팩</span><span className="badge-v mono">₩{costPerPack.toFixed(1)}</span></div>
        </div>
      </div>

      <div className="formula-topbar">
        <div className="ff-group">
          <div className="ff-label mono">제형 FORMAT</div>
          <div className="ff-pills">
            {formats.map(f => (
              <button key={f} className={`ff-pill ${format === f ? "active" : ""}`} onClick={() => setFormat(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="ff-group">
          <div className="ff-label mono">향미 FLAVOR</div>
          <div className="ff-pills">
            {initial.flavors.map(f => (
              <button key={f} className={`ff-pill ${flavor === f ? "active" : ""}`} onClick={() => setFlavor(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="ff-group">
          <div className="ff-label mono">1박스 수량</div>
          <div className="ff-count">
            <button onClick={() => setServings(Math.max(6, servings-6))}>−</button>
            <span className="mono">{servings}</span>
            <span className="ff-count-unit">팩</span>
            <button onClick={() => setServings(Math.min(60, servings+6))}>+</button>
          </div>
        </div>
      </div>

      {/* 영양기준 준수 상단 스트립 — 카테고리/reg별 동적 기준 */}
      {(() => {
        const reg = PHYTO_DATA.product?.regClass || PHYTO_DATA.product?.reg || "";
        const cat = PHYTO_DATA.product?.category || "";
        // reg/category에 따른 기준 분기
        const isFsmp = /FSMP|fsmp|특수의료용도/i.test(reg + cat);
        const isSenior = /senior|고령|seniorks/i.test(reg + cat);
        const isHfunc = /hfunc|건강기능|기능성/i.test(reg + cat);

        let headerLabel, compCells;
        if (isFsmp) {
          headerLabel = "FSMP 표준제조기준 준수도";
          compCells = (<>
            <ComplianceCell label="열량 200±20 kcal" value={kcal} min={180} max={220} unit="kcal" />
            <ComplianceCell label="탄수 45–50%en" value={carbPct} min={45} max={50} unit="%en" />
            <ComplianceCell label="단백 18–22%en" value={proteinPct} min={18} max={22} unit="%en" />
            <ComplianceCell label="지방 30–38%en" value={fatPct} min={30} max={38} unit="%en" />
            <ComplianceCell label="GI ≤ 55 (저GI)" value={estimatedGi} min={0} max={55} unit="GI" inverse />
          </>);
        } else if (isSenior) {
          headerLabel = "고령친화식품 기준 준수도";
          compCells = (<>
            <ComplianceCell label="열량 ≥100 kcal/100g" value={kcal} min={100} max={400} unit="kcal" />
            <ComplianceCell label="단백 ≥10%en" value={proteinPct} min={10} max={40} unit="%en" />
            <ComplianceCell label="지방 ≤35%en" value={fatPct} min={0} max={35} unit="%en" inverse />
            <ComplianceCell label="나트륨 ≤300mg" value={PHYTO_DATA.target?.nutritionTarget?.sodium?.value ?? 150} min={0} max={300} unit="mg" inverse />
            <ComplianceCell label="GI ≤ 65" value={estimatedGi} min={0} max={65} unit="GI" inverse />
          </>);
        } else if (isHfunc) {
          headerLabel = "건강기능식품 기준 준수도";
          compCells = (<>
            <ComplianceCell label="열량 적정" value={kcal} min={50} max={500} unit="kcal" />
            <ComplianceCell label="단백 10–30%en" value={proteinPct} min={10} max={30} unit="%en" />
            <ComplianceCell label="지방 ≤40%en" value={fatPct} min={0} max={40} unit="%en" inverse />
            <ComplianceCell label="탄수 30–60%en" value={carbPct} min={30} max={60} unit="%en" />
            <ComplianceCell label="GI ≤ 60" value={estimatedGi} min={0} max={60} unit="GI" inverse />
          </>);
        } else {
          // 일반 식품/라벨 제품 — 광범위 기준
          headerLabel = "영양기준 준수도";
          compCells = (<>
            <ComplianceCell label="열량 100–500 kcal" value={kcal} min={100} max={500} unit="kcal" />
            <ComplianceCell label="탄수 40–65%en" value={carbPct} min={40} max={65} unit="%en" />
            <ComplianceCell label="단백 10–35%en" value={proteinPct} min={10} max={35} unit="%en" />
            <ComplianceCell label="지방 ≤40%en" value={fatPct} min={0} max={40} unit="%en" inverse />
            <ComplianceCell label="GI" value={estimatedGi} min={0} max={100} unit="GI" inverse />
          </>);
        }
        return (
          <Reveal id="compliance" label="표준제조기준 준수도" agent="rega">
          <div className="compliance-strip">
            <div className="cp-header mono">{headerLabel} · REALTIME</div>
            <div className="cp-grid">
              {compCells}
            </div>
          </div>
          </Reveal>
        );
      })()}

      <div className="formula-grid">
        <Reveal id="formula_table" label="배합표" agent="rena">
        <div className="panel formula-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">원료 배합표 · per pack (200ml)</div>
              <div className="panel-sub"><span className="mono">200g</span> · 정제수 자동</div>
            </div>
            <button className="btn-ghost" onClick={resetIngs}>초기값 복원 ↺</button>
          </div>
          <div className="ing-headers mono">
            <div>원료</div>
            <div>역할</div>
            <div className="ih-amount">투입량 (g)</div>
            <div>수율</div>
          </div>
          {ings.map(ing => {
            const isCarrier = ing.id === "wat";
            const amt = isCarrier ? waterAmount : ing.amount;
            const maxAmt = isCarrier ? 180 :
              ing.id === "iso" ? 40 :
              ing.id === "wpi" ? 20 :
              ing.id === "mufa" ? 15 :
              ing.role === "미량" ? 3 :
              ing.role === "관능" ? 2 :
              ing.role === "감미" ? 1 : 20;
            const step = amt < 1 ? 0.05 : amt < 5 ? 0.1 : 0.5;
            return (
              <div key={ing.id} className={`ing-slider-row ${isCarrier ? "carrier" : ""} ${highlight === ing.id ? "highlighted" : ""}`}>
                <div className="ing-slider-name">
                  <div className="ing-dot" style={{background: roleColor(ing.role)}}></div>
                  <div>
                    <div>{ing.name}</div>
                    <div className="ing-meta mono">MOQ {ing.moq}kg · ₩{ing.price}/g</div>
                  </div>
                </div>
                <div className="ing-role">
                  <span className={`role-tag role-${ing.role}`}>{ing.role}</span>
                </div>
                <div className="ing-slider-wrap">
                  {!isCarrier ? (
                    <>
                      <input type="range" min="0" max={maxAmt} step={step} value={ing.amount}
                             onChange={(e) => updateAmount(ing.id, +e.target.value)}
                             className="ing-slider" />
                      <input type="number" value={ing.amount} step={step}
                             onChange={(e) => updateAmount(ing.id, +e.target.value)}
                             className="ing-input mono" />
                    </>
                  ) : (
                    <div className="carrier-auto">
                      <div className="carrier-bar">
                        <div className="carrier-fill" style={{width: `${(waterAmount/180)*100}%`}}></div>
                      </div>
                      <span className="mono">{waterAmount.toFixed(1)}</span>
                      <span className="carrier-note mono">AUTO</span>
                    </div>
                  )}
                </div>
                <div className="mono ing-yield">{ing.yieldPct}%</div>
              </div>
            );
          })}
          <div className="ing-total">
            <span className="mono">TOTAL</span>
            <span className="mono">{(nonWater + waterAmount).toFixed(1)} g</span>
            <span className="mono ing-total-check">{Math.abs((nonWater + waterAmount) - totalTarget) < 0.1 ? "✓ 200g OK" : "△ 조정 중"}</span>
          </div>
        </div>
        </Reveal>

        <div className="formula-preview">
          <div className="panel product-preview">
            <div className="panel-header">
              <div>
                <div className="panel-title">제품 프리뷰</div>
                <div className="panel-sub mono">{initial.servingSize}ml × {servings}팩/박스</div>
              </div>
            </div>
            <div className="product-mock">
              <div className="pouch">
                <div className="pouch-top">
                  <div className="pouch-brand">{PHYTO_DATA.product?.codename || "PHYTO-X"}</div>
                  <div className="pouch-cat mono">{PHYTO_DATA.product?.category || "FSMP"} · {(PHYTO_DATA.product?.target || "CUSTOM").slice(0, 8)}</div>
                </div>
                <div className="pouch-mid">
                  <div className="pouch-flavor">{flavor}</div>
                  <div className="pouch-format mono">{format}</div>
                </div>
                <div className="pouch-nutri">
                  <div className="pn-row"><span>kcal</span><span className="mono">{kcal.toFixed(0)}</span></div>
                  <div className="pn-row"><span>탄수</span><span className="mono">{carb.toFixed(1)}g</span></div>
                  <div className="pn-row"><span>단백</span><span className="mono">{protein.toFixed(1)}g</span></div>
                  <div className="pn-row"><span>지방</span><span className="mono">{fat.toFixed(1)}g</span></div>
                  <div className="pn-row"><span>GI</span><span className="mono">≈{estimatedGi}</span></div>
                </div>
                <div className="pouch-bottom mono">200 ml · 1회분 · KDA 권고</div>
              </div>
            </div>
          </div>

          <Reveal id="efficacy" label="임상 근거" agent="clio">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">기능성 · 임상 근거</div>
                <div className="panel-sub">1식 섭취량 기준</div>
              </div>
            </div>
            <div className="efficacy-bars">
              {initial.efficacyClaims.map((claim, i) => (
                <EffBar key={i} label={claim.label}
                  value={Math.min(100, sumParts(ings, claim.parts))}
                  target={claim.target} />
              ))}
            </div>
          </div>
          </Reveal>

          <Reveal id="sensory" label="관능 프로파일" agent="rena">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">관능 프로파일 예측 <window.SourceTag id="rule_based_model" label="AI 아님" /></div>
                <div className="panel-sub mono">규칙 기반 근사식 · 실제 관능평가 패널 데이터 아님</div>
              </div>
            </div>
            <SensoryRadar ings={ings} flavor={flavor} sensoryAxes={initial.sensoryAxes} />
          </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

function ComplianceCell({ label, value, min, max, unit, inverse }) {
  const pass = inverse ? value <= max : (value >= min && value <= max);
  const nearMiss = !pass && (inverse ? value <= max*1.1 : (value >= min*0.9 && value <= max*1.1));
  const status = pass ? "pass" : nearMiss ? "warn" : "fail";
  const pct = Math.min(100, Math.max(0, inverse ? (1 - value/max)*100 : ((value - min)/(max - min))*100));

  return (
    <div className={`cp-cell cp-${status}`}>
      <div className="cp-label">{label}</div>
      <div className="cp-value">
        <span className="mono cp-num">{typeof value === "number" ? value.toFixed(value < 10 && value % 1 !== 0 ? 1 : 0) : value}</span>
        <span className="cp-unit">{unit}</span>
        <span className={`cp-status cp-status-${status}`}>
          {status === "pass" ? "✓" : status === "warn" ? "△" : "✕"}
        </span>
      </div>
      <div className="cp-track">
        <div className={`cp-fill cp-fill-${status}`} style={{width: `${pct}%`}}></div>
        {!inverse && <><div className="cp-range-min" style={{left: `0%`}}></div><div className="cp-range-max" style={{left: `100%`}}></div></>}
      </div>
    </div>
  );
}

function EffBar({ label, value, target }) {
  const status = value >= 95 ? "optimal" : value >= 70 ? "good" : value >= 40 ? "mid" : "low";
  return (
    <div className="eff-row">
      <div className="eff-head">
        <div className="eff-label">{label}</div>
        <div className={`eff-status eff-${status}`}>
          <span className="mono">{value.toFixed(0)}%</span>
          <span className="eff-status-label">{status === "optimal" ? "권장 충족" : status === "good" ? "양호" : status === "mid" ? "미달" : "부족"}</span>
        </div>
      </div>
      <div className="eff-bar-track">
        <div className={`eff-bar-fill eff-${status}`} style={{width: `${Math.min(100, value)}%`}}></div>
        <div className="eff-bar-target"></div>
      </div>
      <div className="eff-target mono">TARGET · {target}</div>
    </div>
  );
}

// 관능 프로파일 예측 — 원료 투입량 기반 규칙(rule-based) 근사식.
// 실제 관능평가 패널 데이터가 아니며, 각 계수는 시연을 위한 단순 선형 가정입니다.
// (예: 감미료 함량이 많을수록 단맛·잔미 상승, 유단백이 많을수록 우유맛·이취 상승 등)
function SensoryRadar({ ings, flavor, sensoryAxes }) {
  const flavored = flavor && flavor !== "무향";
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const attrs = sensoryAxes.map(axis => ({
    label: axis.label,
    value: clamp(sumParts(ings, axis.parts) + (flavored && axis.flavorBonus ? axis.flavorBonus : 0)),
  }));
  const cx = 130, cy = 130, r = 90;
  const points = attrs.map((a, i) => {
    const angle = (Math.PI * 2 * i) / attrs.length - Math.PI/2;
    const rr = r * a.value / 100;
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr, angle, a };
  });
  const path = points.map((p,i)=> `${i===0?"M":"L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 260 260" className="radar">
        {[0.2, 0.4, 0.6, 0.8, 1].map((k,i)=>(
          <polygon key={i}
            points={attrs.map((_,i2)=>{
              const angle = (Math.PI * 2 * i2) / attrs.length - Math.PI/2;
              return `${cx + Math.cos(angle)*r*k},${cy + Math.sin(angle)*r*k}`;
            }).join(" ")}
            fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
        ))}
        {attrs.map((_,i)=>{
          const angle = (Math.PI * 2 * i) / attrs.length - Math.PI/2;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle)*r} y2={cy + Math.sin(angle)*r} stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>;
        })}
        <path d={path} fill="url(#radar-grad)" stroke="var(--accent)" strokeWidth="1.4" opacity="0.9"/>
        <defs>
          <radialGradient id="radar-grad">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05"/>
          </radialGradient>
        </defs>
        {points.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--accent)"/>
            <text x={cx + Math.cos(p.angle)*(r+18)} y={cy + Math.sin(p.angle)*(r+18)}
                  textAnchor="middle" dominantBaseline="middle"
                  className="radar-label" fontSize="10">{p.a.label}</text>
            <text x={cx + Math.cos(p.angle)*(r+32)} y={cy + Math.sin(p.angle)*(r+32) + 3}
                  textAnchor="middle" className="radar-value mono" fontSize="9">{p.a.value}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function roleColor(role) {
  const map = {
    "탄수": "oklch(0.72 0.16 235)",
    "단백": "oklch(0.78 0.14 195)",
    "지방": "oklch(0.75 0.14 55)",
    "미량": "oklch(0.7 0.16 275)",
    "안정": "oklch(0.65 0.06 245)",
    "관능": "oklch(0.72 0.16 25)",
    "감미": "oklch(0.75 0.12 320)",
    "담체": "oklch(0.55 0.02 245)",
  };
  return map[role] || "oklch(0.6 0.05 245)";
}

window.Step3Formula = Step3Formula;
