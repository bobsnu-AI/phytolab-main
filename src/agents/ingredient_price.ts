// 공공데이터 포털 농산물 가격 API 연동 엔드포인트
// Colab 노트북 로직을 Cloudflare Workers fetch 기반으로 이식
// API: https://apis.data.go.kr/B552845/perYearMonth/price (농수산식품유통공사)

import { Hono } from "hono";

// 품목명 → 품목코드 매핑 (노트북 DEFAULT_ITEMS 기반 확장)
const ITEM_CODE_MAP: Record<string, string[]> = {
  "쌀": ["111"], "현미": ["112"], "찹쌀": ["113"],
  "콩": ["141"], "팥": ["142"], "녹두": ["143"],
  "배추": ["211"], "양배추": ["212"], "시금치": ["213"],
  "상추": ["214"], "깻잎": ["216"],
  "무": ["231"], "당근": ["232"], "연근": ["233"],
  "양파": ["245"], "파": ["246"], "생강": ["247"],
  "피마늘": ["244"], "깐마늘": ["258", "259"],
  "파프리카": ["256"], "고추": ["253"],
  "브로콜리": ["261", "280"], "케일": ["264"],
  "양상추": ["262"], "청경채": ["263"],
  "비트": ["265"], "적양배추": ["215"],
  "방울토마토": ["422"], "토마토": ["421"],
  "사과": ["411"], "배": ["412"], "포도": ["414"],
  "감귤": ["415"], "딸기": ["416"], "복숭아": ["413"],
  "수박": ["431"], "참외": ["432"],
  "감자": ["221"], "고구마": ["222"], "옥수수": ["223"],
  "표고버섯": ["271"], "느타리버섯": ["272"], "팽이버섯": ["273"],
  "쑥갓": ["217"], "열무": ["234"], "더덕": ["235"],
  "인삼": ["311"], "도라지": ["236"],
};

// 단위 → 1kg 환산 계수 (노트북 convert_to_kg_factor 이식)
function toKgFactor(unitStr: string, unitSz: string): number {
  const u = (unitStr || "kg").toLowerCase().trim();
  const sz = parseFloat(unitSz) || 1;

  // 단위 내 숫자 추출 (e.g. "100g" -> 100)
  const numInUnit = parseFloat(u.replace(/[^0-9.]/g, "")) || 1;

  if (u.includes("g") && !u.includes("kg")) {
    return (numInUnit * sz) / 1000;
  } else if (u.includes("kg")) {
    return numInUnit * sz;
  }
  return sz;
}

interface PriceItem {
  yearMonth: string;
  channelName: string;
  itemName: string;
  varietyName: string;
  gradeName: string;
  unitQty: string;
  unit: string;
  origPrice: number;
  pricePerKg: number;
}

async function fetchItemPrices(
  itemCodes: string[],
  seCode: string,
  startYm: string,
  endYm: string,
  serviceKey: string
): Promise<PriceItem[]> {
  const ENDPOINT = "https://apis.data.go.kr/B552845/perYearMonth/price";
  const results: PriceItem[] = [];

  for (const code of itemCodes) {
    const params = new URLSearchParams({
      serviceKey,
      returnType: "json",
      pageNo: "1",
      numOfRows: "500",
      "cond[exmn_ym::GTE]": startYm,
      "cond[exmn_ym::LTE]": endYm,
      "cond[item_cd::EQ]": code,
    });
    if (seCode) params.set("cond[se_cd::EQ]", seCode);

    try {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const body = data?.response?.body ?? {};
      let items: any[] = [];
      const ic = body?.items?.item;
      if (Array.isArray(ic)) items = ic;
      else if (ic && typeof ic === "object") items = [ic];

      for (const it of items) {
        const rawPrice = parseFloat(String(it.pmm_avgprc ?? "0").replace(/,/g, "")) || 0;
        const unitStr = String(it.unit ?? "kg");
        const unitSz = String(it.unit_sz ?? "1").replace(/,/g, "");
        const kgFactor = toKgFactor(unitStr, unitSz);
        const pricePerKg = kgFactor > 0 ? rawPrice / kgFactor : rawPrice;
        results.push({
          yearMonth: String(it.exmn_ym ?? ""),
          channelName: String(it.se_nm ?? "미구분"),
          itemName: String(it.item_nm ?? ""),
          varietyName: String(it.vrty_nm ?? ""),
          gradeName: String(it.grd_nm ?? ""),
          unitQty: unitSz,
          unit: unitStr,
          origPrice: rawPrice,
          pricePerKg: Math.round(pricePerKg),
        });
      }
    } catch {
      // 개별 코드 실패 무시
    }
  }

  return results;
}

export function createIngredientPriceRoute() {
  const app = new Hono<{ Bindings: { AGRO_API_KEY?: string } }>();

  /**
   * GET /api/ingredient-price
   * query params:
   *   keyword  : 원료명 (e.g. "브로콜리")
   *   start    : YYYYMM (default: 6개월 전)
   *   end      : YYYYMM (default: 현재달)
   *   channel  : "" | "1"(소매) | "2"(중도매) | "3"(친환경) | "7"(친환경신규)
   *   apiKey   : 공공데이터포털 서비스키 (선택 · 없으면 env.AGRO_API_KEY 사용)
   *
   * response: { ok: true, keyword, items: PriceItem[], latestItems: PriceItem[], avgPricePerKg: number }
   */
  app.get("/api/ingredient-price", async (c) => {
    const keyword = c.req.query("keyword") ?? "";
    const channel = c.req.query("channel") ?? "";

    // 기본 기간: 최근 6개월
    const now = new Date();
    const defaultEnd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const defaultStart = `${sixMonthsAgo.getFullYear()}${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    const start = c.req.query("start") || defaultStart;
    const end = c.req.query("end") || defaultEnd;
    const apiKey = c.req.query("apiKey") || (c.env as any)?.AGRO_API_KEY || "";

    if (!keyword.trim()) {
      return c.json({ ok: false, error: "keyword 파라미터가 필요합니다" }, 400);
    }
    if (!apiKey) {
      return c.json({ ok: false, error: "공공데이터 API 키가 설정되지 않았습니다 (apiKey 파라미터 또는 AGRO_API_KEY 환경변수)" }, 400);
    }

    // 품목코드 검색
    const kwNorm = keyword.replace(/\s/g, "");
    const codes: string[] = [];
    for (const [name, codeList] of Object.entries(ITEM_CODE_MAP)) {
      if (name.replace(/\s/g, "").includes(kwNorm) || kwNorm.includes(name.replace(/\s/g, ""))) {
        codes.push(...codeList);
      }
    }
    // 코드 중복 제거
    const uniqueCodes = [...new Set(codes)].slice(0, 5);

    let items: PriceItem[] = [];

    if (uniqueCodes.length > 0) {
      items = await fetchItemPrices(uniqueCodes, channel, start, end, apiKey);
    }

    // 코드 없거나 결과 없으면 → 키워드로 전체 스캔 (첫 페이지)
    if (items.length === 0) {
      const ENDPOINT = "https://apis.data.go.kr/B552845/perYearMonth/price";
      const params = new URLSearchParams({
        serviceKey: apiKey,
        returnType: "json",
        pageNo: "1",
        numOfRows: "500",
        "cond[exmn_ym::GTE]": start,
        "cond[exmn_ym::LTE]": end,
      });
      if (channel) params.set("cond[se_cd::EQ]", channel);
      try {
        const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data: any = await res.json();
          let rawItems: any[] = [];
          const ic = data?.response?.body?.items?.item;
          if (Array.isArray(ic)) rawItems = ic;
          else if (ic && typeof ic === "object") rawItems = [ic];

          const kwLower = kwNorm.toLowerCase();
          for (const it of rawItems) {
            const nm = String(it.item_nm ?? "").replace(/\s/g, "").toLowerCase();
            const vr = String(it.vrty_nm ?? "").replace(/\s/g, "").toLowerCase();
            if (!nm.includes(kwLower) && !vr.includes(kwLower)) continue;
            const rawPrice = parseFloat(String(it.pmm_avgprc ?? "0").replace(/,/g, "")) || 0;
            const unitStr = String(it.unit ?? "kg");
            const unitSz = String(it.unit_sz ?? "1").replace(/,/g, "");
            const kgFactor = toKgFactor(unitStr, unitSz);
            const pricePerKg = kgFactor > 0 ? rawPrice / kgFactor : rawPrice;
            items.push({
              yearMonth: String(it.exmn_ym ?? ""),
              channelName: String(it.se_nm ?? "미구분"),
              itemName: String(it.item_nm ?? ""),
              varietyName: String(it.vrty_nm ?? ""),
              gradeName: String(it.grd_nm ?? ""),
              unitQty: unitSz,
              unit: unitStr,
              origPrice: rawPrice,
              pricePerKg: Math.round(pricePerKg),
            });
          }
        }
      } catch {
        // 스캔 실패 무시
      }
    }

    // 최신 데이터 dedup (채널 × 품종 × 등급 기준 최신 1건)
    const latestMap = new Map<string, PriceItem>();
    const sorted = [...items].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    for (const it of sorted) {
      const key = `${it.channelName}|${it.itemName}|${it.varietyName}|${it.gradeName}`;
      if (!latestMap.has(key)) latestMap.set(key, it);
    }
    const latestItems = Array.from(latestMap.values());

    // 소매 기준 평균 시세 (소매 없으면 전체 평균)
    const retailItems = latestItems.filter(x => x.channelName === "소매");
    const avgBase = (retailItems.length ? retailItems : latestItems).filter(x => x.pricePerKg > 0);
    const avgPricePerKg = avgBase.length
      ? Math.round(avgBase.reduce((s, x) => s + x.pricePerKg, 0) / avgBase.length)
      : 0;

    return c.json({
      ok: true,
      keyword,
      start,
      end,
      totalItems: items.length,
      latestItems,
      avgPricePerKg,
      // ₩/g 환산 (배합설계에서 바로 쓸 수 있는 단가)
      avgPricePerGram: avgPricePerKg > 0 ? +(avgPricePerKg / 1000).toFixed(4) : null,
    });
  });

  /**
   * GET /api/ingredient-price/items
   * 지원 품목 목록 반환 (자동완성용)
   */
  app.get("/api/ingredient-price/items", (c) => {
    return c.json({ items: Object.keys(ITEM_CODE_MAP) });
  });

  return app;
}
