/* ============================================================
   ANIMATED CANDLESTICK CHART CANVAS (Hero Background)
   ============================================================ */
(function () {
  const canvas = document.getElementById('chartCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  let candles = [];
  let time = 0;          // fractional frame counter driven by timestamp
  let lastTs = null;

  const CANDLE_W   = 18;
  const CANDLE_GAP = 10;
  const STEP       = CANDLE_W + CANDLE_GAP;
  const SCROLL_SPD = 28; // px per second — perfectly smooth

  // How many candles we need to fill screen + buffer
  function candleCount() { return Math.ceil(W / STEP) + 8; }

  // Build a price walk using a simple Gaussian-ish random
  function gauss() {
    return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  }

  function makeCandle(open) {
    const move  = gauss() * 55;   // bigger swing
    const close = open + move;
    const wickT = Math.random() * 22;
    const wickB = Math.random() * 22;
    const high  = Math.min(open, close) - wickT;
    const low   = Math.max(open, close) + wickB;
    return { open, close, high, low, alpha: 0.28 + Math.random() * 0.35 };
  }

  function generateCandles() {
    candles = [];
    let price = H * 0.5;
    const count = candleCount();
    for (let i = 0; i < count; i++) {
      const c = makeCandle(price);
      price = Math.max(H * 0.15, Math.min(H * 0.82, c.close));
      c.close = price;
      candles.push(c);
    }
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateCandles();
  }

  // When a candle scrolls fully off the left, recycle it to the right
  function recycleCandles(offsetX) {
    const totalW = candles.length * STEP;
    // How many full candles have scrolled past?
    const shifted = Math.floor(offsetX / STEP);
    if (shifted <= 0) return;
    for (let i = 0; i < shifted; i++) {
      const old  = candles.shift();
      const prev = candles[candles.length - 1];
      let open   = prev ? prev.close : H * 0.5;
      if (open < H * 0.15 || open > H * 0.82) open = H * 0.5;
      const nc   = makeCandle(open);
      old.open  = nc.open;
      old.close = Math.max(H * 0.15, Math.min(H * 0.82, nc.close));
      old.high  = nc.high;
      old.low   = nc.low;
      old.alpha = nc.alpha;
      candles.push(old);
    }
    // Reset the time offset so we never accumulate a huge offsetX
    time -= shifted * STEP / SCROLL_SPD;
  }

  /* ---- GRID ---- */
  function drawGrid() {
    const gridX = 80, gridY = 70;
    // vertical lines scroll in sync with candles
    const ox = (time * SCROLL_SPD) % gridX;
    ctx.lineWidth = 1;
    for (let x = -ox; x < W; x += gridX) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridY) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  /* ---- MOVING AVERAGE LINE ---- */
  function drawMA() {
    const offsetX = (time * SCROLL_SPD) % STEP;
    const pts = [];
    for (let i = 0; i < candles.length; i++) {
      const x = i * STEP - offsetX + CANDLE_W / 2;
      const mid = (candles[i].open + candles[i].close) / 2;
      pts.push([x, mid]);
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      // smooth with quadratic bezier
      const mx = (pts[i-1][0] + pts[i][0]) / 2;
      const my = (pts[i-1][1] + pts[i][1]) / 2;
      ctx.quadraticCurveTo(pts[i-1][0], pts[i-1][1], mx, my);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---- VOLUME BARS (bottom strip) ---- */
  function drawVolume() {
    const offsetX = (time * SCROLL_SPD) % STEP;
    const volH    = H * 0.12;
    const baseY   = H - 4;
    candles.forEach((c, i) => {
      const x    = i * STEP - offsetX;
      const bull = c.close <= c.open;
      const vol  = 0.3 + Math.random() * 0.7; // could be stored per candle but random looks fine
      const h    = volH * c.alpha * vol;
      ctx.fillStyle = bull
        ? `rgba(255,255,255,${c.alpha * 0.18})`
        : `rgba(255,255,255,${c.alpha * 0.07})`;
      ctx.fillRect(x, baseY - h, CANDLE_W, h);
    });
  }

  /* ---- CANDLES ---- */
  function drawCandles() {
    const offsetX = (time * SCROLL_SPD) % STEP;
    candles.forEach((c, i) => {
      const x   = i * STEP - offsetX;
      const cx  = x + CANDLE_W / 2;
      const top = Math.min(c.open, c.close);
      const bodyH = Math.max(Math.abs(c.close - c.open), 3);
      const gray = `rgba(180,180,180,${c.alpha})`;

      // wick — solid light gray
      ctx.strokeStyle = gray;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, c.high);
      ctx.lineTo(cx, c.low);
      ctx.stroke();

      // body — solid filled light gray
      ctx.fillStyle = gray;
      ctx.fillRect(x, top, CANDLE_W, bodyH);
    });
  }

  /* ---- VIGNETTE ---- */
  function drawVignette() {
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.85);
    grad.addColorStop(0, 'rgba(8,8,8,0)');
    grad.addColorStop(1, 'rgba(8,8,8,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // stronger bottom fade so content stays readable
    const btm = ctx.createLinearGradient(0, H*0.55, 0, H);
    btm.addColorStop(0, 'rgba(8,8,8,0)');
    btm.addColorStop(1, 'rgba(8,8,8,0.88)');
    ctx.fillStyle = btm;
    ctx.fillRect(0, H*0.55, W, H*0.45);
  }

  /* ---- MAIN LOOP ---- */
  function animate(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05); // seconds, capped
    lastTs = ts;
    time += dt;

    const offsetX = time * SCROLL_SPD;
    recycleCandles(offsetX);

    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawVolume();
    drawMA();
    drawCandles();
    drawVignette();

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(animate);
})();

/* ============================================================
   MOBILE HAMBURGER
   ============================================================ */
document.getElementById('hamburger')?.addEventListener('click', function () {
  const navLinks = document.querySelector('.nav-links');
  const isOpen = navLinks.style.display === 'flex';
  if (isOpen) {
    navLinks.style.display = '';
  } else {
    navLinks.style.cssText = 'display:flex;flex-direction:column;position:fixed;top:64px;left:0;right:0;background:rgba(8,8,8,0.98);padding:24px;gap:24px;border-bottom:1px solid rgba(255,255,255,0.08);z-index:99;';
  }
});

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.video-card, .playlist-card, .feature-item, .about-visual, .about-text').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  observer.observe(el);
});

/* ============================================================
   小红书 — app deep link on mobile, web on desktop
   ============================================================ */
const xhsBtn = document.getElementById('xhsBtn');
if (xhsBtn) {
  // desktop and mobile: open web profile directly

}

/* ============================================================
   YOUTUBE API — Auto-load latest videos
   ============================================================ */
(function () {
  const API_KEY    = 'AIzaSyBOBhDWEX7gcIJpXTEwfBPlP3_MwNyetbo';
  const CHANNEL_ID = 'UCAYUBSXZo3mhr27Q95Qb3WQ';
  const grid = document.getElementById('video-grid');
  if (!grid) { console.error('video-grid not found'); return; }

  function formatDuration(iso) {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return '';
    const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), s = parseInt(m[3] || 0);
    if (h > 0) return `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${min}:${String(s).padStart(2,'0')}`;
  }

  function formatViews(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  function formatTimeAgo(dateStr) {
    const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (days === 0) return '今天';
    if (days < 7)   return `${days}天前`;
    if (days < 30)  return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  }

  function esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderCards(items, detailsMap) {
    grid.innerHTML = items.map((item, i) => {
      const vid      = item.id.videoId;
      const title    = item.snippet.title;
      const published = item.snippet.publishedAt;
      const detail   = detailsMap[vid];
      const duration = detail ? formatDuration(detail.contentDetails.duration) : '';
      const views    = detail?.statistics?.viewCount ? formatViews(parseInt(detail.statistics.viewCount)) : '';
      const timeAgo  = formatTimeAgo(published);

      return `
        <div class="video-card${i === 0 ? ' featured' : ''}" data-vid="${vid}" style="cursor:pointer">
          <div class="video-thumb">
            <img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="${esc(title)}" class="thumb-img"/>
            <div class="play-btn"><svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
            ${i === 0 ? '<div class="video-badge">最新</div>' : ''}
            ${duration ? `<div class="video-duration">${duration}</div>` : ''}
          </div>
          <div class="video-info">
            <h3>${esc(title)}</h3>
            <div class="video-meta">
              ${views ? `<span>${views} 次观看</span>` : ''}
              <span>${timeAgo}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', () => window.open(`https://www.youtube.com/watch?v=${card.dataset.vid}`, '_blank'));
    });
  }

  const FALLBACK = [
    { id: 'rmWfIFOXGpE', title: '闪迪美光超跌！底部即将到来',        published: '2026-03-28T17:15:39Z' },
    { id: 'Sew7pOjQWw4', title: '一条新闻接一条，美股到底了吗？',    published: '2026-03-26T00:47:49Z' },
    { id: 'KE5Tperziw4', title: '美股逆势赚50%！跟着这样买股票',      published: '2026-03-24T23:49:16Z' },
    { id: '3P_NYZuSUnw', title: '恐慌中抄底黄金，单日涨幅25%',       published: '2026-03-24T00:40:35Z' },
    { id: 'a3msQrNQmrg', title: '美股极端行情下的交易实录',           published: '2026-03-21T03:48:23Z' },
  ];

  function showFallback() {
    const items = FALLBACK.map(v => ({ id: { videoId: v.id }, snippet: { title: v.title, publishedAt: v.published } }));
    renderCards(items, {});
  }

  // Show fallback immediately, then try to update with live data
  showFallback();

  fetch(`https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=5&type=video`)
    .then(r => r.json())
    .then(data => {
      if (!data.items || !data.items.length) return;
      const ids = data.items.map(v => v.id.videoId).join(',');
      return fetch(`https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${ids}&part=contentDetails,statistics`)
        .then(r => r.json())
        .then(details => {
          const map = {};
          if (details.items) details.items.forEach(v => { map[v.id] = v; });
          renderCards(data.items, map);
        });
    })
    .catch(err => console.warn('YouTube API:', err));
})();

/* ============================================================
   TICKER TAPE (floating price tags animation)
   ============================================================ */
const tickers = ['TSLA', 'BABA', 'NVDA', 'AVGO', 'KWEB', 'MU', 'AMD', 'AAPL', 'SPY', 'QQQ'];
const hero = document.querySelector('.hero');
if (hero) {
  tickers.forEach((t, i) => {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;
      font-family:'Inter',sans-serif;
      font-size:11px;
      font-weight:600;
      color:rgba(255,255,255,0.12);
      letter-spacing:0.08em;
      pointer-events:none;
      z-index:1;
      top:${15 + (i * 9) % 80}%;
      left:${60 + (i * 7) % 35}%;
      animation: floatTicker ${8 + i * 1.3}s ease-in-out infinite alternate;
      animation-delay:${i * 0.4}s;
    `;
    el.textContent = t;
    hero.appendChild(el);
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatTicker {
      from { opacity: 0.06; transform: translateY(0px); }
      to   { opacity: 0.18; transform: translateY(-12px); }
    }
  `;
  document.head.appendChild(style);
}
