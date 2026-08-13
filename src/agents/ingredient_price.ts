// 공공데이터 포털 농산물 가격 API 연동 엔드포인트
// API 1: https://apis.data.go.kr/B552845/recent/price  (최근일자 도·소매 가격정보) ← 기본
//   필드: exmn_ymd(날짜), exmn_dd_cnvs_prc(1kg환산가격), exmn_dd_prc(단위원가)
// API 2: https://apis.data.go.kr/B552845/perDay/price  (일별 도·소매 가격정보) ← fallback
//   필드: saleDate(날짜), dpr1(소매단가), dpr2(중도매단가), unit, unit_sz

import { Hono } from "hono";

// 품목명 → 품목코드 매핑
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

// 단위 → 1kg 환산 계수
function toKgFactor(unitStr: string, unitSz: string): number {
  const u = (unitStr || "kg").toLowerCase().trim();
  const sz = parseFloat(unitSz) || 1;
  const numInUnit = parseFloat(u.replace(/[^0-9.]/g, "")) || 1;
  if (u.includes("g") && !u.includes("kg")) return (numInUnit * sz) / 1000;
  if (u.includes("kg")) return numInUnit * sz;
  return sz;
}

interface PriceItem {
  date: string;       // YYYYMMDD 또는 YYYYMM
  channelName: string;
  itemName: string;
  varietyName: string;
  gradeName: string;
  unit: string;
  unitQty: string;
  origPrice: number;
  pricePerKg: number;
}

// ── perDay API: 일별 도·소매 가격 ──────────────────────────────────────
async function fetchPerDay(
  itemCodes: string[],
  seCode: string,
  startDate: string,  // YYYYMMDD
  endDate: string,
  serviceKey: string
): Promise<PriceItem[]> {
  const ENDPOINT = "https://apis.data.go.kr/B552845/perDay/price";
  const results: PriceItem[] = [];

  for (const code of itemCodes) {
    const params = new URLSearchParams({
      serviceKey,
      returnType: "json",
      pageNo: "1",
      numOfRows: "500",
      "cond[saleDate::GTE]": startDate,
      "cond[saleDate::LTE]": endDate,
      "cond[item_cd::EQ]": code,
    });
    if (seCode) params.set("cond[se_cd::EQ]", seCode);

    try {
      const res = await fetch(`${ENDPOINT}?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const ic = data?.response?.body?.items?.item;
      const raw: any[] = Array.isArray(ic) ? ic : ic ? [ic] : [];

      for (const it of raw) {
        // perDay 필드: saleDate, se_nm, item_nm, vrty_nm, grd_nm, unit, unit_sz, dpr1(소매), dpr2(중도매)
        // 소매가(dpr1) 우선, 없으면 중도매가(dpr2)
        const rawPrice =
          parseFloat(String(it.dpr1 ?? it.dpr2 ?? "0").replace(/,/g, "")) || 0;
        const unitStr = String(it.unit ?? "kg");
        const unitSz = String(it.unit_sz ?? "1").replace(/,/g, "");
        const kgFactor = toKgFactor(unitStr, unitSz);
        results.push({
          date: String(it.saleDate ?? ""),
          channelName: String(it.se_nm ?? "소매"),
          itemName: String(it.item_nm ?? ""),
          varietyName: String(it.vrty_nm ?? ""),
          gradeName: String(it.grd_nm ?? ""),
          unit: unitStr,
          unitQty: unitSz,
          origPrice: rawPrice,
          pricePerKg: kgFactor > 0 ? Math.round(rawPrice / kgFactor) : rawPrice,
        });
      }
    } catch { /* 개별 코드 실패 무시 */ }
  }
  return results;
}

// ── recent API: 최근일자 도·소매 가격 ─────────────────────────────────
// 필드 매핑 (perDay와 다름!):
//   exmn_ymd          → date (YYYYMMDD)
//   exmn_dd_cnvs_prc  → pricePerKg (이미 1kg 단위 환산 완료)
//   exmn_dd_prc       → origPrice (unit_sz 기준 원가)
//   se_nm / item_nm / vrty_nm / grd_nm / unit / unit_sz 동일
//   ※ dpr1/dpr2 필드는 recent API에 존재하지 않음
async function fetchRecent(
  itemCodes: string[],
  seCode: string,
  serviceKey: string
): Promise<PriceItem[]> {
  const ENDPOINT = "https://apis.data.go.kr/B552845/recent/price";
  const results: PriceItem[] = [];

  for (const code of itemCodes) {
    const params = new URLSearchParams({
      serviceKey,
      returnType: "json",
      pageNo: "1",
      numOfRows: "100",
      "cond[item_cd::EQ]": code,
    });
    if (seCode) params.set("cond[se_cd::EQ]", seCode);

    try {
      const res = await fetch(`${ENDPOINT}?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const ic = data?.response?.body?.items?.item;
      const raw: any[] = Array.isArray(ic) ? ic : ic ? [ic] : [];

      for (const it of raw) {
        // exmn_dd_cnvs_prc: 이미 1kg 단위로 환산된 가격 (가장 신뢰할 수 있는 필드)
        // exmn_dd_prc: unit_sz 기준 원가 (예: 10kg → 8398원)
        const cnvsPrc = parseFloat(String(it.exmn_dd_cnvs_prc ?? "0").replace(/,/g, "")) || 0;
        const origPrc = parseFloat(String(it.exmn_dd_prc ?? it.exmn_dd_cnvs_prc ?? "0").replace(/,/g, "")) || 0;
        const unitStr = String(it.unit ?? "kg");
        const unitSz = String(it.unit_sz ?? "1").replace(/,/g, "");
        results.push({
          date: String(it.exmn_ymd ?? ""),
          channelName: String(it.se_nm ?? "소매"),
          itemName: String(it.item_nm ?? ""),
          varietyName: String(it.vrty_nm ?? ""),
          gradeName: String(it.grd_nm ?? ""),
          unit: unitStr,
          unitQty: unitSz,
          origPrice: origPrc,
          // exmn_dd_cnvs_prc는 이미 1kg 환산 완료 → toKgFactor 불필요
          pricePerKg: cnvsPrc > 0 ? cnvsPrc : origPrc,
        });
      }
    } catch { /* 개별 코드 실패 무시 */ }
  }
  return results;
}

export function createIngredientPriceRoute() {
  const app = new Hono<{ Bindings: { AGRO_API_KEY?: string } }>();

  /**
   * GET /api/ingredient-price
   * query params:
   *   keyword  : 원료명 (e.g. "브로콜리")
   *   channel  : "" | "1"(소매) | "2"(중도매) | "3"(친환경)
   *   days     : 최근 N일 조회 (default: 30, recent 모드에선 무시)
   *   mode     : "recent"(기본, 최근일자) | "perday"(기간별)
   *   apiKey   : 공공데이터포털 서비스키 (없으면 env.AGRO_API_KEY)
   *
   * response: { ok, keyword, date, latestItems, avgPricePerKg, avgPricePerGram }
   */
  app.get("/api/ingredient-price", async (c) => {
    const keyword = c.req.query("keyword") ?? "";
    const channel = c.req.query("channel") ?? "";
    const mode = c.req.query("mode") ?? "recent";   // "recent" | "perday"
    const days = parseInt(c.req.query("days") ?? "30", 10) || 30;
    const apiKey = c.req.query("apiKey") || (c.env as any)?.AGRO_API_KEY || "";

    if (!keyword.trim())
      return c.json({ ok: false, error: "keyword 파라미터가 필요합니다" }, 400);
    if (!apiKey)
      return c.json({
        ok: false,
        error: "공공데이터 API 키가 설정되지 않았습니다 (apiKey 파라미터 또는 AGRO_API_KEY 환경변수)",
      }, 400);

    // 품목코드 매칭
    const kwNorm = keyword.replace(/\s/g, "");
    const codes: string[] = [];
    for (const [name, codeList] of Object.entries(ITEM_CODE_MAP)) {
      if (name.replace(/\s/g, "").includes(kwNorm) || kwNorm.includes(name.replace(/\s/g, "")))
        codes.push(...codeList);
    }
    const uniqueCodes = [...new Set(codes)].slice(0, 5);

    let items: PriceItem[] = [];

    if (mode === "perday") {
      // perDay: 최근 N일 기간 조회
      const now = new Date();
      const end = now.toISOString().slice(0, 10).replace(/-/g, "");
      const from = new Date(now);
      from.setDate(from.getDate() - days);
      const start = from.toISOString().slice(0, 10).replace(/-/g, "");

      if (uniqueCodes.length > 0)
        items = await fetchPerDay(uniqueCodes, channel, start, end, apiKey);
    } else {
      // recent: 최근일자 (가장 빠른 응답, 데이터 최신)
      if (uniqueCodes.length > 0)
        items = await fetchRecent(uniqueCodes, channel, apiKey);

      // recent에서 결과 없으면 perDay 30일로 fallback
      if (items.length === 0) {
        const now = new Date();
        const end = now.toISOString().slice(0, 10).replace(/-/g, "");
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        const start = from.toISOString().slice(0, 10).replace(/-/g, "");
        if (uniqueCodes.length > 0)
          items = await fetchPerDay(uniqueCodes, channel, start, end, apiKey);
      }
    }

    // 최신 순 정렬 후 채널×품종×등급 기준 dedup
    const latestMap = new Map<string, PriceItem>();
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    for (const it of sorted) {
      const key = `${it.channelName}|${it.itemName}|${it.varietyName}|${it.gradeName}`;
      if (!latestMap.has(key)) latestMap.set(key, it);
    }
    const latestItems = Array.from(latestMap.values());

    // 소매 기준 평균 (없으면 전체 평균)
    const retailItems = latestItems.filter(x => x.channelName.includes("소매"));
    const avgBase = (retailItems.length ? retailItems : latestItems).filter(x => x.pricePerKg > 0);
    const avgPricePerKg = avgBase.length
      ? Math.round(avgBase.reduce((s, x) => s + x.pricePerKg, 0) / avgBase.length)
      : 0;

    return c.json({
      ok: true,
      keyword,
      mode,
      totalItems: items.length,
      latestDate: sorted[0]?.date ?? null,
      latestItems,
      avgPricePerKg,
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
