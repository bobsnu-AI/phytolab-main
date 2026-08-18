// Step 1: Market Scan — FSMP 시장조사
// 라이브 논의 모드(useAgentStream.isLive)에서는 각 섹션이 RevealSection으로 감싸져
// 오른쪽 Agent 대화가 해당 결론에 도달하는 시점에 맞춰 순차적으로 나타난다.
// 스크립트 재생 모드(스텝2~5, 라이브 미연동)에서는 RevealSection이 children을 그대로 통과시켜
// 기존과 동일하게 즉시 렌더된다.

// 텍스트 안에서 boldParts에 있는 부분 문자열만 <strong>으로 감싸 렌더 (데이터 기반 콜아웃용)
function boldify(text, boldParts) {
  if (!boldParts || !boldParts.length) return text;
  const pattern = new RegExp(`(${boldParts.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(pattern).map((part, i) => boldParts.includes(part) ? <strong key={i}>{part}</strong> : part);
}

const Step1Market = () => {
  const d = PHYTO_DATA.market;
  const comps = PHYTO_DATA.competitors;
  const product = PHYTO_DATA.product;
  const reviews = PHYTO_DATA.reviews;
  const concept = PHYTO_DATA.concept;
  const nutritionCompare = PHYTO_DATA.nutritionCompare;
  const Reveal = window.RevealSection || (({ children }) => children);

  // 출처 목록 접기/펼치기 상태
  const [srcOpen, setSrcOpen] = React.useState(false);
  const [srcFilter, setSrcFilter] = React.useState("all"); // all | blog | news | cafe

  // 포지셔닝 맵: X = 가격, Y = 임상근거 강도
  const ourStrength = product.targetEvidenceStrength;
  const ourPrice = product.targetPrice;
  const priceMin = 32000, priceMax = 60000;
  const xPct = (p) => ((p - priceMin) / (priceMax - priceMin)) * 100;
  const yPct = (s) => (1 - s/10) * 100;

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 01 · MARKET & COMPETITOR SCAN</div>
          <h1 className="step-title">{d.headerTitle}</h1>
          <div className="step-desc">{d.headerDesc}</div>
        </div>
        <div className="step-badges">
          <div className="badge badge-product-type">
            <span className="badge-k">제품 유형</span>
            <span className="badge-v">{product.category || "특수의료용도식품"}</span>
          </div>
          <div className="badge badge-reg-class">
            <span className="badge-k">규제 클래스</span>
            <span className="badge-v mono" title={product.regClass || ""}>{product.regClass || "FSMP 표준제조기준"}</span>
          </div>
          <div className="badge"><span className="badge-k">DATA</span><span className="badge-v-row"><span className="badge-v">식약처 · KDA · Global Data</span><window.SourceTag id="mfds_fsmp_standard" label="" /></span></div>
          <div className="badge"><span className="badge-k">SCAN</span><span className="badge-v-row"><span className="badge-v mono">{product.category || "FSMP"} {PHYTO_DATA.competitors?.length || 218} SKU</span><window.SourceTag id="agent_estimate" label="" /></span></div>
          <div className="badge"><span className="badge-k">SKUS</span><span className="badge-v mono">스캔 {PHYTO_DATA.competitors?.length || 62} · 채택 5</span></div>
          <div className="badge"><span className="badge-k">UPDATED</span><span className="badge-v mono">2026-06-28</span></div>
        </div>
      </div>

      {/* 시장 컨텍스트 3줄 요약 — CLIO 발언으로 도출 */}
      <Reveal id="context" label="시장 컨텍스트" agent="clio">
        <div className="context-strip">
          <div className="cs-item">
            <div className="cs-tag mono">PREVALENCE</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.prevalence}</span><window.SourceTag id={d.context.prevalenceSourceKey} label="출처" /></div>
          </div>
          <div className="cs-item">
            <div className="cs-tag mono">UNMET NEED</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.unmet}</span><window.SourceTag id={d.context.unmetSourceKey} label="추정치" /></div>
          </div>
          <div className="cs-item">
            <div className="cs-tag mono">POLICY</div>
            <div className="cs-txt-row"><span className="cs-txt">{d.context.policy}</span><window.SourceTag id={d.context.policySourceKey} label="출처" /></div>
          </div>
        </div>
      </Reveal>

      {/* KPI — MARA 발언으로 도출 */}
      <Reveal id="kpi" label="시장 규모 KPI" agent="mara">
        <div className="kpi-grid">
          <div className="kpi kpi-primary">
            <div className="kpi-label-row"><span className="kpi-label">국내 FSMP 시장</span><window.SourceTag id={d.domestic.sourceKey} label="출처" /></div>
            <div className="kpi-value"><span className="kpi-num">{d.domestic.size.toLocaleString()}</span><span className="kpi-unit">{d.domestic.unit}</span></div>
            <div className="kpi-delta up">▲ {d.domestic.year}→2033 성장 전망 (3배 이상)</div>
            <svg className="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,26 L20,22 L40,18 L60,12 L80,7 L100,2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              <path d="M0,26 L20,22 L40,18 L60,12 L80,7 L100,2 L100,30 L0,30 Z" fill="currentColor" opacity="0.12"/>
            </svg>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">글로벌 의료식품 시장</span><window.SourceTag id={d.global.sourceKey} label="출처" /></div>
            <div className="kpi-value"><span className="kpi-num">{d.global.size}</span><span className="kpi-unit">B USD</span></div>
            <div className="kpi-delta up">▲ CAGR {d.global.cagr}% (2026–2035)</div>
            <svg className="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,22 L20,19 L40,16 L60,13 L80,9 L100,5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            </svg>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">B2B 채널 비중</span><window.SourceTag id="agent_estimate" label="추정치" /></div>
            <div className="kpi-value"><span className="kpi-num">65</span><span className="kpi-unit">%</span></div>
            <div className="kpi-delta">병원 + 요양시설 (Agent 추정)</div>
            <div className="kpi-scale">
              <div className="kpi-scale-bar" style={{width: "65%"}}></div>
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label-row"><span className="kpi-label">평균 판가 밴드</span><window.SourceTag id="agent_estimate" label="추정치" /></div>
            <div className="kpi-value"><span className="kpi-num">38–54</span><span className="kpi-unit">천원</span></div>
            <div className="kpi-delta">경쟁사 판가 기준 (Step3 참조)</div>
            <div className="kpi-scale kpi-scale-range">
              <div className="kpi-scale-range-fill" style={{left: "20%", width: "48%"}}></div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="two-col">
        {/* 세그먼트 — MARA 발언으로 도출 */}
        <Reveal id="segments" label="세그먼트별 점유율" agent="mara">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">FSMP 세그먼트별 점유율 & 성장률 <window.SourceTag id="agent_estimate" label="추정치" /></div>
                <div className="panel-sub">공개 세그먼트 통계 부재 · Agent 추정 분해치</div>
              </div>
              <div className="panel-legend">
                <span className="lg-item"><span className="lg-dot lg-dot-hot"></span>Hot Zone</span>
                <span className="lg-item"><span className="lg-dot"></span>일반</span>
              </div>
            </div>
            <div className="segment-list">
              {d.segments.map((s, i) => (
                <div key={i} className={`segment-row ${s.hot ? "hot" : ""}`}>
                  <div className="segment-name">{s.label}</div>
                  <div className="segment-bar-wrap">
                    <div className="segment-bar" style={{width: `${(s.share/40)*100}%`}}></div>
                    <span className="segment-share mono">{s.share}%</span>
                  </div>
                  <div className={`segment-growth mono ${s.growth > 15 ? "up-strong" : "up"}`}>+{s.growth}%</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 유통 채널 — MARA 발언으로 도출 */}
        <Reveal id="channels" label="유통 채널" agent="mara">
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">주요 유통 채널 <window.SourceTag id="agent_estimate" label="추정치" /></div>
                <div className="panel-sub">B2B 비중 우세 (공개 채널별 통계 부재 · Agent 추정)</div>
              </div>
            </div>
            <div className="channel-grid">
              {d.channels.map((c, i) => (
                <div key={i} className="channel-card">
                  <div className="channel-name">{c.name}</div>
                  <div className="channel-share">
                    <div className="channel-share-ring" style={{"--pct": `${c.share}%`}}>
                      <span className="mono">{c.share}%</span>
                    </div>
                  </div>
                  <div className="channel-cac">
                    <span>CAC</span>
                    <span className={`cac-tag cac-${c.cac === "낮음" ? "low" : c.cac === "중간" ? "mid" : "high"}`}>{c.cac}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal id="positioning" label="경쟁 포지셔닝 맵" agent="mara">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">경쟁 포지셔닝 맵</div>
            <div className="panel-sub">가격 × 근거강도 · 원크기=리뷰수</div>
          </div>
          <div className="panel-legend">
            <span className="lg-item"><span className="lg-dot lg-dot-us"></span>{product.codename} (제안)</span>
            <span className="lg-item"><span className="lg-dot"></span>경쟁제품</span>
          </div>
        </div>
        <div className="position-map">
          <div className="pm-axis pm-y">
            <span className="mono pm-axis-label">← 임상 근거 강도</span>
          </div>
          <div className="pm-plot">
            <div className="pm-grid">
              {[1,2,3].map(i => <div key={`h${i}`} className="pm-line pm-line-h" style={{top: `${i*25}%`}}></div>)}
              {[1,2,3].map(i => <div key={`v${i}`} className="pm-line pm-line-v" style={{left: `${i*25}%`}}></div>)}
            </div>
            <div className="pm-sweetspot">
              <span className="mono">SWEET SPOT</span>
            </div>
            {comps.map((c, i) => (
              <div key={i} className="pm-node" style={{left: `${xPct(c.price)}%`, top: `${yPct(c.evidenceStrength)}%`, "--sz": `${18 + Math.log(c.reviews)*3}px`}}>
                <div className="pm-node-dot"></div>
                <div className="pm-node-label">{c.brand}</div>
              </div>
            ))}
            <div className="pm-node pm-node-us" style={{left: `${xPct(ourPrice)}%`, top: `${yPct(ourStrength)}%`}}>
              <div className="pm-node-dot"></div>
              <div className="pm-node-label">{product.codename}</div>
              <div className="pm-node-flag mono">우리 위치</div>
            </div>
          </div>
          <div className="pm-axis pm-x">
            <span className="mono">3.2만원</span>
            <span className="mono pm-axis-label">가격 (24팩 박스) →</span>
            <span className="mono">6.0만원</span>
          </div>
        </div>
      </div>
      </Reveal>

      <Reveal id="matrix" label="스펙·가격·채널 비교" agent="mara">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">스펙 · 가격 · 채널 비교 매트릭스</div>
            <div className="panel-sub">24팩박스=8일치 기준</div>
          </div>
        </div>
        <div className="compare-table">
          <div className="ct-header mono">
            <div>제품</div>
            <div>제형</div>
            <div>핵심 스펙</div>
            <div>클레임</div>
            <div>박스 가격</div>
            <div>평점</div>
            <div>주 채널</div>
          </div>
          {comps.map((c, i) => (
            <div key={i} className="ct-row">
              <div className="ct-brand">{c.brand}<span className="chip ct-chip-fmt">{c.format}</span></div>
              <div className="ct-key mono">{c.key}</div>
              <div className="ct-claim">{c.claim}</div>
              <div className="ct-row-meta">
                <span className="mono ct-price">₩{c.price.toLocaleString()}</span>
                <span className="ct-rating">
                  <div className="stars">
                    <div className="stars-fill" style={{width: `${c.rating/5*100}%`}}></div>
                  </div>
                  <span className="mono">{c.rating}</span>
                </span>
                <span className="ct-channel">{c.channel}</span>
              </div>
            </div>
          ))}
          <div className="ct-row ct-row-us">
            <div className="ct-brand">
              <span className="us-mark">◆</span>
              {product.codename} <span className="mono ct-tag">제안</span>
              <span className="chip chip-primary ct-chip-fmt">{product.format}</span>
            </div>
            <div className="ct-key mono">{product.positioningSpec}</div>
            <div className="ct-claim">{product.positioningClaim}</div>
            <div className="ct-row-meta">
              <span className="mono ct-price">₩{ourPrice.toLocaleString()}</span>
              <span className="ct-rating">
                <div className="stars"><div className="stars-fill" style={{width: `${product.positioningRating/5*100}%`}}></div></div>
                <span className="mono">{product.positioningRating}*</span>
              </span>
              <span className="ct-channel">{product.positioningChannel}</span>
            </div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 영양 조성 비교 레이더 스타일 */}
      <Reveal id="nutrition_compare" label="영양 조성 비교" agent="mara">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">주요 영양 조성 비교</div>
            <div className="panel-sub">1식 기준 · KDA 대비</div>
          </div>
        </div>
        <div className="nutrition-compare">
          {nutritionCompare.map((row, i) => {
            const ourPct = row.inverse ? (1 - row.our/row.max)*100 : (row.our/row.max)*100;
            const avgPct = row.inverse ? (1 - row.avg/row.max)*100 : (row.avg/row.max)*100;
            const targetPct = row.inverse ? (1 - row.target/row.max)*100 : (row.target/row.max)*100;
            return (
              <div key={i} className="nc-row">
                <div className="nc-label">{row.label}</div>
                <div className="nc-bars">
                  <div className="nc-bar-track">
                    <div className="nc-bar nc-bar-avg" style={{width: `${avgPct}%`}}></div>
                    <div className="nc-bar nc-bar-us" style={{width: `${ourPct}%`}}></div>
                    <div className="nc-target-mark" style={{left: `${targetPct}%`}}></div>
                  </div>
                </div>
                <div className="nc-values mono">
                  <span className="nc-us">{row.our}</span>
                  <span className="nc-sep">vs</span>
                  <span className="nc-avg">{row.avg}</span>
                </div>
              </div>
            );
          })}
          <div className="nc-legend mono">
            <span><span className="nc-dot nc-us"></span>{product.codename}</span>
            <span><span className="nc-dot nc-avg"></span>경쟁 평균</span>
            <span><span className="nc-dot nc-target"></span>KDA 권고</span>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 네이버 실시간 트렌드 — trendSummary / shoppingSummary */}
      {concept.sourceKey === "naver_realtime" && concept.trendSummary && (
        <Reveal id="naver_trend" label="네이버 실시간 검색 트렌드" agent="mara">
        <div className="panel naver-trend-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                네이버 실시간 검색 트렌드
                <span className="naver-badge mono">NAVER LIVE</span>
              </div>
              <div className="panel-sub">Search Trend · Shopping Insight · Blog/News 분석 (최근 6개월)</div>
            </div>
            <div className="panel-note mono">{concept.sampleBadge}</div>
          </div>
          <div className="naver-trend-grid">
            {/* 검색 트렌드 KPI */}
            <div className="nt-card nt-card-primary">
              <div className="nt-icon">🔍</div>
              <div className="nt-label mono">TOP 검색 키워드</div>
              <div className="nt-value">{concept.trendSummary.topKeyword}</div>
              <div className="nt-sub mono">검색지수 {concept.trendSummary.topRatio}/100</div>
              <div className="nt-bar-wrap">
                <div className="nt-bar" style={{width: `${concept.trendSummary.topRatio}%`}}></div>
              </div>
            </div>
            <div className="nt-card">
              <div className="nt-icon">📈</div>
              <div className="nt-label mono">검색 트렌드</div>
              <div className={`nt-value nt-trend-${concept.trendSummary.trend}`}>
                {concept.trendSummary.trend === "up" ? "▲ 상승세" : concept.trendSummary.trend === "down" ? "▼ 하락세" : "→ 안정세"}
              </div>
              <div className="nt-sub mono">월간 검색량 {(concept.trendSummary.totalSearchMonthly || 0).toLocaleString()}건</div>
            </div>
            <div className="nt-card">
              <div className="nt-icon">👤</div>
              <div className="nt-label mono">주 검색 연령대</div>
              <div className="nt-value">{concept.trendSummary.ageGroup}</div>
              <div className="nt-sub mono">Search Trend 분석</div>
            </div>
            <div className="nt-card">
              <div className="nt-icon">🛒</div>
              <div className="nt-label mono">쇼핑 인기 키워드</div>
              <div className="nt-value">{concept.shoppingSummary?.topShoppingKeyword || "-"}</div>
              <div className="nt-sub mono">
                클릭 점유율 {concept.shoppingSummary?.topShoppingRatio || 0}%
                <span className="nt-category"> · 건강기능식품</span>
              </div>
              {concept.shoppingSummary?.topShoppingRatio && (
                <div className="nt-bar-wrap">
                  <div className="nt-bar nt-bar-shop" style={{width: `${Math.min(concept.shoppingSummary.topShoppingRatio * 4, 100)}%`}}></div>
                </div>
              )}
            </div>
          </div>
        </div>
        </Reveal>
      )}

      <Reveal id="reviews" label="리뷰 시그널" agent="mara">
      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                리뷰·평가 · 긍정 시그널
                {concept.sourceKey === "naver_realtime" && <span className="naver-badge mono">NAVER</span>}
              </div>
              <div className="panel-sub">
                {concept.sourceKey === "naver_realtime" ? "네이버 블로그·뉴스·카페 실제 키워드" : "처방+리뷰 클러스터링"}
              </div>
            </div>
          </div>
          <div className="wordcloud pos">
            {reviews.positive.map((x,i)=>(<span key={i} className="tag" style={{fontSize: `${11+x.w*0.35}px`}}>{x.t}</span>))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                리뷰·평가 · 부정 시그널
                {concept.sourceKey === "naver_realtime" && <span className="naver-badge mono">NAVER</span>}
              </div>
              <div className="panel-sub">
                {concept.sourceKey === "naver_realtime" ? "네이버 실데이터 감성 분석" : "개선 기회 지점"}
              </div>
            </div>
          </div>
          <div className="wordcloud neg">
            {reviews.negative.map((x,i)=>(<span key={i} className="tag" style={{fontSize: `${11+x.w*0.35}px`}}>{x.t}</span>))}
          </div>
        </div>
      </div>
      </Reveal>

      <Reveal id="concept_pod" label="컨셉 도출 & POD 발굴" agent="mara">
      <div className="panel concept-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">컨셉 도출 & POD 발굴 <window.SourceTag id={concept.sourceKey} label={concept.sourceLabel} /></div>
            <div className="panel-sub">{concept.sourceNote}</div>
          </div>
          <div className="panel-note mono">{concept.sampleBadge}</div>
        </div>

        <div className="lda-topics">
          {concept.topics.map((topic) => (
            <div key={topic.id} className="lda-topic-card">
              <div className="lda-topic-head">
                <span className={`lda-topic-dot lda-dot-${topic.color}`}></span>
                <span className="lda-topic-name">Topic {topic.id} · {topic.name}</span>
                <span className="mono lda-topic-docs">문서 {topic.docs}/{topic.totalDocs}건</span>
              </div>
              <div className="wordcloud lda-wordcloud">
                {topic.kws.map((x, i) => (
                  <span key={i} className="tag" style={{fontSize: `${10+x.w*0.16}px`}}>{x.t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="painpoint-pod-grid">
          <div className="pod-block">
            <div className="pod-block-label mono">PAIN POINT · {concept.painPoints.length}갈래</div>
            <ul className="pod-list">
              {concept.painPoints.map((p, i) => (
                <li key={i}><strong>{p.label}</strong> — {p.text}</li>
              ))}
            </ul>
          </div>
          <div className="callout pod-callout">
            <div className="callout-tag mono">POD</div>
            <div className="callout-text">{boldify(concept.pod, concept.podBold)}</div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 결론 — MARA 발언으로 도출 */}
      <Reveal id="conclusion" label="종합 결론" agent="mara">
        <div className="callout">
          <div className="callout-tag mono">AGENT INSIGHT</div>
          <div className="callout-text">{boldify(concept.conclusion, concept.conclusionBold)}</div>
        </div>
      </Reveal>

      {/* 수집 원문 출처 목록 — sourceItems 있을 때만 표시 */}
      {concept.sourceKey === "naver_realtime" && Array.isArray(concept.sourceItems) && concept.sourceItems.length > 0 && (() => {
        const TYPE_LABEL = { blog: "블로그", news: "뉴스", cafe: "카페" };
        const TYPE_COLOR = { blog: "src-blog", news: "src-news", cafe: "src-cafe" };
        const filtered = srcFilter === "all"
          ? concept.sourceItems
          : concept.sourceItems.filter(x => x.type === srcFilter);
        const counts = { all: concept.sourceItems.length };
        ["blog","news","cafe"].forEach(t => {
          counts[t] = concept.sourceItems.filter(x => x.type === t).length;
        });
        return (
          <div className="panel src-panel">
            <button className="src-panel-toggle" onClick={() => setSrcOpen(v => !v)}>
              <span className="panel-title">
                수집 원문 출처
                <span className="src-count-badge mono">{concept.sourceItems.length}건</span>
                <span className="naver-badge mono">NAVER</span>
              </span>
              <span className="src-toggle-icon mono">{srcOpen ? "▲ 접기" : "▼ 펼치기"}</span>
            </button>
            {srcOpen && (
              <div className="src-body">
                {/* 타입 필터 탭 */}
                <div className="src-filter-row">
                  {["all","blog","news","cafe"].map(t => (
                    <button key={t}
                      className={`src-filter-btn mono${srcFilter === t ? " active" : ""}`}
                      onClick={() => setSrcFilter(t)}>
                      {t === "all" ? `전체 ${counts.all}` : `${TYPE_LABEL[t]} ${counts[t]}`}
                    </button>
                  ))}
                </div>
                {/* 출처 목록 */}
                <div className="src-list">
                  {filtered.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="src-item">
                      <span className={`src-type-tag mono ${TYPE_COLOR[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                      <span className="src-title">{item.title}</span>
                      {item.snippet && (
                        <span className="src-snippet">{item.snippet}</span>
                      )}
                      {item.date && (
                        <span className="src-date mono">{item.date}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

window.Step1Market = Step1Market;
