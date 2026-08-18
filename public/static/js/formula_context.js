// 전역 배합 상태 Context (Step 4/5 공유) — LLM 채팅 없이 슬라이더 상호작용만 지원
(function () {
  const { createContext, useContext, useState } = React;

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
  };

  function normalizeIngs(ings) {
    return ings.map(x => ({
      ...x,
      role: ROLE_NORMALIZE[x.role] || ROLE_NORMALIZE[(x.role || "").toLowerCase()] || x.role,
    }));
  }

  function FormulaProvider({ children }) {
    const formulaData = window.PHYTO_DATA.formula;
    // initial은 formula 객체 전체 (giIngredientId, giBaseline, giWeight 포함)
    const initialFormula = formulaData;
    const initialIngs = normalizeIngs(formulaData.ingredients || []);

    const [ings, setIngs] = useState(initialIngs);
    const [flavor, setFlavor] = useState(
      (formulaData.flavors && formulaData.flavors[0]) || "바닐라"
    );
    const [format, setFormat] = useState(
      (formulaData.formats && formulaData.formats[0]) || "액상팩 200ml"
    );
    const [servings, setServings] = useState(formulaData.servingsPerBox || 24);

    const [msrp, setMsrp] = useState(
      window.PHYTO_DATA.cost?.target?.msrp || 45000
    );
    const [yieldOverall, setYieldOverall] = useState(93);
    const [batchSize, setBatchSize] = useState(30000);
    const [channel, setChannel] = useState("병원");

    const [highlight, setHighlight] = useState(null);

    // 원료 단가 소스: "example"(시연용 예시 단가) vs "custom"(기업이 직접 입력한 실제 공급단가)
    const [priceMode, setPriceMode] = useState("example");
    const [customPrices, setCustomPrices] = useState({}); // { [ingredientId]: 원/g }
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
    // 실제 원가계산에 사용할 단가 resolver: custom 모드이고 값이 입력되어 있으면 그 값을, 아니면 예시 단가 사용
    const priceFor = (ing) => (priceMode === "custom" && customPrices[ing.id] != null) ? customPrices[ing.id] : ing.price;

    const totalTarget = 200;
    const nonWater = ings.filter(x => x.id !== "wat").reduce((s, x) => s + x.amount, 0);
    const waterAmount = Math.max(0, totalTarget - nonWater);

    const carb = ings.filter(x => x.role === "탄수").reduce((s, x) => s + x.amount, 0);
    const protein = ings.filter(x => x.role === "단백").reduce((s, x) => s + x.amount, 0);
    const fat = ings.filter(x => x.role === "지방").reduce((s, x) => s + x.amount, 0);
    const kcal = carb * 4 + protein * 4 + fat * 9;
    const carbPct = kcal > 0 ? (carb * 4 / kcal) * 100 : 0;
    const proteinPct = kcal > 0 ? (protein * 4 / kcal) * 100 : 0;
    const fatPct = kcal > 0 ? (fat * 9 / kcal) * 100 : 0;

    // giIngredientId: formula 객체에서 읽음 (ingredients 배열이 아님)
    const giIngId = initialFormula.giIngredientId;
    const giBaseline = initialFormula.giBaseline ?? 75;
    const giWeight = initialFormula.giWeight ?? 45;
    const giIngAmount = giIngId ? (ings.find(x => x.id === giIngId)?.amount || 0) : 0;
    // carb가 0이면 GI를 giBaseline으로 표시 (NaN 방지)
    const estimatedGi = carb > 0
      ? Math.round(giBaseline - (giIngAmount / Math.max(1, carb)) * giWeight)
      : giBaseline;

    const ingCostPerPack = ings.reduce((s, x) => s + x.amount * priceFor(x) / (x.yieldPct / 100), 0);
    const rawPerBox = ingCostPerPack * servings / (yieldOverall / 100);
    const c = window.PHYTO_DATA.cost;
    const packPerBox = c.packaging.liquidPack * servings + c.packaging.outerBox + c.packaging.shipperBox + c.packaging.label + c.packaging.sterilization;
    const ohPerBox = c.overhead.labor + c.overhead.utility + c.overhead.qa + c.overhead.depreciation + c.overhead.logistics;
    const ohAdjusted = ohPerBox * (30000 / batchSize) ** 0.15;
    const totalCost = rawPerBox + packPerBox + ohAdjusted;
    const marginPct = ((msrp - totalCost) / msrp) * 100;

    const updateAmount = (id, val) => {
      setIngs(prev => prev.map(x => x.id === id ? { ...x, amount: Math.max(0, val) } : x));
    };

    const resetIngs = () => setIngs(initialIngs);

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
