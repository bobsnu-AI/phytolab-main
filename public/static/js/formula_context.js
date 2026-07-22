// 전역 배합 상태 Context (Step 4/5 공유) — LLM 채팅 없이 슬라이더 상호작용만 지원
(function () {
  const { createContext, useContext, useState } = React;

  const FormulaContext = createContext(null);

  function FormulaProvider({ children }) {
    const initial = window.PHYTO_DATA.formula.ingredients;
    const [ings, setIngs] = useState(initial);
    const [flavor, setFlavor] = useState("바닐라");
    const [format, setFormat] = useState("액상팩 200ml");
    const [servings, setServings] = useState(24);

    const [msrp, setMsrp] = useState(45000);
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

    const isoAmount = ings.find(x => x.id === "iso")?.amount || 0;
    const estimatedGi = Math.round(75 - (isoAmount / Math.max(1, carb)) * 45);

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

    const resetIngs = () => setIngs(initial);

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

  Object.assign(window, { FormulaProvider, FormulaContext, useFormula });
})();
