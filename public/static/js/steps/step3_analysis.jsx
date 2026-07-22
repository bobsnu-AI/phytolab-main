// Step 3: Product Analysis — FSMP 경쟁 벤치마킹
const Step3Analysis = () => {
  const comps = PHYTO_DATA.competitors;
  const Reveal = window.RevealSection || (({ children }) => children);

  // 포지셔닝 맵: X = 가격, Y = 임상근거 강도
  const strengthMap = { "A사 뉴케어DM": 6.4, "B사 그린비아DM": 5.2, "C사 인슐렌": 7.6, "D사 글루세나": 8.7, "E사 메디케어D": 5.8 };
  const ourStrength = 8.8;
  const ourPrice = 45000;

  const priceMin = 32000, priceMax = 60000;
  const xPct = (p) => ((p - priceMin) / (priceMax - priceMin)) * 100;
  const yPct = (s) => (1 - s/10) * 100;

  return (
    <div className="step-content">
      <div className="step-header">
        <div>
          <div className="step-eyebrow mono">STAGE 03 · PRODUCT ANALYSIS</div>
          <h1 className="step-title">경쟁 FSMP 벤치마킹</h1>
          <div className="step-desc">경쟁 상위 5개 제품 영양조성·판가·근거·채널 비교 → 포지셔닝 갭 도출</div>
        </div>
        <div className="step-badges">
          <div className="badge"><span className="badge-k">SKUS</span><span className="badge-v mono">스캔 62 · 채택 5</span></div>
          <div className="badge"><span className="badge-k">REVIEWS</span><span className="badge-v mono">24,780건 파싱</span></div>
        </div>
      </div>

      <Reveal id="positioning" label="경쟁 포지셔닝 맵" agent="mara">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">경쟁 포지셔닝 맵</div>
            <div className="panel-sub">가격 × 근거강도 · 원크기=리뷰수</div>
          </div>
          <div className="panel-legend">
            <span className="lg-item"><span className="lg-dot lg-dot-us"></span>GLUCARE-M (제안)</span>
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
            {comps.map((c, i) => {
              const s = strengthMap[c.brand];
              return (
                <div key={i} className="pm-node" style={{left: `${xPct(c.price)}%`, top: `${yPct(s)}%`, "--sz": `${18 + Math.log(c.reviews)*3}px`}}>
                  <div className="pm-node-dot"></div>
                  <div className="pm-node-label">{c.brand}</div>
                </div>
              );
            })}
            <div className="pm-node pm-node-us" style={{left: `${xPct(ourPrice)}%`, top: `${yPct(ourStrength)}%`}}>
              <div className="pm-node-dot"></div>
              <div className="pm-node-label">GLUCARE-M</div>
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
              <div className="ct-brand">{c.brand}</div>
              <div><span className="chip">{c.format}</span></div>
              <div className="ct-key mono">{c.key}</div>
              <div className="ct-claim">{c.claim}</div>
              <div className="mono ct-price">₩{c.price.toLocaleString()}</div>
              <div className="ct-rating">
                <div className="stars">
                  <div className="stars-fill" style={{width: `${c.rating/5*100}%`}}></div>
                </div>
                <span className="mono">{c.rating}</span>
              </div>
              <div className="ct-channel">{c.channel}</div>
            </div>
          ))}
          <div className="ct-row ct-row-us">
            <div className="ct-brand">
              <span className="us-mark">◆</span>
              GLUCARE-M <span className="mono ct-tag">제안</span>
            </div>
            <div><span className="chip chip-primary">액상 200ml</span></div>
            <div className="ct-key mono">이소말툴로스 22g + WPI 10g + MUFA</div>
            <div className="ct-claim">저GI · 근감소 예방 · 저나트륨</div>
            <div className="mono ct-price">₩45,000</div>
            <div className="ct-rating">
              <div className="stars"><div className="stars-fill" style={{width: `93%`}}></div></div>
              <span className="mono">4.7*</span>
            </div>
            <div className="ct-channel">병원 → D2C</div>
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
          {[
            { label: "단백질 (g)",       our: 13, avg: 9.8, target: 12, max: 18 },
            { label: "저GI 탄수 (g)",     our: 28, avg: 22,  target: 25, max: 35 },
            { label: "MUFA 지방 (g)",     our: 6,  avg: 3.4, target: 5,  max: 10 },
            { label: "식이섬유 (g)",       our: 6,  avg: 4.2, target: 5,  max: 10 },
            { label: "나트륨 (mg, 낮을수록↑)", our: 180, avg: 260, target: 200, max: 400, inverse: true },
            { label: "당류 (g, 낮을수록↑)", our: 2, avg: 8, target: 5, max: 15, inverse: true },
          ].map((row, i) => {
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
            <span><span className="nc-dot nc-us"></span>GLUCARE-M</span>
            <span><span className="nc-dot nc-avg"></span>경쟁 평균</span>
            <span><span className="nc-dot nc-target"></span>KDA 권고</span>
          </div>
        </div>
      </div>
      </Reveal>

      <Reveal id="reviews" label="리뷰 시그널" agent="mara">
      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">리뷰·평가 · 긍정 시그널</div>
              <div className="panel-sub">처방+리뷰 클러스터링</div>
            </div>
          </div>
          <div className="wordcloud pos">
            {[
              {t:"혈당 안정", w: 44},{t:"식후 완만", w: 38},{t:"의사 추천", w: 34},
              {t:"편의성", w: 28},{t:"급여지원", w: 22},{t:"저작 부담↓", w: 32},
              {t:"체중 유지", w: 20},{t:"부담 없는 맛", w: 24},
            ].map((x,i)=>(<span key={i} className="tag" style={{fontSize: `${11+x.w*0.35}px`}}>{x.t}</span>))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">리뷰·평가 · 부정 시그널</div>
              <div className="panel-sub">개선 기회 지점</div>
            </div>
          </div>
          <div className="wordcloud neg">
            {[
              {t:"인공감미료", w: 40},{t:"가격 부담", w: 36},{t:"단조로운 맛", w: 32},
              {t:"환자만 별도식", w: 28},{t:"급여 미지원", w: 30},{t:"질감·목넘김", w: 24},
              {t:"장기복용 어려움", w: 22},{t:"포장 폐기", w: 16},
            ].map((x,i)=>(<span key={i} className="tag" style={{fontSize: `${11+x.w*0.35}px`}}>{x.t}</span>))}
          </div>
        </div>
      </div>
      </Reveal>

      <Reveal id="concept_pod" label="컨셉 도출 & POD 발굴" agent="mara">
      <div className="panel concept-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">컨셉 도출 & POD 발굴 <window.SourceTag id="community_lda" label="실측 소규모표본" /></div>
            <div className="panel-sub">네이버 카페 "당뇨와건강" 후기·체험단 공개 게시글 12건 · 형태소분석 + LDA 토픽모델링</div>
          </div>
          <div className="panel-note mono" title="실제 크롤링 + 실제 LDA 실행, 소규모 표본(n=12) · 통계적 대표성 제한적">n=12 · 실측 표본</div>
        </div>

        <div className="lda-topics">
          {[
            {
              id: "A", name: "혈당관리 · CGM 루틴", docs: 5, color: "us",
              kws: [
                {t:"혈당", w:100},{t:"잡곡밥", w:32},{t:"관리", w:27},{t:"식이섬유", w:24},
                {t:"연속혈당측정기", w:22},{t:"단백질", w:22},{t:"현미", w:20},{t:"루피니빈", w:17},{t:"렌틸콩", w:15},
              ],
            },
            {
              id: "B", name: "저당 간식 대체", docs: 4, color: "avg",
              kws: [
                {t:"무슈콘", w:100},{t:"스콘", w:67},{t:"식단", w:66},{t:"탄수화물", w:53},
                {t:"단백질", w:52},{t:"아몬드", w:48},{t:"밀가루", w:48},{t:"저당", w:48},{t:"치즈", w:48},{t:"부담", w:48},
              ],
            },
            {
              id: "C", name: "환자용 영양식 대용식", docs: 3, color: "target",
              kws: [
                {t:"케어", w:100},{t:"식사", w:88},{t:"아침", w:88},{t:"그린비아", w:76},
                {t:"정식품", w:63},{t:"대용", w:63},{t:"환자", w:51},{t:"필요", w:51},{t:"영양", w:39},
              ],
            },
          ].map((topic) => (
            <div key={topic.id} className="lda-topic-card">
              <div className="lda-topic-head">
                <span className={`lda-topic-dot lda-dot-${topic.color}`}></span>
                <span className="lda-topic-name">Topic {topic.id} · {topic.name}</span>
                <span className="mono lda-topic-docs">문서 {topic.docs}/12건</span>
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
            <div className="pod-block-label mono">PAIN POINT · 3갈래</div>
            <ul className="pod-list">
              <li><strong>대용식</strong> — 맛이 단조롭다는 반복 불만 (Topic C)</li>
              <li><strong>저당 간식</strong> — 저당이어도 여전히 심리적 부담 (Topic B)</li>
              <li><strong>관리 루틴</strong> — 숫자(혈당수치) 의존형 관리의 피로감 (Topic A)</li>
            </ul>
          </div>
          <div className="callout pod-callout">
            <div className="callout-tag mono">POD</div>
            <div className="callout-text">
              숫자에 의존하지 않고도 <strong>맛</strong>으로 매 끼니 <strong>혈당 안정</strong>을 체감하는 액상 대용식
            </div>
          </div>
        </div>
      </div>
      </Reveal>
    </div>
  );
};

window.Step3Analysis = Step3Analysis;
