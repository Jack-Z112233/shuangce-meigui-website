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
  xhsBtn.addEventListener('click', function (e) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      e.preventDefault();
      // Try to open the app; fall back to web after 1.5s if app not installed
      const appUrl = 'xhsdiscover://user/profile/26136486704';
      const webUrl = 'https://www.xiaohongshu.com/user/profile/26136486704';
      const fallback = setTimeout(() => { window.open(webUrl, '_blank'); }, 1500);
      window.location.href = appUrl;
      window.addEventListener('blur', () => clearTimeout(fallback), { once: true });
    }
    // desktop: default href opens web link
  });
}

/* ============================================================
   VIDEO CARD → YOUTUBE LINK
   ============================================================ */
document.querySelectorAll('.video-card').forEach(card => {
  card.addEventListener('click', () => {
    window.open('https://www.youtube.com/@DanielWu-d1q/videos', '_blank');
  });
  card.style.cursor = 'pointer';
});

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
