// STAGE 00 브리프 → STAGE 01~04용 제품 데이터셋 생성
// 설계 원칙: "검증된 근거는 고정, 대화 문장만 LLM이 생성"이라는 기존 STEP1~4 라이브 논의 원칙을 유지하되,
// 그 "고정 근거"를 정적 상수(mockData.js/GLUCARE-M) 대신 브리프별로 1회 생성한 데이터셋으로 교체한다.
// 실패 시 섹션별로 안전한 기본값(FALLBACK_*)으로 대체해 화면이 깨지지 않도록 한다.
import { callAgentLlm, type LlmEnv } from "./llm";
import { label } from "./brief_recommend";
import { fetchConsumerInsights, type NaverEnv } from "./consumer_insights";

export interface ConfirmedBrief {
  productType?: string;  // 6개 제품군: tea/soymilk/rawfood/proteinbar/proteinshake/fsmp
  category?: string;    // 내부 매핑용 (PRODUCT_TYPE_META에서 파생)
  lifecycle: string;
  condition: string[];
  ingredient?: string[];
  format?: string;      // 내부 매핑용 (PRODUCT_TYPE_META에서 파생)
  reg?: string;
  channel?: string[];
  strategy?: string;
}

const SYSTEM_PROMPT =
  "JSON 생성 전용 엔진입니다. 유효한 JSON 객체 하나만 출력하세요. " +
  "코드펜스(```), 설명, 인사말 절대 금지. 숫자는 현실적 범위로, 한국어는 명사형으로.";

// productType → 내부 category/format 매핑
const PRODUCT_TYPE_META: Record<string, { category: string; format: string; label: string }> = {
  tea:          { category: "general", format: "liquid",  label: "차류" },
  soymilk:      { category: "general", format: "liquid",  label: "두유류" },
  rawfood:      { category: "general", format: "powder",  label: "생식" },
  proteinbar:   { category: "sports",  format: "bar",     label: "프로틴바" },
  proteinshake: { category: "sports",  format: "powder",  label: "프로틴쉐이크" },
  fsmp:         { category: "fsmp",    format: "liquid",  label: "특수의료용도식품" },
};

function briefDescription(brief: ConfirmedBrief): string {
  const parts: string[] = [];
  // productType 우선, 없으면 category fallback
  if (brief.productType) {
    const ptMeta = PRODUCT_TYPE_META[brief.productType];
    parts.push(`제품군: ${ptMeta?.label || brief.productType}`);
  } else if (brief.category) {
    parts.push(`카테고리: ${label("category", brief.category)}`);
  }
  parts.push(`생애주기: ${label("lifecycle", brief.lifecycle)}`);
  parts.push(`건강이슈: ${brief.condition.map((c) => label("condition", c)).join("·")}`);
  if (brief.ingredient?.length) parts.push(`원료 선호: ${brief.ingredient.map((i) => label("ingredient", i)).join("·")}`);
  if (brief.channel?.length) parts.push(`유통 채널: ${brief.channel.map((c) => label("channel", c)).join("·")}`);
  if (brief.strategy) parts.push(`비즈 전략: ${label("strategy", brief.strategy)}`);
  return parts.join(" / ");
}

// brief에서 실제 category/format 결정 (productType 우선)
function resolveCategory(brief: ConfirmedBrief): string {
  if (brief.productType) return PRODUCT_TYPE_META[brief.productType]?.category || "general";
  return brief.category || "general";
}
function resolveFormat(brief: ConfirmedBrief): string {
  if (brief.productType) return PRODUCT_TYPE_META[brief.productType]?.format || "liquid";
  return brief.format || "liquid";
}

function extractJson(text: string): any {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("JSON 형식 아님");
  return JSON.parse(t.slice(start, end + 1));
}

// CF Pages Worker 30초 제한 안에서 전체 LLM 콜이 완료되어야 함
// 첫 시도 10s + 재시도 없음 = 최대 10s per call.
// A0/A1/A2/A2b/A3/B2/네이버는 서로 병렬(≈10~14s), B1→C는 B1의 nutritionTarget을
// C 프롬프트에 반영해야 하므로 순차 실행(최악 10s+10s=20s) — 전체 worst-case ≈20~24s로 30s 이내 유지.
async function callJsonLlm(env: LlmEnv, userPrompt: string, maxTokens: number): Promise<any> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];
  const raw = await callAgentLlm(env, messages, { maxTokens, timeoutMs: 10000 });
  return extractJson(raw);
}

// ---------- Call A0: market context (prevalence / unmet / policy) — 별도 소형 콜 ----------
// A1이 토큰 부족으로 context를 잘라낼 때를 대비해 독립 호출로 분리
async function generatePartA0(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

이 브리프 대상의 한국 시장 현황을 아래 JSON 스키마로만 출력하세요.
- prevalence: 유병률 또는 타깃 인구 규모 (구체적 수치 + 출처 포함, 30자 이내)
- unmet: 현재 시장에서 해결되지 않은 소비자 핵심 니즈 (40자 이내)
- policy: 관련 정책·규제 동향 (예: 식약처 고시, 건강기능식품법 개정, 30자 이내)

{"prevalence":"...","unmet":"...","policy":"..."}`;
  return callJsonLlm(env, prompt, 200);
}

// ---------- Call A1: product + market (context 없는 간소화 버전) ----------
async function generatePartA1(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

아래 스키마를 실제 값으로 채워 JSON 하나만 출력하세요.

{"product":{"codename":"영문코드-1","tagline":"슬로건","target":"타깃","format":"제형+용량","category":"카테고리","subcategory":"세부","regClass":"고시번호","targetPrice":45000,"targetEvidenceStrength":8.2,"positioningSpec":"핵심스펙","positioningClaim":"클레임","positioningRating":4.3,"positioningChannel":"채널"},"market":{"headerTitle":"시장제목","headerDesc":"설명","domestic":{"size":3500,"unit":"억원","cagr":12,"year":2024,"cagrNote":"전망"},"global":{"size":15,"unit":"십억USD","cagr":8,"year":2025},"channels":[{"name":"C1","share":40,"cac":"낮음"},{"name":"C2","share":30,"cac":"중간"},{"name":"C3","share":20,"cac":"높음"},{"name":"C4","share":10,"cac":"중간"}]}}`;
  return callJsonLlm(env, prompt, 600);
}

// ---------- Call A2: competitors (브랜드·제형·스펙·클레임·가격·채널) ----------
async function generatePartA2(env: LlmEnv, brief: ConfirmedBrief) {
  const ptLabel = brief.productType
    ? ({ tea:"차류", soymilk:"두유류", rawfood:"생식", proteinbar:"프로틴바", proteinshake:"프로틴쉐이크", fsmp:"특수의료용도식품" } as Record<string,string>)[brief.productType] || brief.productType
    : "해당 제품군";
  const prompt = `브리프: ${briefDescription(brief)}

위 브리프 제품군(${ptLabel}) · 타깃 · 건강이슈를 겨냥하는 한국 실존 경쟁제품 5개를 조사해 JSON만 출력하세요.
규칙:
- brand: 실제 브랜드명 (20자 이내, "경쟁사N" 절대 금지, 반드시 실존 제품)
- format: 제형 (티백·파우더·RTD·바·액상팩 등 제품군에 맞게)
- key: 핵심 성분 또는 특징 1줄 (30자 이내)
- claim: 실제 마케팅 슬로건 (한국어, 30자 이내)
- price: 소비자 판매가 (원, 정수, 단품 또는 박스 기준 실제가)
- size: 용량/규격 (예: "200ml×10", "30g×20개", "1kg")
- rating: 플랫폼 평점 1-5 (소수점 1자리)
- reviews: 리뷰 수 (정수)
- channel: 주 유통채널 (온라인·오프라인·약국 등)
- evidenceStrength: 임상근거 강도 1-10

{"competitors":[{"brand":"실제브랜드1","format":"제형","key":"핵심성분","claim":"클레임","price":35000,"size":"규격","rating":4.2,"reviews":1200,"channel":"온라인","evidenceStrength":6.5},{"brand":"실제브랜드2","format":"제형","key":"핵심성분","claim":"클레임","price":28000,"size":"규격","rating":4.0,"reviews":800,"channel":"온라인","evidenceStrength":5.8},{"brand":"실제브랜드3","format":"제형","key":"핵심성분","claim":"클레임","price":42000,"size":"규격","rating":4.3,"reviews":2000,"channel":"약국·H&B","evidenceStrength":7.0},{"brand":"실제브랜드4","format":"제형","key":"핵심성분","claim":"클레임","price":32000,"size":"규격","rating":3.9,"reviews":500,"channel":"오프라인","evidenceStrength":5.5},{"brand":"실제브랜드5","format":"제형","key":"핵심성분","claim":"클레임","price":55000,"size":"규격","rating":4.5,"reviews":3000,"channel":"온라인D2C","evidenceStrength":7.5}]}`;
  return callJsonLlm(env, prompt, 800);
}

// ---------- Call A2b: reviews 키워드 (competitors와 분리하여 안정성 향상) ----------
async function generatePartA2b(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

이 제품군·타깃·건강이슈 카테고리의 소비자 리뷰에서 자주 나타나는 긍정/부정 키워드 각 8개를 JSON으로만 출력하세요.

{"positive":[{"t":"키워드","w":40},{"t":"키워드","w":35},{"t":"키워드","w":30},{"t":"키워드","w":28},{"t":"키워드","w":25},{"t":"키워드","w":22},{"t":"키워드","w":20},{"t":"키워드","w":18}],"negative":[{"t":"키워드","w":38},{"t":"키워드","w":32},{"t":"키워드","w":28},{"t":"키워드","w":25},{"t":"키워드","w":22},{"t":"키워드","w":20},{"t":"키워드","w":18},{"t":"키워드","w":15}]}`;
  return callJsonLlm(env, prompt, 350);
}

// ---------- Call A3: concept (LDA topics + painPoints + pod + conclusion) (600t) ----------
async function generatePartA3(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

소비자 인식 분석(LDA 토픽 3개·페인포인트 3개·POD·결론)을 아래 스키마로 채워 JSON 하나만 출력하세요.

{"concept":{"sourceNote":"AI 생성","sampleBadge":"AI 생성 예시","topics":[{"id":"A","name":"토픽A","docs":4,"totalDocs":12,"color":"us","kws":[{"t":"k","w":80},{"t":"k","w":65},{"t":"k","w":55},{"t":"k","w":45},{"t":"k","w":35}]},{"id":"B","name":"토픽B","docs":4,"totalDocs":12,"color":"avg","kws":[{"t":"k","w":75},{"t":"k","w":60},{"t":"k","w":50},{"t":"k","w":40},{"t":"k","w":30}]},{"id":"C","name":"토픽C","docs":4,"totalDocs":12,"color":"target","kws":[{"t":"k","w":70},{"t":"k","w":55},{"t":"k","w":45},{"t":"k","w":35},{"t":"k","w":25}]}],"painPoints":[{"label":"라벨1","text":"설명"},{"label":"라벨2","text":"설명"},{"label":"라벨3","text":"설명"}],"pod":"POD문장","podBold":["강조1","강조2"],"conclusion":"결론문장","conclusionBold":["강조1","강조2"]}}`;
  return callJsonLlm(env, prompt, 600);
}

// ---------- 제품군별 원료 가이드 (B1/C 프롬프트에 주입) ----------
function getProductTypeIngredientGuide(productType: string): { b1Guide: string; b1Example: string; cGuide: string; cExample: string } {
  switch (productType) {
    case "rawfood":
      return {
        b1Guide: `생식 제품이므로 실제 동결건조·냉압착·분말화한 채소·과일·곡물·해조류·씨앗류 원물 원료만 사용하세요.
합성 분리단백, MCT오일, 이소말툴로스, 잔탄검, 수크랄로스 등 가공 첨가물 금지.
예시 원료: 동결건조 케일분말, 동결건조 브로콜리분말, 현미분말, 귀리분말, 아마씨분말, 비트분말, 생강분말, 보리새싹분말, 스피루리나, 클로렐라, 효소혼합분말, 유산균분말`,
        b1Example: `{"ingredients":[{"name":"동결건조 케일분말(식이섬유)","evidence":"B","dose":"5g/일","cost":4,"note":"항산화·엽산 풍부, 관찰연구 근거"},{"name":"현미분말(탄수)","evidence":"B","dose":"20g/일","cost":1,"note":"저GI 복합탄수, 에너지 지속 공급"},{"name":"귀리분말(식이섬유)","evidence":"A","dose":"10g/일","cost":2,"note":"β-글루칸 콜레스테롤 저하 RCT"},{"name":"아마씨분말(오메가3)","evidence":"B","dose":"5g/일","cost":3,"note":"알파리놀렌산 심혈관 보호"},{"name":"스피루리나(단백)","evidence":"B","dose":"3g/일","cost":8,"note":"완전단백·철분·클로로필"},{"name":"생강분말(기능성)","evidence":"B","dose":"1g/일","cost":2,"note":"항염증·소화 개선 RCT"}],"nutritionTarget":{"calories":{"value":120,"unit":"kcal/1회","note":"저열량 원물식"},"carbRatio":{"value":60,"unit":"%en","note":"복합탄수 중심"},"proteinRatio":{"value":15,"unit":"%en","note":"식물성 단백"},"fatRatio":{"value":25,"unit":"%en","note":"불포화지방"},"giIndex":{"value":40,"unit":"GI","note":"저GI 원물"},"sodium":{"value":80,"unit":"mg","note":"무첨가"}}}`,
        cGuide: `생식 파우더 제품 — 동결건조·분말 원물 원료만 사용.
- "담체" role은 정제수 대신 귀리분말 또는 현미분말 사용 가능 (주 원료이므로)
- amount 합계: 25-50g (1회 제공량 기준, 물에 타서 섭취)
- 합성 첨가물(이소말툴로스·MCT오일·잔탄검·수크랄로스) 절대 금지
- 허용 원료: 동결건조 채소분말, 곡물분말, 씨앗분말, 해조류분말, 효소, 유산균, 천연 스테비아`,
        cExample: `{"formula":{"ingredients":[{"id":"kale","name":"동결건조케일분말","amount":5,"unit":"g","role":"미량","price":80,"moq":5,"yieldPct":95},{"id":"broc","name":"동결건조브로콜리분말","amount":4,"unit":"g","role":"미량","price":70,"moq":5,"yieldPct":95},{"id":"rice","name":"현미분말","amount":10,"unit":"g","role":"탄수","price":3,"moq":25,"yieldPct":99},{"id":"oat","name":"귀리분말","amount":8,"unit":"g","role":"탄수","price":4,"moq":20,"yieldPct":99},{"id":"flax","name":"아마씨분말","amount":3,"unit":"g","role":"지방","price":12,"moq":10,"yieldPct":98},{"id":"spiru","name":"스피루리나분말","amount":2,"unit":"g","role":"단백","price":50,"moq":3,"yieldPct":97},{"id":"ginger","name":"생강분말","amount":1,"unit":"g","role":"관능","price":15,"moq":5,"yieldPct":98},{"id":"stv","name":"천연스테비아","amount":0.3,"unit":"g","role":"감미","price":200,"moq":1,"yieldPct":100},{"id":"bcgrass","name":"보리새싹분말","amount":3,"unit":"g","role":"미량","price":60,"moq":5,"yieldPct":96},{"id":"enzyme","name":"효소혼합분말","amount":0.5,"unit":"g","role":"안정","price":300,"moq":1,"yieldPct":95}],"flavors":["플레인","그린베리","생강레몬"],"formats":["스틱파우더 30g","파우치 500g"],"roleTargets":{"carb":18,"protein":4,"fat":3,"micro":15},"giIngredientId":"oat","efficacyLabels":{"carb":"저GI 복합탄수","protein":"식물성 단백","fat":"오메가3 지방","micro":"식물영양소"},"efficacyTargets":{"carb":"GI 40 이하 원물 탄수","protein":"스피루리나 완전단백","fat":"아마씨 알파리놀렌산","micro":"케일·브로콜리 파이토케미컬"}},"cost":{"packaging":{"liquidPack":0,"outerBox":150,"shipperBox":100,"label":60,"sterilization":0},"overhead":{"labor":300,"utility":150,"qa":250,"depreciation":150,"logistics":300},"target":{"wholesaleMarkup":1.7,"retailMarkup":2.6,"msrp":38000}}}`,
      };

    case "tea":
      return {
        b1Guide: `차류(티백·침출차·분말차·RTD) 제품이므로 실제 차 원료와 식물성 추출물만 사용하세요.
합성 단백, MCT오일, 이소말툴로스 등 영양 보충제 성격의 원료 금지.
예시 원료: 녹차분말/추출물, 홍차분말, 루이보스, 캐모마일, 라벤더, 히비스커스, 생강추출물, 계피추출물, 발효홍삼농축액, 은행잎추출물`,
        b1Example: `{"ingredients":[{"name":"녹차추출물(카테킨)","evidence":"A","dose":"400mg/일","cost":5,"note":"EGCG 항산화·항염증 RCT"},{"name":"캐모마일추출물(진정)","evidence":"B","dose":"300mg/일","cost":4,"note":"아피게닌 수면·이완 임상근거"},{"name":"루이보스추출물(항산화)","evidence":"B","dose":"200mg/일","cost":3,"note":"아스팔라틴 혈당 조절"},{"name":"생강추출물(소화)","evidence":"A","dose":"250mg/일","cost":3,"note":"진저롤 소화 개선·항염 RCT"},{"name":"계피추출물(혈당)","evidence":"B","dose":"200mg/일","cost":4,"note":"혈당 지수 개선 메타분석"},{"name":"히비스커스추출물(항산화)","evidence":"B","dose":"150mg/일","cost":4,"note":"안토시아닌 혈압 개선"}],"nutritionTarget":{"calories":{"value":10,"unit":"kcal/팩","note":"무/저열량"},"carbRatio":{"value":80,"unit":"%en","note":"천연 당류"},"proteinRatio":{"value":5,"unit":"%en","note":"미량"},"fatRatio":{"value":15,"unit":"%en","note":"미량"},"giIndex":{"value":20,"unit":"GI","note":"저당"},"sodium":{"value":5,"unit":"mg","note":"무첨가"}}}`,
        cGuide: `차류 제품 — 식물성 추출물·분말 원료 사용.
- 1회 제공량: 티백 2-3g / RTD 액상 200-250ml / 분말 3-5g
- amount 합계: 티백 2-4g, 분말 3-6g, RTD는 ml 기준
- 합성 단백·지방·인공감미료 금지, 천연 꿀분말·스테비아는 허용`,
        cExample: `{"formula":{"ingredients":[{"id":"gtea","name":"녹차분말","amount":1.5,"unit":"g","role":"관능","price":30,"moq":10,"yieldPct":99},{"id":"cham","name":"캐모마일분말","amount":0.8,"unit":"g","role":"관능","price":40,"moq":5,"yieldPct":99},{"id":"roos","name":"루이보스분말","amount":0.5,"unit":"g","role":"관능","price":35,"moq":5,"yieldPct":99},{"id":"ging","name":"생강추출물분말","amount":0.2,"unit":"g","role":"미량","price":80,"moq":2,"yieldPct":97},{"id":"cin","name":"계피분말","amount":0.1,"unit":"g","role":"미량","price":20,"moq":5,"yieldPct":99},{"id":"stv","name":"스테비아","amount":0.05,"unit":"g","role":"감미","price":200,"moq":1,"yieldPct":100}],"flavors":["플레인그린","생강레몬","캐모마일"],"formats":["티백 2g×30입","스틱분말 3g×20포","RTD 250ml"],"roleTargets":{"carb":0.5,"protein":0.1,"fat":0.05,"micro":0.3},"giIngredientId":"cin","efficacyLabels":{"carb":"천연 탄수화물","protein":"미량 단백","fat":"미량 지방","micro":"식물 추출물"},"efficacyTargets":{"carb":"자연 감미","protein":"미량","fat":"미량","micro":"카테킨·아피게닌·진저롤"}},"cost":{"packaging":{"liquidPack":0,"outerBox":120,"shipperBox":80,"label":50,"sterilization":0},"overhead":{"labor":200,"utility":100,"qa":150,"depreciation":100,"logistics":200},"target":{"wholesaleMarkup":1.8,"retailMarkup":2.8,"msrp":18000}}}`,
      };

    case "soymilk":
      return {
        b1Guide: `두유류(두유·곡물음료·식물성 밀크) 제품 — 대두·식물성 원료 중심.
합성 분리단백(WPI/WPC 유청) 금지, 대두분리단백(SPI)·완두단백은 허용.
예시 원료: 대두분리단백(SPI), 귀리추출물, 아몬드분말, 현미추출액, 코코넛밀크분말, 칼슘(탄산칼슘), 비타민D, 비타민B12, 이눌린(프리바이오틱)`,
        b1Example: `{"ingredients":[{"name":"대두분리단백SPI(단백)","evidence":"A","dose":"8g/팩","cost":5,"note":"이소플라본·완전단백 RCT"},{"name":"이눌린(프리바이오틱)","evidence":"A","dose":"5g/팩","note":"장내균총 개선 RCT","cost":4},{"name":"귀리추출물(식이섬유)","evidence":"A","dose":"3g/팩","cost":3,"note":"β-글루칸 콜레스테롤 저하"},{"name":"탄산칼슘(칼슘)","evidence":"A","dose":"300mg/팩","cost":2,"note":"골밀도 유지 RCT"},{"name":"비타민D3(미량)","evidence":"A","dose":"10μg/팩","cost":3,"note":"칼슘 흡수 촉진"},{"name":"비타민B12(미량)","evidence":"A","dose":"2.4μg/팩","cost":5,"note":"식물성 식단 보완 필수"}],"nutritionTarget":{"calories":{"value":130,"unit":"kcal/팩","note":"두유류 표준"},"carbRatio":{"value":45,"unit":"%en","note":"천연 탄수"},"proteinRatio":{"value":25,"unit":"%en","note":"식물성 단백"},"fatRatio":{"value":30,"unit":"%en","note":"불포화지방"},"giIndex":{"value":30,"unit":"GI","note":"저GI"},"sodium":{"value":90,"unit":"mg","note":"저나트륨"}}}`,
        cGuide: `두유류 액상 제품 — 200ml 1팩 기준, 식물성 원료 사용.
- 담체: 정제수(주 담체) + 귀리추출액 병용 가능
- 유청단백(WPI/WPC) 금지, 대두분리단백(SPI) 사용`,
        cExample: `{"formula":{"ingredients":[{"id":"spi","name":"대두분리단백SPI","amount":8,"unit":"g","role":"단백","price":6,"moq":25,"yieldPct":98},{"id":"oat","name":"귀리추출물","amount":5,"unit":"g","role":"탄수","price":4,"moq":20,"yieldPct":99},{"id":"inul","name":"이눌린","amount":3,"unit":"g","role":"안정","price":8,"moq":10,"yieldPct":99},{"id":"caco3","name":"탄산칼슘","amount":0.4,"unit":"g","role":"미량","price":2,"moq":10,"yieldPct":100},{"id":"vitd","name":"비타민D3분말","amount":0.002,"unit":"g","role":"미량","price":800,"moq":0.1,"yieldPct":95},{"id":"vitb12","name":"비타민B12분말","amount":0.001,"unit":"g","role":"미량","price":1200,"moq":0.05,"yieldPct":95},{"id":"vanext","name":"바닐라천연향","amount":0.3,"unit":"g","role":"관능","price":100,"moq":1,"yieldPct":100},{"id":"stv","name":"스테비아","amount":0.1,"unit":"g","role":"감미","price":200,"moq":1,"yieldPct":100},{"id":"wtr","name":"정제수","amount":180,"unit":"g","role":"담체","price":0.01,"moq":1000,"yieldPct":100}],"flavors":["오리지널","검은콩","귀리"],"formats":["190ml팩","1000ml","파우치"],"roleTargets":{"carb":15,"protein":8,"fat":4,"micro":0.4},"giIngredientId":"oat","efficacyLabels":{"carb":"귀리 식이섬유","protein":"대두 단백","fat":"불포화지방","micro":"칼슘·비타민D"},"efficacyTargets":{"carb":"β-글루칸 함유","protein":"이소플라본 포함","fat":"리놀레산 중심","micro":"칼슘 300mg/팩"}},"cost":{"packaging":{"liquidPack":200,"outerBox":160,"shipperBox":110,"label":70,"sterilization":180},"overhead":{"labor":350,"utility":200,"qa":250,"depreciation":180,"logistics":280},"target":{"wholesaleMarkup":1.6,"retailMarkup":2.4,"msrp":32000}}}`,
      };

    case "proteinbar":
      return {
        b1Guide: `프로틴바(고단백 바·에너지바) 제품 — 고단백·저당 고형 식품.
예시 원료: 유청단백분리물(WPI), 귀리압착플레이크, 아몬드분쇄물, 다크초콜릿코팅, 이눌린(식이섬유), 해바라기씨, 아가베시럽(천연감미), 코코아분말`,
        b1Example: `{"ingredients":[{"name":"유청단백분리물WPI(단백)","evidence":"A","dose":"20g/바","cost":12,"note":"BCAA 풍부·근합성 촉진 RCT"},{"name":"귀리압착플레이크(탄수)","evidence":"A","dose":"15g/바","cost":2,"note":"저GI β-글루칸"},{"name":"이눌린(식이섬유)","evidence":"A","dose":"5g/바","cost":5,"note":"프리바이오틱 장건강"},{"name":"아몬드분쇄물(지방)","evidence":"B","dose":"8g/바","cost":8,"note":"단일불포화지방·비타민E"},{"name":"류신(아미노산)","evidence":"A","dose":"3g/바","cost":20,"note":"근단백합성 트리거 임계량"},{"name":"비타민D3(미량)","evidence":"A","dose":"10μg/바","cost":3,"note":"근기능·면역 지원"}],"nutritionTarget":{"calories":{"value":220,"unit":"kcal/바","note":"고단백 에너지바"},"carbRatio":{"value":35,"unit":"%en","note":"저당 탄수"},"proteinRatio":{"value":40,"unit":"%en","note":"고단백 목표"},"fatRatio":{"value":25,"unit":"%en","note":"건강지방"},"giIndex":{"value":38,"unit":"GI","note":"저GI"},"sodium":{"value":120,"unit":"mg","note":"저나트륨"}}}`,
        cGuide: `프로틴바 고형 제품 — 1바 45-60g 기준.
- "담체" role은 귀리플레이크 또는 아몬드버터 사용 (정제수 불필요)
- amount 합계: 45-60g
- 합성 색소·아스파탐 금지`,
        cExample: `{"formula":{"ingredients":[{"id":"wpi","name":"유청단백분리물WPI","amount":20,"unit":"g","role":"단백","price":12,"moq":25,"yieldPct":98},{"id":"oatf","name":"귀리압착플레이크","amount":12,"unit":"g","role":"탄수","price":2,"moq":50,"yieldPct":100},{"id":"almond","name":"아몬드분쇄물","amount":8,"unit":"g","role":"지방","price":8,"moq":10,"yieldPct":99},{"id":"inul","name":"이눌린","amount":4,"unit":"g","role":"안정","price":5,"moq":10,"yieldPct":99},{"id":"leu","name":"류신","amount":2,"unit":"g","role":"미량","price":25,"moq":5,"yieldPct":100},{"id":"cacao","name":"코코아분말","amount":3,"unit":"g","role":"관능","price":10,"moq":5,"yieldPct":99},{"id":"agave","name":"아가베시럽분말","amount":3,"unit":"g","role":"감미","price":15,"moq":5,"yieldPct":99},{"id":"almbase","name":"아몬드버터","amount":5,"unit":"g","role":"담체","price":10,"moq":10,"yieldPct":99}],"flavors":["초코","바닐라아몬드","땅콩버터"],"formats":["45g 바","60g 바"],"roleTargets":{"carb":15,"protein":20,"fat":8,"micro":2},"giIngredientId":"oatf","efficacyLabels":{"carb":"저GI 귀리","protein":"WPI 고순도","fat":"아몬드 단일불포화","micro":"류신·비타민D"},"efficacyTargets":{"carb":"GI 38 이하","protein":"BCAA 함량 5g+","fat":"오메가9 중심","micro":"류신 3g 근합성 임계"}},"cost":{"packaging":{"liquidPack":0,"outerBox":130,"shipperBox":90,"label":60,"sterilization":0},"overhead":{"labor":400,"utility":200,"qa":280,"depreciation":200,"logistics":320},"target":{"wholesaleMarkup":1.7,"retailMarkup":2.5,"msrp":42000}}}`,
      };

    case "proteinshake":
      return {
        b1Guide: `프로틴쉐이크(WPI·WPC·식물성 단백 분말) 제품 — 고단백 파우더/RTD.
예시 원료: 유청단백분리물(WPI), 완두단백분리물(PPI), 이소말툴로스(저GI 탄수), MCT오일분말, BCAA믹스, 류신, 크레아틴, 비타민D3, 마그네슘`,
        b1Example: `{"ingredients":[{"name":"유청단백분리물WPI(단백)","evidence":"A","dose":"25g/회","cost":12,"note":"근합성 최우선 단백 RCT"},{"name":"이소말툴로스(저GI탄수)","evidence":"A","dose":"15g/회","cost":5,"note":"혈당 완만 상승 임상"},{"name":"MCT오일분말(에너지)","evidence":"B","dose":"5g/회","cost":8,"note":"빠른 에너지 산화"},{"name":"류신(아미노산)","evidence":"A","dose":"3g/회","cost":25,"note":"mTOR 활성·근합성 트리거"},{"name":"크레아틴모노(근지구력)","evidence":"A","dose":"3g/회","cost":4,"note":"운동능력 향상 메타분석"},{"name":"비타민D3(미량)","evidence":"A","dose":"10μg/회","cost":3,"note":"근기능·테스토스테론 지원"}],"nutritionTarget":{"calories":{"value":180,"unit":"kcal/회","note":"스포츠 영양"},"carbRatio":{"value":30,"unit":"%en","note":"저GI 탄수"},"proteinRatio":{"value":55,"unit":"%en","note":"고단백"},"fatRatio":{"value":15,"unit":"%en","note":"MCT"},"giIndex":{"value":32,"unit":"GI","note":"이소말툴로스 기반"},"sodium":{"value":150,"unit":"mg","note":"전해질 보충"}}}`,
        cGuide: `프로틴쉐이크 파우더 — 1스쿱 30-40g 기준.
- 담체: 정제수(RTD) 또는 없음(파우더)
- amount 합계: 파우더 30-40g`,
        cExample: `{"formula":{"ingredients":[{"id":"wpi","name":"유청단백분리물WPI","amount":25,"unit":"g","role":"단백","price":12,"moq":25,"yieldPct":98},{"id":"iso","name":"이소말툴로스","amount":8,"unit":"g","role":"탄수","price":5,"moq":50,"yieldPct":99},{"id":"mct","name":"MCT오일분말","amount":3,"unit":"g","role":"지방","price":8,"moq":10,"yieldPct":99},{"id":"leu","name":"류신","amount":2,"unit":"g","role":"미량","price":25,"moq":5,"yieldPct":100},{"id":"crt","name":"크레아틴모노하이드레이트","amount":3,"unit":"g","role":"미량","price":4,"moq":25,"yieldPct":100},{"id":"vitd","name":"비타민D3분말","amount":0.002,"unit":"g","role":"미량","price":800,"moq":0.1,"yieldPct":95},{"id":"vanf","name":"바닐라향","amount":0.5,"unit":"g","role":"관능","price":80,"moq":2,"yieldPct":100},{"id":"stv","name":"스테비아","amount":0.1,"unit":"g","role":"감미","price":200,"moq":1,"yieldPct":100}],"flavors":["초코","바닐라","딸기","무향"],"formats":["스쿱파우더 900g","RTD 250ml"],"roleTargets":{"carb":8,"protein":25,"fat":3,"micro":5},"giIngredientId":"iso","efficacyLabels":{"carb":"저GI 이소말툴로스","protein":"WPI 순도 90%+","fat":"MCT 에너지","micro":"류신·크레아틴·비타민D"},"efficacyTargets":{"carb":"GI 32 혈당 안정","protein":"BCAA 6g+ 근합성","fat":"MCT 빠른 산화","micro":"류신 3g mTOR 활성"}},"cost":{"packaging":{"liquidPack":0,"outerBox":200,"shipperBox":140,"label":80,"sterilization":0},"overhead":{"labor":350,"utility":180,"qa":280,"depreciation":180,"logistics":300},"target":{"wholesaleMarkup":1.6,"retailMarkup":2.4,"msrp":55000}}}`,
      };

    case "fsmp":
    default:
      return {
        b1Guide: `특수의료용도식품(FSMP) 또는 기능성 식품 — 임상 근거 기반 원료 사용.
예시 원료: 유청단백분리물(WPI), 이소말툴로스, MCT오일, 비타민D3, 아연, 셀레늄, 오메가3(EPA/DHA)`,
        b1Example: `{"ingredients":[{"name":"유청단백분리물WPI(단백)","evidence":"A","dose":"20g/팩","cost":12,"note":"근감소 예방 RCT"},{"name":"이소말툴로스(저GI탄수)","evidence":"A","dose":"15g/팩","cost":5,"note":"혈당 안정 임상"},{"name":"MCT오일(에너지)","evidence":"B","dose":"5g/팩","cost":8,"note":"빠른 에너지 공급"},{"name":"비타민D3(면역)","evidence":"A","dose":"15μg/팩","cost":3,"note":"면역·근기능 RCT"},{"name":"아연(미량)","evidence":"A","dose":"8mg/팩","cost":4,"note":"면역·상처 치유"},{"name":"셀레늄(항산화)","evidence":"B","dose":"55μg/팩","cost":5,"note":"항산화·갑상선 기능"}],"nutritionTarget":{"calories":{"value":200,"unit":"kcal/팩","note":"FSMP 표준"},"carbRatio":{"value":45,"unit":"%en","note":"저GI"},"proteinRatio":{"value":22,"unit":"%en","note":"고단백"},"fatRatio":{"value":33,"unit":"%en","note":"MCT포함"},"giIndex":{"value":45,"unit":"GI","note":"저GI"},"sodium":{"value":150,"unit":"mg","note":"제한"}}}`,
        cGuide: `FSMP 또는 기능성 식품 액상 — 200ml 1팩 기준.
- 담체: 정제수 필수`,
        cExample: `{"formula":{"ingredients":[{"id":"wpi","name":"유청단백분리물WPI","amount":20,"unit":"g","role":"단백","price":12,"moq":25,"yieldPct":98},{"id":"iso","name":"이소말툴로스","amount":15,"unit":"g","role":"탄수","price":5,"moq":50,"yieldPct":99},{"id":"mct","name":"MCT오일","amount":5,"unit":"g","role":"지방","price":8,"moq":20,"yieldPct":99},{"id":"vitd","name":"비타민D3분말","amount":0.002,"unit":"g","role":"미량","price":800,"moq":0.1,"yieldPct":95},{"id":"zinc","name":"아연(글루콘산아연)","amount":0.06,"unit":"g","role":"미량","price":50,"moq":0.5,"yieldPct":98},{"id":"xgm","name":"잔탄검","amount":0.3,"unit":"g","role":"안정","price":15,"moq":5,"yieldPct":99},{"id":"vanf","name":"바닐라향","amount":0.5,"unit":"g","role":"관능","price":80,"moq":2,"yieldPct":100},{"id":"suc","name":"수크랄로스","amount":0.02,"unit":"g","role":"감미","price":500,"moq":0.5,"yieldPct":100},{"id":"wtr","name":"정제수","amount":160,"unit":"g","role":"담체","price":0.01,"moq":1000,"yieldPct":100}],"flavors":["바닐라","무향","딸기"],"formats":["액상팩 200ml"],"roleTargets":{"carb":15,"protein":20,"fat":5,"micro":0.1},"giIngredientId":"iso","efficacyLabels":{"carb":"저GI 탄수","protein":"근육 단백","fat":"MCT 에너지","micro":"비타민·미네랄"},"efficacyTargets":{"carb":"GI 45 이하","protein":"BCAA 포함","fat":"MCT 빠른 산화","micro":"비타민D 15μg"}},"cost":{"packaging":{"liquidPack":250,"outerBox":180,"shipperBox":120,"label":80,"sterilization":200},"overhead":{"labor":400,"utility":250,"qa":300,"depreciation":200,"logistics":350},"target":{"wholesaleMarkup":1.6,"retailMarkup":2.4,"msrp":45000}}}`,
      };
  }
}

// ---------- Call B1: target.ingredients + nutritionTarget ----------
async function generatePartB1(env: LlmEnv, brief: ConfirmedBrief) {
  const guide = getProductTypeIngredientGuide(brief.productType || "fsmp");
  const prompt = `브리프: ${briefDescription(brief)}

아래 제품군 원료 가이드를 엄격히 따라 기능성 원료 6개와 영양 목표치를 JSON으로만 출력하세요.

[제품군 원료 가이드]
${guide.b1Guide}

[출력 스키마 예시 — 실제 브리프 조건에 맞는 원료로 교체]
${guide.b1Example}`;
  return callJsonLlm(env, prompt, 900);
}

// ---------- Call B2: papers(×5) ----------
// nutritionCompare는 B1의 nutritionTarget에서 buildNutritionCompare()로 자동 생성하므로
// B2는 논문 5개만 생성한다 (토큰 절감 + 오류 원인 제거).
async function generatePartB2(env: LlmEnv, brief: ConfirmedBrief) {
  const prompt = `브리프: ${briefDescription(brief)}

관련 임상 논문 5개를 아래 스키마로 채워 JSON 하나만 출력하세요(가짜 PMID 금지, AI 요약 근거 사용).

{"papers":[{"title":"영문제목","journal":"저널","year":2022,"n":"n=120","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2021,"n":"n=80","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2020,"n":"n=60","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2023,"n":"n=150","effect":"결과","key":"핵심"},{"title":"영문제목","journal":"저널","year":2019,"n":"n=90","effect":"결과","key":"핵심"}]}`;
  return callJsonLlm(env, prompt, 600);
}

// ---------- nutritionTarget → nutritionCompare 자동 변환 ----------
// B1이 생성한 영양기준(nutritionTarget)을 STEP1 "주요 영양 조성 비교" 차트용 배열로 변환.
// - our: 설계 목표값 (B1의 target value)
// - avg: 경쟁 평균 (제품군별 합리적 추정치, UI 비교 기준점)
// - target: 권고값 (동일하게 설계 목표값으로 표시)
// - max: 차트 스케일 최대값
// - inverse: 낮을수록 좋은 지표(나트륨, GI 등)
function buildNutritionCompare(nutritionTarget: any): any[] {
  if (!nutritionTarget || !Object.keys(nutritionTarget).length) return [];
  const nt = nutritionTarget;
  const result: any[] = [];

  // 칼로리 (kcal)
  const cal = nt.calories?.value;
  if (typeof cal === "number") {
    result.push({ label: "칼로리 (kcal)", our: cal, avg: Math.round(cal * 1.2), target: cal, max: Math.round(cal * 1.6), inverse: false });
  }

  // 단백질: proteinRatio%en → g (cal * ratio/100 / 4)
  const proteinRatio = nt.proteinRatio?.value;
  if (typeof cal === "number" && typeof proteinRatio === "number") {
    const proteinG = Math.round((cal * proteinRatio / 100) / 4);
    const avgProteinG = Math.max(1, Math.round(proteinG * 0.75));
    result.push({ label: "단백질 (g)", our: proteinG, avg: avgProteinG, target: proteinG, max: Math.round(proteinG * 1.8), inverse: false });
  }

  // 탄수화물: carbRatio%en → g
  const carbRatio = nt.carbRatio?.value;
  if (typeof cal === "number" && typeof carbRatio === "number") {
    const carbG = Math.round((cal * carbRatio / 100) / 4);
    const avgCarbG = Math.round(carbG * 1.15);
    result.push({ label: "탄수화물 (g)", our: carbG, avg: avgCarbG, target: carbG, max: Math.round(carbG * 1.5), inverse: false });
  }

  // 지방: fatRatio%en → g
  const fatRatio = nt.fatRatio?.value;
  if (typeof cal === "number" && typeof fatRatio === "number") {
    const fatG = +((cal * fatRatio / 100) / 9).toFixed(1);
    const avgFatG = +((fatG * 1.1)).toFixed(1);
    result.push({ label: "지방 (g)", our: fatG, avg: avgFatG, target: fatG, max: +(fatG * 1.8).toFixed(1), inverse: false });
  }

  // GI 지수 (낮을수록 좋음)
  const gi = nt.giIndex?.value;
  if (typeof gi === "number") {
    const avgGi = Math.round(gi * 1.4);
    result.push({ label: "GI 지수", our: gi, avg: avgGi, target: gi, max: 100, inverse: true });
  }

  // 나트륨 (낮을수록 좋음)
  const sodium = nt.sodium?.value;
  if (typeof sodium === "number") {
    const avgSodium = Math.round(sodium * 1.4);
    result.push({ label: "나트륨 (mg)", our: sodium, avg: avgSodium, target: sodium, max: Math.round(sodium * 2.2), inverse: true });
  }

  return result;
}

// ---------- Call C: formula ingredients + cost ----------
// nutritionTarget(B1 산출물)을 필수 인자로 받아 배합 설계가 STEP2 영양기준을 실제로 따르도록 강제한다.
// (이전엔 B1/C가 Promise.all로 완전 병렬 실행되어 C가 B1 결과를 전혀 참조하지 못했음 — 구조적 버그)
function buildNutritionTargetBlock(nutritionTarget: any): string {
  if (!nutritionTarget || !Object.keys(nutritionTarget).length) return "";
  const nt = nutritionTarget;
  const calories = nt.calories?.value;
  const carbRatio = nt.carbRatio?.value;
  const proteinRatio = nt.proteinRatio?.value;
  const fatRatio = nt.fatRatio?.value;
  const giIndex = nt.giIndex?.value;
  const sodium = nt.sodium?.value;

  // 목표 칼로리·비율로부터 목표 g수를 역산해 LLM에게 구체적 숫자 타깃을 제공
  const carbG = typeof calories === "number" && typeof carbRatio === "number" ? +((calories * carbRatio / 100) / 4).toFixed(1) : null;
  const proteinG = typeof calories === "number" && typeof proteinRatio === "number" ? +((calories * proteinRatio / 100) / 4).toFixed(1) : null;
  const fatG = typeof calories === "number" && typeof fatRatio === "number" ? +((calories * fatRatio / 100) / 9).toFixed(1) : null;

  return `
[필수 준수 — STEP2(영양기준설정)에서 이미 확정된 영양 목표치. 배합은 반드시 이 수치에 맞춰 설계할 것]
- 목표 칼로리: ${calories ?? "미정"}${nt.calories?.unit || "kcal"}
- 목표 탄수화물 비율: ${carbRatio ?? "미정"}%en${carbG !== null ? ` → 탄수 role 원료 amount 합계 ≈ ${carbG}g` : ""}
- 목표 단백질 비율: ${proteinRatio ?? "미정"}%en${proteinG !== null ? ` → 단백 role 원료 amount 합계 ≈ ${proteinG}g` : ""}
- 목표 지방 비율: ${fatRatio ?? "미정"}%en${fatG !== null ? ` → 지방 role 원료 amount 합계 ≈ ${fatG}g` : ""}
- 목표 GI: ${giIndex ?? "미정"} 이하가 되도록 giIngredientId 원료 비중 조정
- 목표 나트륨: ${sodium ?? "미정"}mg 이내

위 목표 g수는 참고 기준선이며, 원료별 amount를 이 목표에 최대한 수렴하도록 설계하세요(±10% 이내 권장).
목표치와 실제 설계값이 크게 어긋나는 경우, 그 사유를 각 원료 note에 짧게 남기세요.`;
}

async function generatePartC(env: LlmEnv, brief: ConfirmedBrief, nutritionTarget?: any) {
  const guide = getProductTypeIngredientGuide(brief.productType || "fsmp");
  const targetBlock = buildNutritionTargetBlock(nutritionTarget);
  const prompt = `브리프: ${briefDescription(brief)}

아래 제품군 배합 가이드를 엄격히 따라 배합 원료(8-12개)와 원가 구조를 JSON으로만 출력하세요.

[제품군 배합 가이드]
${guide.cGuide}
${targetBlock}

공통 규칙:
- id: 3-6자 영문소문자 고유코드 (중복 금지)
- role: 반드시 "탄수"|"단백"|"지방"|"미량"|"안정"|"감미"|"관능"|"담체" 중 하나
- giIngredientId: ingredients 배열의 실제 id 값과 정확히 일치
- price: 원료 1g당 원화 단가 ₩/g (소수 허용 — 예: 귀리분말=4, WPI=12, 비타민D=800, 스테비아=200)
- 브리프의 건강이슈·생애주기에 맞는 원료로 교체

[출력 스키마 예시 — 실제 브리프 조건에 맞게 교체]
${guide.cExample}`;
  return callJsonLlm(env, prompt, 1100);
}

function buildEfficacyClaims(formula: any) {
  const rt = formula.roleTargets || { carb: 25, protein: 12, fat: 6, micro: 1.2 };
  const labels = formula.efficacyLabels || {};
  const targets = formula.efficacyTargets || {};
  return [
    { label: labels.carb || "탄수화물 대사 관리", target: targets.carb || "저GI 원료 중심 설계", parts: [{ role: "탄수", divisor: rt.carb || 25, weight: 100 }] },
    { label: labels.protein || "근육·단백질 보충", target: targets.protein || "고품질 단백 공급", parts: [{ role: "단백", divisor: rt.protein || 12, weight: 100 }] },
    { label: labels.fat || "지질 관리", target: targets.fat || "불포화 지방 중심 설계", parts: [{ role: "지방", divisor: rt.fat || 6, weight: 100 }] },
    { label: labels.micro || "미량영양소 강화", target: targets.micro || "비타민·미네랄 보강", parts: [{ role: "미량", divisor: rt.micro || 1.2, weight: 100 }] },
  ];
}

export interface GeneratedDataset {
  product: any;
  market: any;
  competitors: any[];
  reviews: any;
  concept: any;
  target: any;
  nutritionCompare: any[];
  formula: any;
  cost: any;
  generated: true;
}

// 네이버 API 환경변수를 포함한 확장 env 타입
export type DatasetEnv = LlmEnv & Partial<NaverEnv>;

export async function generateProductDataset(env: DatasetEnv, brief: ConfirmedBrief): Promise<GeneratedDataset> {
  // 네이버 API 키가 있으면 실제 소비자 인사이트 병렬 수집
  const naverEnv: NaverEnv | null =
    env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET
      ? { NAVER_CLIENT_ID: env.NAVER_CLIENT_ID, NAVER_CLIENT_SECRET: env.NAVER_CLIENT_SECRET }
      : null;

  const a1Err: string[] = [];

  // B1(영양기준)을 먼저 확정한 뒤 그 결과를 C(배합·원가) 프롬프트에 주입해야
  // "배합이 영양기준을 실제로 반영"하게 됨 — 완전 병렬(Promise.all)로 두면
  // C가 B1의 목표치를 전혀 모른 채 독립적으로 원료를 설계해버리는 구조적 문제가 있었음.
  // 단, 전체 응답 지연을 최소화하기 위해 B1과 무관한 나머지 호출(A0~A3, B2, 네이버)은
  // B1을 기다리지 않고 즉시 병렬로 시작한다. C만 B1 완료 후 시작(사실상 B1 + C 두 콜만 순차).
  const a0Promise = generatePartA0(env, brief).catch((e) => { a1Err.push(`A0:${e?.message?.slice(0,100)}`); return {}; });
  const a1Promise = generatePartA1(env, brief).catch((e) => { a1Err.push(`A1:${e?.message?.slice(0,100)}`); return {}; });
  const a2Promise = generatePartA2(env, brief).catch((e) => { a1Err.push(`A2:${e?.message?.slice(0,100)}`); return {}; });
  const a2bPromise = generatePartA2b(env, brief).catch((e) => { a1Err.push(`A2b:${e?.message?.slice(0,100)}`); return {}; });
  const a3Promise = generatePartA3(env, brief).catch((e) => { a1Err.push(`A3:${e?.message?.slice(0,100)}`); return {}; });
  const b2Promise = generatePartB2(env, brief).catch((e) => { a1Err.push(`B2:${e?.message?.slice(0,100)}`); return {}; });
  const naverPromise = naverEnv
    ? fetchConsumerInsights(naverEnv, env, brief.condition).catch(() => null)
    : Promise.resolve(null);

  const b1: any = await generatePartB1(env, brief).catch((e) => { a1Err.push(`B1:${e?.message?.slice(0,100)}`); return {}; });
  const cPromise = generatePartC(env, brief, b1?.nutritionTarget).catch((e) => { a1Err.push(`C:${e?.message?.slice(0,100)}`); return {}; });

  const [a0, a1, a2, a2b, a3, b2, c, naverInsights] = await Promise.all([
    a0Promise, a1Promise, a2Promise, a2bPromise, a3Promise, b2Promise, cPromise, naverPromise,
  ]);
  // A1 + A2(competitors) + A2b(reviews) + A3(concept) 병합
  const a = { ...a1, ...a2, reviews: a2b, concept: (a3 as any).concept || undefined };
  // B1(ingredients+nutritionTarget) + B2(papers) 병합
  // nutritionCompare는 B1의 nutritionTarget에서 자동 생성(buildNutritionCompare) — LLM별도 호출 불필요
  const b2PapersOk = Array.isArray(b2.papers) && b2.papers.length > 0;
  const b = {
    target: (b1.ingredients || b1.nutritionTarget)
      ? {
          papersSearchNote: b2PapersOk ? "AI 문헌 요약 기반" : "논문 검색 실패 · 잠시 후 재생성 필요",
          papers: b2.papers || [],
          ingredients: b1.ingredients || [],
          nutritionTarget: b1.nutritionTarget || {},
        }
      : null,
    // B1의 nutritionTarget에서 직접 생성 — B2가 별도로 만들던 nutritionCompare 대체
    nutritionCompare: buildNutritionCompare(b1.nutritionTarget || {}),
  };
  if (a1Err.length) console.error("[dataset_generate] LLM errors:", a1Err.join(" | "));

  const rawIngredients = Array.isArray(c.formula?.ingredients) && c.formula.ingredients.length
    ? c.formula.ingredients
    : getFallbackIngredients(brief.productType);

  // price 단위 안전망: AI가 ₩/kg으로 잘못 생성한 경우 /1000 자동 변환
  // 담체(정제수 등) 제외, 일반 원료에서 price > 2000이면 ₩/kg으로 판단
  const nonCarrierPrices = rawIngredients
    .filter((i: any) => i.role !== "담체" && i.role !== "안정" && typeof i.price === "number")
    .map((i: any) => i.price);
  const medianPrice = nonCarrierPrices.length
    ? nonCarrierPrices.slice().sort((a: number, b: number) => a - b)[Math.floor(nonCarrierPrices.length / 2)]
    : 0;
  const priceScaleFactor = medianPrice > 2000 ? 1 / 1000 : 1; // ₩/kg → ₩/g

  const ingredients = rawIngredients.map((i: any) => ({
    ...i,
    price: typeof i.price === "number" ? +(i.price * priceScaleFactor).toFixed(4) : i.price,
  }));
  const giIngredientId = ingredients.some((i: any) => i.id === c.formula?.giIngredientId)
    ? c.formula.giIngredientId
    : (ingredients.find((i: any) => i.role === "탄수")?.id || ingredients[0]?.id);

  const formula = {
    servingSize: 200,
    servingsPerBox: 24,
    kcalPerServing: b.target?.nutritionTarget?.calories?.value || 200,
    giBaseline: 75,
    giIngredientId,
    giWeight: 45,
    ingredients,
    flavors: Array.isArray(c.formula?.flavors) && c.formula.flavors.length ? c.formula.flavors : ["기본", "무향"],
    formats: Array.isArray(c.formula?.formats) && c.formula.formats.length ? c.formula.formats : ["액상팩 200ml"],
    efficacyClaims: buildEfficacyClaims(c.formula || {}),
  };

  // brief.productType을 product 객체에 항상 주입 — LLM이 category를 자의적으로 쓰더라도
  // UI는 productType + PRODUCT_TYPE_META 기준으로만 표시한다
  const ptMeta = brief.productType ? PRODUCT_TYPE_META[brief.productType] : null;
  const productOverride = {
    ...(brief.productType ? { productType: brief.productType } : {}),
    ...(ptMeta        ? { categoryLabel: ptMeta.label }  : {}),
  };

  return {
    product: { ...FALLBACK_PRODUCT, ...a.product, ...productOverride },
    market: {
      ...FALLBACK_MARKET,
      ...a.market,
      // context: A0(별도 소형 콜) 우선 → A1 포함값 → FALLBACK 순으로 병합
      // A0가 {prevalence, unmet, policy} 직접 반환하므로 spread로 덮음
      context: {
        ...FALLBACK_MARKET.context,
        ...(a.market?.context ?? {}),
        ...(a0 as any),   // A0 결과가 {prevalence,unmet,policy} 형태
      },
    },
    competitors: Array.isArray(a.competitors) && a.competitors.length ? a.competitors : FALLBACK_COMPETITORS,
    // reviews: 네이버 실시간 > A2b(LLM 분리 호출) > a.reviews > FALLBACK
    reviews: naverInsights?.reviews ?? (a.reviews?.positive && a.reviews?.negative ? a.reviews : FALLBACK_REVIEWS),
    concept: naverInsights
      ? {
          sourceKey: naverInsights.sourceKey,
          sourceLabel: naverInsights.sourceLabel,
          sourceNote: naverInsights.sourceNote,
          sampleBadge: naverInsights.sampleBadge,
          trendSummary: naverInsights.trendSummary,
          shoppingSummary: naverInsights.shoppingSummary,
          topics: naverInsights.topics,
          painPoints: naverInsights.painPoints,
          pod: naverInsights.pod,
          podBold: naverInsights.podBold,
          conclusion: naverInsights.conclusion,
          conclusionBold: naverInsights.conclusionBold,
        }
      : a.concept?.topics
        ? { sourceKey: "ai_generated", sourceLabel: "AI 생성 · 미검증", sourceNote: "AI 생성", sampleBadge: "AI 생성 예시", ...a.concept }
        : FALLBACK_CONCEPT,
    target: b.target ? { ...b.target, papers: (b.target.papers || []).map((p: any) => ({ ...p, sourceKey: "ai_generated" })), ingredients: (b.target.ingredients || []).map((i: any) => ({ ...i, sourceKey: "ai_generated" })) } : FALLBACK_TARGET,
    nutritionCompare: b.nutritionCompare.length ? b.nutritionCompare : FALLBACK_NUTRITION_COMPARE,
    formula,
    cost: c.cost || FALLBACK_COST,
    generated: true,
  };
}

// ---------- 폴백 기본값 (LLM 실패 시에만 사용, 화면이 비지 않도록) ----------
const FALLBACK_PRODUCT = {
  codename: "PHYTO-X v0.1", tagline: "브리프 맞춤 기능성 제품", target: "맞춤 타깃",
  format: "제형 미정", category: "기능성 제품", subcategory: "-", regClass: "미정",
  targetPrice: 39000, targetEvidenceStrength: 8.0,
  positioningSpec: "AI 생성 실패 · 기본값", positioningClaim: "-", positioningRating: 4.5, positioningChannel: "온라인 D2C",
};
const FALLBACK_MARKET = {
  headerTitle: "브리프 맞춤 시장", headerDesc: "데이터 생성 실패 · 기본값 표시 중",
  domestic: { size: 3000, unit: "억원", cagr: 10, year: 2024, cagrNote: "추정치" },
  global: { size: 10, unit: "십억USD", cagr: 6, year: 2025 },
  channels: [{ name: "온라인 D2C", share: 40, cac: "중간" }, { name: "약국·H&B", share: 30, cac: "중간" }, { name: "병원", share: 20, cac: "낮음" }, { name: "마트", share: 10, cac: "높음" }],
  context: { prevalence: "타깃 인구 규모 데이터 로드 중", unmet: "시장 분석 데이터 준비 중", policy: "규제·정책 동향 준비 중" },
};
const FALLBACK_COMPETITORS = [1, 2, 3, 4, 5].map((n) => ({ brand: `경쟁사 ${n}`, format: "-", key: "-", price: 35000 + n * 2000, size: "-", claim: "-", rating: 4.2, reviews: 1000 * n, channel: "온라인", evidenceStrength: 5 + n * 0.3 }));
const FALLBACK_REVIEWS = {
  positive: [{ t: "만족", w: 30 }, { t: "효과 체감", w: 25 }, { t: "편의성", w: 20 }],
  negative: [{ t: "가격 부담", w: 25 }, { t: "맛 아쉬움", w: 20 }],
};
const FALLBACK_CONCEPT = {
  sourceKey: "ai_generated", sourceLabel: "AI 생성 · 미검증",
  sourceNote: "데이터 생성 실패 · 기본값 표시 중", sampleBadge: "기본값",
  topics: [{ id: "A", name: "토픽 A", docs: 1, totalDocs: 1, color: "us", kws: [{ t: "데이터 없음", w: 50 }] }],
  painPoints: [{ label: "-", text: "데이터 생성 실패" }],
  pod: "데이터 생성에 실패했습니다.", podBold: [],
  conclusion: "데이터 생성에 실패했습니다.", conclusionBold: [],
};
const FALLBACK_TARGET = {
  papersSearchNote: "AI 생성 실패 · 기본값", papers: [],
  ingredients: [{ name: "기본 원료", evidence: "C", dose: "-", cost: 3, sourceKey: "ai_generated", note: "AI 생성 실패" }],
  nutritionTarget: {
    calories: { value: 200, unit: "kcal", note: "-" }, carbRatio: { value: 45, unit: "%en", note: "-" },
    proteinRatio: { value: 20, unit: "%en", note: "-" }, fatRatio: { value: 35, unit: "%en", note: "-" },
    giIndex: { value: 40, unit: "GI", note: "-" }, sodium: { value: 200, unit: "mg", note: "-" },
  },
};
const FALLBACK_NUTRITION_COMPARE = buildNutritionCompare({
  calories:     { value: 200, unit: "kcal" },
  proteinRatio: { value: 20, unit: "%en" },
  carbRatio:    { value: 45, unit: "%en" },
  fatRatio:     { value: 35, unit: "%en" },
  giIndex:      { value: 55, unit: "GI" },
  sodium:       { value: 180, unit: "mg" },
});
// 제품군별 폴백 원료 — AI Call C 실패 시 사용. 추상적 "기본 원료" 대신 실제 원료명 사용.
const FALLBACK_INGREDIENTS_BY_TYPE: Record<string, any[]> = {
  fsmp: [
    { id: "iso",  name: "이소말툴로스 (저GI 탄수)",     amount: 22, unit: "g", role: "탄수", price: 8,   moq: 100, yieldPct: 99 },
    { id: "rmd",  name: "저항성 말토덱스트린 (식이섬유)", amount: 6,  unit: "g", role: "탄수", price: 12,  moq: 50,  yieldPct: 99 },
    { id: "wpi",  name: "유청단백질 분리물 (WPI 90%)",   amount: 10, unit: "g", role: "단백", price: 35,  moq: 25,  yieldPct: 97 },
    { id: "cas",  name: "카제인 나트륨",                 amount: 3,  unit: "g", role: "단백", price: 22,  moq: 25,  yieldPct: 98 },
    { id: "mufa", name: "고올레산 해바라기유 (MUFA)",     amount: 6,  unit: "g", role: "지방", price: 14,  moq: 100, yieldPct: 99 },
    { id: "mct",  name: "MCT 오일 (C8·C10)",             amount: 2,  unit: "g", role: "지방", price: 45,  moq: 20,  yieldPct: 99 },
    { id: "vm",   name: "비타민·미네랄 프리믹스 (26종)", amount: 1.2, unit: "g", role: "미량", price: 220, moq: 5,   yieldPct: 98 },
    { id: "emul", name: "레시틴 (유화안정제)",            amount: 0.8, unit: "g", role: "안정", price: 18,  moq: 50,  yieldPct: 100 },
    { id: "flav", name: "바닐라 천연향",                  amount: 0.3, unit: "g", role: "관능", price: 320, moq: 20,  yieldPct: 100 },
    { id: "sw",   name: "수크랄로스",                     amount: 0.05, unit: "g", role: "감미", price: 850, moq: 5,  yieldPct: 100 },
    { id: "wat",  name: "정제수 (담체)",                  amount: 148.6, unit: "g", role: "담체", price: 0.5, moq: 1000, yieldPct: 100 },
  ],
  proteinshake: [
    { id: "wpi",  name: "유청단백질 분리물 (WPI 90%)",   amount: 25, unit: "g", role: "단백", price: 12,  moq: 25,  yieldPct: 98 },
    { id: "iso",  name: "이소말툴로스 (저GI 탄수)",      amount: 8,  unit: "g", role: "탄수", price: 5,   moq: 50,  yieldPct: 99 },
    { id: "mct",  name: "MCT 오일분말",                  amount: 3,  unit: "g", role: "지방", price: 8,   moq: 10,  yieldPct: 99 },
    { id: "leu",  name: "류신 (아미노산)",                amount: 2,  unit: "g", role: "미량", price: 25,  moq: 5,   yieldPct: 100 },
    { id: "crt",  name: "크레아틴 모노하이드레이트",     amount: 3,  unit: "g", role: "미량", price: 4,   moq: 25,  yieldPct: 100 },
    { id: "vitd", name: "비타민D3 분말",                 amount: 0.002, unit: "g", role: "미량", price: 800, moq: 0.1, yieldPct: 95 },
    { id: "vanf", name: "바닐라 천연향",                  amount: 0.5, unit: "g", role: "관능", price: 80,  moq: 2,   yieldPct: 100 },
    { id: "stv",  name: "스테비아",                       amount: 0.1, unit: "g", role: "감미", price: 200, moq: 1,   yieldPct: 100 },
    { id: "wat",  name: "정제수 (담체)",                  amount: 155, unit: "g", role: "담체", price: 0.5, moq: 1000, yieldPct: 100 },
  ],
  proteinbar: [
    { id: "wpi",    name: "유청단백질 분리물 (WPI 90%)", amount: 20, unit: "g", role: "단백", price: 12, moq: 25, yieldPct: 98 },
    { id: "oatf",   name: "귀리 압착플레이크",           amount: 12, unit: "g", role: "탄수", price: 2,  moq: 50, yieldPct: 100 },
    { id: "almond", name: "아몬드 분쇄물",                amount: 8,  unit: "g", role: "지방", price: 8,  moq: 10, yieldPct: 99 },
    { id: "inul",   name: "이눌린 (식이섬유)",            amount: 4,  unit: "g", role: "안정", price: 5,  moq: 10, yieldPct: 99 },
    { id: "leu",    name: "류신 (아미노산)",              amount: 2,  unit: "g", role: "미량", price: 25, moq: 5,  yieldPct: 100 },
    { id: "cacao",  name: "코코아 분말",                  amount: 3,  unit: "g", role: "관능", price: 10, moq: 5,  yieldPct: 99 },
    { id: "agave",  name: "아가베시럽 분말",              amount: 3,  unit: "g", role: "감미", price: 15, moq: 5,  yieldPct: 99 },
    { id: "almbase",name: "아몬드버터 (결합제)",          amount: 5,  unit: "g", role: "담체", price: 10, moq: 10, yieldPct: 99 },
  ],
  soymilk: [
    { id: "spi",   name: "대두분리단백 (SPI)",           amount: 8,  unit: "g", role: "단백", price: 6,   moq: 25,  yieldPct: 98 },
    { id: "oat",   name: "귀리 추출물",                  amount: 5,  unit: "g", role: "탄수", price: 4,   moq: 20,  yieldPct: 99 },
    { id: "inul",  name: "이눌린 (프리바이오틱)",        amount: 3,  unit: "g", role: "안정", price: 8,   moq: 10,  yieldPct: 99 },
    { id: "caco3", name: "탄산칼슘",                     amount: 0.4, unit: "g", role: "미량", price: 2,  moq: 10,  yieldPct: 100 },
    { id: "vitd",  name: "비타민D3 분말",                amount: 0.002, unit: "g", role: "미량", price: 800, moq: 0.1, yieldPct: 95 },
    { id: "vanext",name: "바닐라 천연향",                amount: 0.3, unit: "g", role: "관능", price: 100, moq: 1,  yieldPct: 100 },
    { id: "stv",   name: "스테비아",                     amount: 0.1, unit: "g", role: "감미", price: 200, moq: 1,   yieldPct: 100 },
    { id: "wtr",   name: "정제수 (담체)",                amount: 180, unit: "g", role: "담체", price: 0.01, moq: 1000, yieldPct: 100 },
  ],
  rawfood: [
    { id: "rice",   name: "현미 분말",                   amount: 10, unit: "g", role: "탄수", price: 3,  moq: 25, yieldPct: 99 },
    { id: "oat",    name: "귀리 분말",                   amount: 8,  unit: "g", role: "탄수", price: 4,  moq: 20, yieldPct: 99 },
    { id: "spiru",  name: "스피루리나 분말",              amount: 2,  unit: "g", role: "단백", price: 50, moq: 3,  yieldPct: 97 },
    { id: "kale",   name: "동결건조 케일분말",            amount: 5,  unit: "g", role: "미량", price: 80, moq: 5,  yieldPct: 95 },
    { id: "flax",   name: "아마씨 분말 (오메가3)",        amount: 3,  unit: "g", role: "지방", price: 12, moq: 10, yieldPct: 98 },
    { id: "ginger", name: "생강 분말",                   amount: 1,  unit: "g", role: "관능", price: 15, moq: 5,  yieldPct: 98 },
    { id: "stv",    name: "천연 스테비아",                amount: 0.3, unit: "g", role: "감미", price: 200, moq: 1, yieldPct: 100 },
  ],
  tea: [
    { id: "gtea",  name: "녹차 분말 (카테킨)",           amount: 1.5, unit: "g", role: "관능", price: 30, moq: 10, yieldPct: 99 },
    { id: "cham",  name: "캐모마일 분말",                amount: 0.8, unit: "g", role: "관능", price: 40, moq: 5,  yieldPct: 99 },
    { id: "roos",  name: "루이보스 분말",                amount: 0.5, unit: "g", role: "관능", price: 35, moq: 5,  yieldPct: 99 },
    { id: "ging",  name: "생강 추출물분말",              amount: 0.2, unit: "g", role: "미량", price: 80, moq: 2,  yieldPct: 97 },
    { id: "cin",   name: "계피 분말",                    amount: 0.1, unit: "g", role: "미량", price: 20, moq: 5,  yieldPct: 99 },
    { id: "stv",   name: "스테비아",                     amount: 0.05, unit: "g", role: "감미", price: 200, moq: 1, yieldPct: 100 },
  ],
};
// 제품군 폴백 없는 경우 FSMP 기준 원료를 기본값으로 사용
function getFallbackIngredients(productType?: string): any[] {
  return FALLBACK_INGREDIENTS_BY_TYPE[productType || "fsmp"]
    || FALLBACK_INGREDIENTS_BY_TYPE["fsmp"];
}
const FALLBACK_COST = {
  packaging: { liquidPack: 240, outerBox: 620, shipperBox: 180, label: 120, sterilization: 480 },
  overhead: { labor: 780, utility: 340, qa: 320, depreciation: 420, logistics: 380 },
  target: { wholesaleMarkup: 1.7, retailMarkup: 2.3, msrp: 39000 },
};
