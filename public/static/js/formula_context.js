// 전역 배합 상태 Context (Step 4/5 공유) — LLM 채팅 없이 슬라이더 상호작용만 지원
(function () {
  const { createContext, useContext, useState, useEffect, useRef } = React;

  const FormulaContext = createContext(null);

  // role 값 정규화: LLM이 영문/혼용으로 생성할 수 있으므로 한국어로 통일
  const ROLE_NORMALIZE = {
    "탄수": "탄수", "carb": "탄수", "탄수화물": "탄수",
    "단백": "단백", "protein": "단백", "단백질": "단백",
    "지방": "지방", "fat": "지방", "oil": "지방",
    "미량": "미량", "micro": "미량", "vitamin": "미량", "mineral": "미량",
    "안정": "안정", "stable": "안정", "stabilizer": "안정", "emul": "안정",
    "감미": "감미", "sweet": "감미", "sweetener": "감미",
    "관능": "관능", "flavor": "관능", "향미": "관능",
    "담체": "담체", "carrier": "담체", "water": "담체", "정제수": "담체",
    // "기능" role: 콜라겐/글루코사민 등 기능성 원료 → 단백질 계열로 열량 계산
    "기능": "단백", "functional": "단백", "func": "단백",
    "efficacy": "단백", "active": "단백",
  };

  function normalizeIngs(ings) {
    return (ings || []).map(x => ({
      ...x,
      role: ROLE_NORMALIZE[x.role] || ROLE_NORMALIZE[(x.role || "").toLowerCase()] || x.role,
    }));
  }

  // cost 폴백 — PHYTO_DATA.cost 구조가 불완전할 때 방어
  const FALLBACK_COST = {
    packaging: { liquidPack: 240, outerBox: 620, shipperBox: 180, label: 120, sterilization: 480 },
    overhead:  { labor: 780, utility: 340, qa: 320, depreciation: 420, logistics: 380 },
    target:    { wholesaleMarkup: 1.7, retailMarkup: 2.3, msrp: 39000 },
  };
  function safeC() {
    const c = window.PHYTO_DATA?.cost;
    if (!c?.packaging || !c?.overhead || !c?.target) return FALLBACK_COST;
    return c;
  }
  function readFormulaSnapshot() {
    const f = window.PHYTO_DATA.formula;
    return {
      ings: normalizeIngs(f.ingredients || []),
      flavor: (f.flavors && f.flavors[0]) || "바닐라",
      format: (f.formats && f.formats[0]) || "액상팩 200ml",
      servings: f.servingsPerBox || 24,
      msrp: window.PHYTO_DATA.cost?.target?.msrp || 45000,
      giIngredientId: f.giIngredientId || null,
      giBaseline: f.giBaseline ?? 75,
      giWeight: f.giWeight ?? 45,
    };
  }

  function FormulaProvider({ children }) {
    const snap = readFormulaSnapshot();

    const [ings, setIngs] = useState(snap.ings);
    const [flavor, setFlavor] = useState(snap.flavor);
    const [format, setFormat] = useState(snap.format);
    const [servings, setServings] = useState(snap.servings);
    const [msrp, setMsrp] = useState(snap.msrp);

    // gi 메타 — PHYTO_DATA.formula가 바뀌면 함께 갱신해야 하므로 state로 관리
    const [giMeta, setGiMeta] = useState({
      giIngredientId: snap.giIngredientId,
      giBaseline: snap.giBaseline,
      giWeight: snap.giWeight,
    });

    const [yieldOverall, setYieldOverall] = useState(93);
    const [batchSize, setBatchSize] = useState(30000);
    const [channel, setChannel] = useState("병원");
    const [highlight, setHighlight] = useState(null);
    const [priceMode, setPriceMode] = useState("example");
    const [customPrices, setCustomPrices] = useState({});

    // PHYTO_DATA.formula가 외부에서 바뀌는 경우(새로고침 복원, 재생성) 동기화
    // codename을 기준으로 변경 감지
    const lastCodename = useRef(window.PHYTO_DATA?.product?.codename || "");
    useEffect(() => {
      const timer = setInterval(() => {
        const currentCodename = window.PHYTO_DATA?.product?.codename || "";
        if (currentCodename !== lastCodename.current) {
          lastCodename.current = currentCodename;
          const newSnap = readFormulaSnapshot();
          setIngs(newSnap.ings);
          setFlavor(newSnap.flavor);
          setFormat(newSnap.format);
          setServings(newSnap.servings);
          setMsrp(newSnap.msrp);
          setGiMeta({
            giIngredientId: newSnap.giIngredientId,
            giBaseline: newSnap.giBaseline,
            giWeight: newSnap.giWeight,
          });
          setCustomPrices({});
        }
      }, 300);
      return () => clearInterval(timer);
    }, []);

    const updateCustomPrice = (id, val) => {
      setCustomPrices(prev => {
        if (val === null || val === undefined || isNaN(val)) {
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: Math.max(0, val) };
      });
    };
    const priceFor = (ing) => (priceMode === "custom" && customPrices[ing.id] != null) ? customPrices[ing.id] : ing.price;

    const totalTarget = 200;
    const nonWater = ings.filter(x => x.id !== "wat").reduce((s, x) => s + x.amount, 0);
    const waterAmount = Math.max(0, totalTarget - nonWater);

    const carb    = ings.filter(x => x.role === "탄수").reduce((s, x) => s + x.amount, 0);
    const protein = ings.filter(x => x.role === "단백").reduce((s, x) => s + x.amount, 0);
    const fat     = ings.filter(x => x.role === "지방").reduce((s, x) => s + x.amount, 0);
    const kcal = carb * 4 + protein * 4 + fat * 9;
    const carbPct    = kcal > 0 ? (carb    * 4 / kcal) * 100 : 0;
    const proteinPct = kcal > 0 ? (protein * 4 / kcal) * 100 : 0;
    const fatPct     = kcal > 0 ? (fat     * 9 / kcal) * 100 : 0;

    // giMeta는 state이므로 항상 최신 PHYTO_DATA 기반
    const { giIngredientId, giBaseline, giWeight } = giMeta;
    const giIngAmount = giIngredientId ? (ings.find(x => x.id === giIngredientId)?.amount || 0) : 0;
    const estimatedGi = carb > 0
      ? Math.round(giBaseline - (giIngAmount / Math.max(1, carb)) * giWeight)
      : giBaseline;

    const ingCostPerPack = ings.reduce((s, x) => s + x.amount * priceFor(x) / (x.yieldPct / 100), 0);
    const rawPerBox = ingCostPerPack * servings / (yieldOverall / 100);
    const c = safeC();
    const packPerBox = c.packaging.liquidPack * servings + c.packaging.outerBox + c.packaging.shipperBox + c.packaging.label + c.packaging.sterilization;
    const ohPerBox = c.overhead.labor + c.overhead.utility + c.overhead.qa + c.overhead.depreciation + c.overhead.logistics;
    const safeBatch = batchSize > 0 ? batchSize : 30000;
    const ohAdjusted = ohPerBox * (30000 / safeBatch) ** 0.15;
    const totalCost = rawPerBox + packPerBox + ohAdjusted;
    const marginPct = msrp > 0 ? ((msrp - totalCost) / msrp) * 100 : 0;

    const updateAmount = (id, val) => {
      setIngs(prev => prev.map(x => x.id === id ? { ...x, amount: Math.max(0, val) } : x));
    };
    const resetIngs = () => setIngs(readFormulaSnapshot().ings);

    const value = {
      ings, updateAmount, resetIngs,
      flavor, setFlavor, format, setFormat, servings, setServings,
      msrp, setMsrp, yieldOverall, setYieldOverall, batchSize, setBatchSize, channel, setChannel,
      waterAmount, nonWater, totalTarget,
      carb, protein, fat, kcal, carbPct, proteinPct, fatPct, estimatedGi,
      ingCostPerPack, rawPerBox, packPerBox, ohAdjusted, totalCost, marginPct,
      highlight, setHighlight,
      priceMode, setPriceMode, customPrices, updateCustomPrice, priceFor,
    };

    return <FormulaContext.Provider value={value}>{children}</FormulaContext.Provider>;
  }

  function useFormula() {
    return useContext(FormulaContext);
  }

  Object.assign(window, { FormulaProvider, FormulaContext, useFormula, normalizeIngs });
})();
