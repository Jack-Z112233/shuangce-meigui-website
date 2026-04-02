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

/* ============================================================
   LANGUAGE TOGGLE (中 / EN)
   ============================================================ */
(function () {
  const translations = {
    zh: {
      'logo-text': '双侧玩美股',
      'nav-about': '关于',
      'nav-videos': '视频',
      'nav-community': '社区',
      'nav-discord': '加入社区',
      'hero-badge': '全实盘博主',
      'hero-title': '双侧玩<span class="accent">美股</span>',
      'hero-sub': '实盘记录 · 每日复盘 · 双向交易 · 实时交易<br/>与你一起读懂美国股市',
      'stat-subscribers': '订阅者',
      'stat-videos': '视频',
      'stat-freq': '复盘频率',
      'stat-daily': '日更',
      'hero-discord-main': '加入 Discord',
      'hero-discord-sub': '订阅获取实时交易更新',
      'scroll-hint': '向下滚动',
      'about-label': '关于频道',
      'about-title': '真实账户<br/><span class="accent">透明操盘</span>',
      'about-p1': '双侧玩美股是一个专注于美国股市实盘交易的中文频道。Daniel 坚持每日更新复盘视频，公开账户操作记录，分享真实的交易逻辑与风险控制心得。',
      'about-p2': '无论是个股深度分析、宏观市场解读，还是中短线波段与中长线布局，这里都有最真实、最透明的一手实盘记录。',
      'feature-1-title': '每日复盘',
      'feature-1-desc': '公开账户持仓，每日视频更新交易总结',
      'feature-2-title': '双向交易',
      'feature-2-desc': '多空双侧操作，把握涨跌两端机会',
      'feature-3-title': '个股分析',
      'feature-3-desc': 'TSLA、BABA、半导体等热门标的深度解析',
      'profile-tag-1': '实盘交易',
      'profile-tag-2': '双向操作',
      'profile-tag-3': '美股研究',
      'community-label': '加入社区',
      'community-title': '实时交流，共同成长',
      'community-p': '加入 Discord 社群，第一时间获取 Daniel 的实盘买卖操作更新——每一笔开仓、加仓、止盈止损都会实时推送，让你跟上每一个交易机会。同时享有一对一答疑与每周定期直播。',
      'ch-cat-1': '📊 交易频道',
      'ch-1-name': 'daniel的市场想法',
      'ch-1-desc': 'Daniel 每日亲自分享市场观点与交易逻辑',
      'ch-2-name': '中短线交易 · 实时更新',
      'ch-2-desc': '中短线开仓、加仓、止盈止损第一时间推送',
      'ch-3-name': '中长线交易 · 实时更新',
      'ch-3-desc': '中长线布局与持仓变动实时同步',
      'ch-4-name': '群友突破分享',
      'ch-4-desc': '群友发掘的潜力好股，集思广益共同寻找机会',
      'ch-5-name': '市场新闻与帐户更新',
      'ch-5-desc': '重要财经新闻与账户持仓变动即时播报',
      'ch-cat-2': '💬 交流区',
      'ch-6-name': '提问区',
      'ch-6-desc': '任何交易问题，Daniel 亲自一对一解答',
      'ch-7-name': '闲聊聊',
      'ch-7-desc': '与数百位志同道合的交易者自由交流，共同进步',
      'coming-soon': '🚀 更多功能持续进化中',
      'coming-soon-text': '量化交易指标、自动信号推送等高阶功能正在开发，敬请期待',
      'community-cta-discord': '加入 Discord 社群',
      'community-cta-yt': '订阅 YouTube 频道',
      'videos-label': '最新内容',
      'videos-title': '热门视频',
      'videos-desc': '精选近期高播放量视频，覆盖市场热点与实盘操作',
      'videos-cta': '查看全部125个视频 →',
      'playlists-label': '系列内容',
      'playlists-title': '精选播放列表',
      'pl-1-title': '日更复盘和交易总结',
      'pl-1-desc': '每日公开账户操作，实时跟踪持仓变化与市场解读',
      'pl-2-title': '交易及投资干货，必看！',
      'pl-2-desc': '精华交易方法论，从入门到进阶的核心知识',
      'pl-3-title': '个股分析',
      'pl-3-desc': 'TSLA、BABA、半导体深度研究，挖掘潜力标的',
      'pl-link': '查看系列 →',
      'disclaimer': '⚠️ 免责声明：本频道仅用于分享投资经验，不作为任何个人、机构、法律、税务或会计顾问等投资建议。投资有风险，交易需谨慎。',
      'footer-brand-desc': '实盘记录美股交易，分享真实操作逻辑',
      'footer-links-title': '快速链接',
      'footer-yt': 'YouTube 频道',
      'footer-discord': 'Discord 社群',
      'footer-partners-title': '合作伙伴',
      'footer-seeking': 'Seeking Alpha（7天免费试用）',
      'footer-longbridge': '长桥港美股开户（HK）',
      'footer-copy': '© 2025 双侧玩美股 · Daniel Wu · All rights reserved',
    },
    en: {
      'logo-text': 'Dualpha',
      'nav-about': 'About',
      'nav-videos': 'Videos',
      'nav-community': 'Community',
      'nav-discord': 'Join',
      'hero-badge': 'Live Trader',
      'hero-title': '<span class="accent">Dualpha</span>',
      'hero-sub': 'Live Trades · Daily Recaps · Long & Short · Real-Time<br/>Understanding US Markets Together',
      'stat-subscribers': 'Subscribers',
      'stat-videos': 'Videos',
      'stat-freq': 'Update Rate',
      'stat-daily': 'Daily',
      'hero-discord-main': 'Join Discord',
      'hero-discord-sub': 'Get real-time trade updates',
      'scroll-hint': 'Scroll Down',
      'about-label': 'About',
      'about-title': 'Real Account,<br/><span class="accent">Transparent Trading</span>',
      'about-p1': 'Dualpha is a channel dedicated to live US stock trading. Daniel posts daily recap videos, openly sharing his account positions and the real logic behind every trade.',
      'about-p2': 'From individual stock analysis to macro market reads, short-term swings to long-term positions — every move is documented transparently in real time.',
      'feature-1-title': 'Daily Recap',
      'feature-1-desc': 'Open account positions, daily video trading summaries',
      'feature-2-title': 'Long & Short',
      'feature-2-desc': 'Trading both sides — capturing opportunities in up and down markets',
      'feature-3-title': 'Stock Analysis',
      'feature-3-desc': 'Deep dives into TSLA, BABA, semiconductors, and more',
      'profile-tag-1': 'Live Trading',
      'profile-tag-2': 'Long & Short',
      'profile-tag-3': 'US Stocks',
      'community-label': 'Community',
      'community-title': 'Real-Time Updates, Together',
      'community-p': 'Join the Discord — every entry, add, take profit, and stop loss from Daniel\'s live account is posted in real time. Never miss a trade. Plus 1-on-1 Q&A and weekly live streams.',
      'ch-cat-1': '📊 Trading Channels',
      'ch-1-name': "daniel's market thoughts",
      'ch-1-desc': "Daniel's daily market commentary and trade rationale",
      'ch-2-name': 'swing trades · live',
      'ch-2-desc': 'Real-time swing trade entries, adds, profits & stops',
      'ch-3-name': 'position trades · live',
      'ch-3-desc': 'Long-term positioning and portfolio changes in real time',
      'ch-4-name': 'member stock picks',
      'ch-4-desc': 'Breakout opportunities discovered and shared by members',
      'ch-5-name': 'market news & updates',
      'ch-5-desc': 'Key financial news and account changes as they happen',
      'ch-cat-2': '💬 Discussion',
      'ch-6-name': 'q&a',
      'ch-6-desc': 'Ask Daniel anything — he answers every question personally',
      'ch-7-name': 'general chat',
      'ch-7-desc': 'Free discussion with hundreds of like-minded traders',
      'coming-soon': '🚀 More Features Coming',
      'coming-soon-text': 'Quantitative indicators, automated trade signals, and more — in development',
      'community-cta-discord': 'Join Discord Community',
      'community-cta-yt': 'Subscribe on YouTube',
      'videos-label': 'Latest',
      'videos-title': 'Latest Videos',
      'videos-desc': 'Recent high-view videos covering market moves and live trades',
      'videos-cta': 'View All 125 Videos →',
      'playlists-label': 'Series',
      'playlists-title': 'Playlists',
      'pl-1-title': 'Daily Recap & Trade Summary',
      'pl-1-desc': 'Daily account activity — tracking positions and market analysis in real time',
      'pl-2-title': 'Trading & Investing Essentials',
      'pl-2-desc': 'Core trading methodology, from beginner to advanced',
      'pl-3-title': 'Stock Analysis',
      'pl-3-desc': 'Deep research on TSLA, BABA, semiconductors, and more',
      'pl-link': 'View Series →',
      'disclaimer': '⚠️ Disclaimer: This channel is for educational purposes only and does not constitute investment, legal, tax, or accounting advice. All trading involves risk — invest responsibly.',
      'footer-brand-desc': 'Documenting live US stock trades & sharing real trading logic',
      'footer-links-title': 'Quick Links',
      'footer-yt': 'YouTube Channel',
      'footer-discord': 'Discord Community',
      'footer-partners-title': 'Partners',
      'footer-seeking': 'Seeking Alpha (7-Day Free Trial)',
      'footer-longbridge': 'Longbridge HK Brokerage',
      'footer-copy': '© 2025 Dualpha · Daniel Wu · All rights reserved',
    },
  };

  // Keys that contain HTML (use innerHTML instead of textContent)
  const htmlKeys = new Set(['hero-title', 'hero-sub', 'about-title']);

  function applyLang(lang) {
    const t = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh' ? '双侧玩美股 | Daniel Wu' : 'Dualpha | Daniel Wu';
    localStorage.setItem('lang', lang);
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中';
  }

  const savedLang = localStorage.getItem('lang') || 'zh';
  applyLang(savedLang);

  document.getElementById('langToggle')?.addEventListener('click', function () {
    const current = localStorage.getItem('lang') || 'zh';
    applyLang(current === 'zh' ? 'en' : 'zh');
  });
})();
