// tilt: the page. Intro, the live board, how it works, bag check, the hedge drawer and the chip rain at the end.
import { createTable, END } from './stage.js';
import { $, $$, split, countTo, reveals, magnetic, ambient, smoothScroll } from './fx.js';

const html = document.documentElement, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760 || !matchMedia('(pointer: fine)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtUsd = v => v == null ? '—' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : v >= 1 ? '$' + v.toFixed(2) : v > 0 ? '$' + v.toPrecision(2) : '$0';
const fmtAge = m => m < 1 ? 'just now' : m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : Math.floor(m / 1440) + 'd';
const pct = v => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0) + '%';
const cls = v => v == null || Math.abs(v) < .05 ? 'flat' : v < 0 ? 'neg' : 'pos';
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const PAL = ['#f6eddc', '#d4ff3f', '#ff8d98', '#c9a45a', '#b8a3ff', '#7fe3d0'];
const avatar = (img, name, size = '') => img ? `<span class="av"${size}><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='${esc((name || '?').trim()[0] || '?').replace(/'/g, '')}'"></span>`
  : `<span class="av" style="background:${PAL[hue(name) % PAL.length]}${size ? ';' + size : ''}">${esc((name || '?').trim()[0] || '?')}</span>`;

const scroller = smoothScroll();
reveals(); magnetic(); ambient();

// ───────────── intro + hero ─────────────
const intro = html.classList.contains('intro');
const stage = createTable($('#table'), { intro, mobile });
const CAPS = ['02:47 am', 'down 62% on the bag', 'everyone is on tilt', ''];
const cap = $('#cap');
stage.st.onBeat = b => { if (!cap) return; cap.classList.add('off'); setTimeout(() => { cap.innerHTML = (CAPS[b] || '').split('').map((c, i) => `<span style="transition-delay:${i * 22}ms">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join(''); cap.classList.remove('off'); void cap.offsetWidth; cap.classList.add('on'); }, b === 0 ? 0 : 380); };
function revealHero() {
  html.classList.remove('boot');
  $$('.hero-copy .rise').forEach((el, i) => el.style.setProperty('--d', (.35 + i * .14) + 's'));
  $('.hero-foot').style.setProperty('--d', '1.1s'); $('#ticker').style.setProperty('--d', '1s');
  split($('#h1')); requestAnimationFrame(() => $('#h1').classList.add('in'));
}
if (intro) {
  const bar = $('#ibar'); const t0 = performance.now();
  const tick = () => { if (!html.classList.contains('intro')) return; bar.style.transform = `scaleX(${Math.min(1, (performance.now() - t0) / 1000 / END)})`; requestAnimationFrame(tick); }; tick();
  const skip = () => stage.skip();
  $('#skip').addEventListener('click', skip); addEventListener('keydown', e => { if (html.classList.contains('intro') && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) skip(); });
  addEventListener('wheel', e => { if (html.classList.contains('intro') && Math.abs(e.deltaY) > 30) skip(); }, { passive: true });
  addEventListener('touchmove', () => { if (html.classList.contains('intro')) skip(); }, { passive: true });
  const imark = $('#imark');
  stage.st.onThunk = () => imark.classList.add('on');
  stage.st.onIntroEnd = () => {
    try { sessionStorage.setItem('tilt.seen', 1); } catch (e) {}
    if (cap) cap.classList.add('off');
    if (!imark.classList.contains('on')) imark.classList.add('on');
    // the wordmark flies into the nav: measure where the nav's "tilt" will sit, then move there
    const nav = $('#nav'), bt = $('.brand .bt'); html.classList.add('handoff');
    nav.style.transition = 'none'; html.classList.remove('intro'); const tr = bt.getBoundingClientRect(); html.classList.add('intro'); void nav.offsetWidth; nav.style.transition = '';
    const r = imark.getBoundingClientRect(), k = tr.height / r.height * 1.06;
    imark.style.transition = 'none'; imark.style.left = '0'; imark.style.top = '0'; imark.style.transform = `translate(${r.left}px, ${r.top}px)`; void imark.offsetWidth; imark.style.transition = '';
    imark.classList.add('fly'); imark.style.transform = `translate(${tr.left}px, ${tr.top - (r.height * k - tr.height) / 2}px) scale(${k})`;
    html.classList.remove('intro'); revealHero();
    setTimeout(() => { html.classList.remove('handoff'); imark.classList.add('gone'); }, 950);
    setTimeout(() => imark.remove(), 1500);
  };
} else { $('#imark').remove(); split($('#h1')); requestAnimationFrame(() => requestAnimationFrame(() => revealHero())); }
addEventListener('scroll', () => { stage.st.reel = Math.min(1, scrollY / innerHeight); }, { passive: true });

// ───────────── the board ─────────────
let DATA = null, VIEW = 'new', SEEN = new Set(), FIRST = true, LAST_AT = 0;
async function loadPairs() {
  try {
    const r = await fetch('/api/pairs', { cache: 'no-store' }); const j = await r.json(); if (!j.ok) throw new Error(j.reason || 'feed error');
    DATA = j; LAST_AT = j.at || Date.now(); renderAll();
  } catch (e) { if (!DATA) failBoard(e.message); }
}
function failBoard(msg) {
  $('#heroPill span').textContent = 'the pump.fun feed is not answering right now'; $('#mSrc').textContent = 'feed error: ' + msg;
  $('#rows').innerHTML = `<div class="empty">The feed isn't answering right now (${esc(msg)}). It retries every 20 seconds.</div>`;
}
function renderAll() {
  const s = DATA.sample || {};
  if (s.downPct != null) {
    $('#heroPill span').innerHTML = `<b>${s.downPct}%</b> of the last ${s.n} pump.fun pairs trade below their first price`;
    countTo($('#mPct'), s.downPct, { dur: FIRST ? 1800 : 900 });
    $('#mTxt').textContent = `of the last ${s.n} pump.fun pairs, launched in the past ${s.spanMin || 1} minutes, already trade below their first price.`;
  }
  $('#mSrc').textContent = (DATA.dev ? 'DEV FIXTURE · ' : '') + 'GeckoTerminal new pools · pump.fun only' + (DATA.stale ? ' · showing the last good read' : '');
  renderHist(s.bins || []); renderRows(); renderTicker(); FIRST = false;
}
function renderHist(bins) {
  const el = $('#hist'), max = Math.max(1, ...bins.map(b => b.n));
  const key = b => b.lo == null ? '< −75%' : b.hi == null ? '> +100%' : (b.lo < 0 ? '−' + Math.abs(b.lo) : '+' + b.lo) + '…' + (b.hi <= 0 ? (b.hi === 0 ? '0' : '−' + Math.abs(b.hi)) : '+' + b.hi);
  if (!el.children.length) { el.innerHTML = bins.map((b, i) => `<div class="b${b.lo != null && b.lo >= 0 ? ' up' : ''}" style="--i:${i}"><span class="n">0</span><div class="bar"></div><span class="k">${key(b)}</span></div>`).join('');
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: .3 }).observe(el); }
  bins.forEach((b, i) => { const c = el.children[i]; if (!c) return; c.querySelector('.bar').style.height = Math.max(2, b.n / max * 100) + '%'; countTo(c.querySelector('.n'), b.n, { dur: 900 }); });
}
function rowsFor(view) {
  const p = (DATA?.pairs || []).slice();
  if (view === 'dump') return p.filter(x => x.chg != null && x.chg < 0).sort((a, b) => a.chg - b.chg);
  if (view === 'run') return p.filter(x => x.chg != null && x.chg > 0).sort((a, b) => b.chg - a.chg);
  return p.sort((a, b) => a.ageMin - b.ageMin);
}
function renderRows() {
  const list = rowsFor(VIEW).slice(0, 24), box = $('#rows');
  if (!list.length) { box.innerHTML = `<div class="empty">${VIEW === 'run' ? 'Nothing in this batch is above its first price right now.' : 'No pairs in this view right now.'}</div>`; return; }
  box.innerHTML = list.map(p => { const tot = p.buys + p.sells, bw = tot ? p.buys / tot * 100 : 50, isNew = !FIRST && !SEEN.has(p.mint);
    return `<div class="r${isNew ? ' new' : ''}" data-m="${esc(p.mint)}">
      <div class="pr c-pair">${avatar(p.img, p.name)}<div class="pn"><b>${esc(p.name || p.symbol || 'unnamed')}</b><small>$${esc(p.symbol || '—')}</small></div></div>
      <span class="c-age">${fmtAge(p.ageMin)}</span><span class="c-val">${fmtUsd(p.fdv)}</span>
      <span class="c-chg chg ${cls(p.chg)}">${pct(p.chg)}</span>
      <span class="c-bs"><span class="bs"><i class="b1" style="width:${bw}%"></i><i class="b2" style="width:${100 - bw}%"></i></span><span class="bsl">${p.buys} buys · ${p.sells} sells</span></span>
      <button class="hg c-h" type="button" data-m="${esc(p.mint)}">hedge</button></div>`; }).join('');
  list.forEach(p => SEEN.add(p.mint));
}
$('#bTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; VIEW = b.dataset.v; $$('#bTabs button').forEach(x => x.classList.toggle('on', x === b)); if (DATA) renderRows(); });
$('#rows').innerHTML = Array.from({ length: 6 }, () => '<div class="skel"></div>').join('');
setInterval(() => { if (!LAST_AT) return; const s = Math.round((Date.now() - LAST_AT) / 1000); $('#bAt').textContent = 'updated ' + (s < 5 ? 'just now' : s + 's ago') + ' · refreshes every 20s'; }, 1000);
loadPairs(); setInterval(() => { if (!document.hidden) loadPairs(); }, 20000);

// ticker: the newest pairs, drifting left forever
let tkX = 0, tkW = 0, tkPause = false, tkBoost = 0;
function renderTicker() {
  const items = (DATA?.pairs || []).slice(0, 28); if (!items.length) return;
  const one = items.map(p => `<span class="it">${avatar(p.img, p.name)}<b>$${esc(p.symbol || p.name)}</b><em class="${cls(p.chg)}">${pct(p.chg)}</em><small>${fmtAge(p.ageMin)}</small></span>`).join('');
  const tk = $('#tk'); tk.innerHTML = one + one; tkW = tk.scrollWidth / 2;
}
$('#ticker').addEventListener('pointerenter', () => tkPause = true); $('#ticker').addEventListener('pointerleave', () => tkPause = false);
(function spin() { if (tkW && !RM) { if (!tkPause) tkX -= .45 + tkBoost; if (-tkX >= tkW) tkX += tkW; $('#tk').style.transform = `translate3d(${tkX}px,0,0)`; } requestAnimationFrame(spin); })();

// ───────────── how it works: scroll-driven ─────────────
const vis = $('#vis'), steps = $$('#steps li'), pin = $('#pin');
const chips = $$('.v-chip', vis);
function setHow(p) {
  const st = Math.min(3, Math.floor(p * 4 + .0001)); steps.forEach((li, i) => li.classList.toggle('on', i === st));
  const k = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  const k0 = k(0, .14), k1 = k(.25, .38), k2 = k(.5, .66), k3 = k(.75, .92), k4 = k(.92, 1);
  const set = (n, v) => vis.style.setProperty(n, v);
  set('--bo', k0); set('--bx', (-40 + 40 * k0) + 'px'); set('--br', (-10 + 6 * k0 - 4 * k2) + 'deg'); set('--by', (-k2 * 18) + 'px');
  set('--po', k1); set('--px', (40 - 40 * k1) + 'px'); set('--pr', (10 - 6 * k1 + 4 * k2) + 'deg'); set('--py', (-k2 * 18) + 'px');
  set('--ko', k2); set('--ks', .6 + .4 * k2); set('--cho', k2 > 0 ? Math.min(1, k2 * 3) * (1 - k(.8, .9)) : 0); set('--hs', (50 + 12 * k2) + '%'); // the hedge side grows as chips land
  const W = vis.clientWidth, H = vis.clientHeight, cx = W * .5, cy = H * .58;
  chips.forEach((c, i) => { const ox = c.offsetLeft + c.offsetWidth / 2, oy = c.offsetTop + c.offsetHeight / 2; const kk = Math.max(0, Math.min(1, k2 * 1.4 - i * .08));
    c.style.setProperty(`--c${i + 1}x`, ((cx - ox) * kk + Math.sin(i * 2) * W * .05 * kk) + 'px'); c.style.setProperty(`--c${i + 1}y`, ((cy - oy) * kk + Math.cos(i * 2) * H * .05 * kk) + 'px'); });
  set('--co', k3 > 0 ? 1 : 0); const mins = Math.round(k3 * 24 * 60); $('#vClock').textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  set('--ro', k4); set('--rs', .85 + .15 * k4); set('--hs', (50 + 12 * k2 + 38 * k4) + '%');
}
const pinned = () => innerWidth > 980;
let autoT = 0;
function howLoop(now) {
  if (pinned()) { const r = pin.getBoundingClientRect(), span = pin.offsetHeight - innerHeight; setHow(Math.max(0, Math.min(1, -r.top / span))); }
  else { const r = vis.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { autoT += 1 / 60; setHow((autoT % 11) / 10 > 1 ? 1 : (autoT % 11) / 10); } }
  requestAnimationFrame(howLoop);
}
requestAnimationFrame(howLoop);

// ───────────── bag check ─────────────
let BAG = null; try { BAG = JSON.parse(localStorage.getItem('tilt.bag') || 'null'); } catch (e) {}
const bagres = $('#bagres');
async function checkBags(owner) {
  owner = owner.trim(); if (!owner) { bagres.innerHTML = `<div class="bagmsg">Paste a wallet address first.</div>`; return; }
  bagres.innerHTML = Array.from({ length: 3 }, () => '<div class="bag skel" style="height:140px"></div>').join('');
  try {
    const r = await fetch('/api/bags?owner=' + encodeURIComponent(owner)); const j = await r.json(); if (!j.ok) throw new Error(j.reason || 'could not read that wallet');
    const sum = `<div class="bagsum"><span>wallet <b>${esc(owner.slice(0, 4))}…${esc(owner.slice(-4))}</b></span><span><b>${(j.sol || 0).toFixed(3)}</b> SOL</span><span><b>${j.count}</b> tokens held</span>${j.dev ? '<span>DEV FIXTURE</span>' : ''}</div>`;
    if (!j.bags.length) { bagres.innerHTML = sum + `<div class="bagmsg">No memecoins in this wallet right now.</div>`; return; }
    bagres.innerHTML = sum + j.bags.map((b, i) => `<button type="button" class="bag rv in${BAG && BAG.mint === b.mint ? ' sel' : ''}" data-i="${i}" style="--d:${i * .04}s">
      <div class="top">${avatar(b.icon, b.name || b.symbol)}<div class="pn"><b>${esc(b.name || 'unknown token')}</b><small>$${esc(b.symbol || b.mint.slice(0, 4))}${b.pump ? ' · pump.fun' : ''}</small></div></div>
      <div class="v"><span>${fmtUsd(b.usd)}</span><span class="${cls(b.chg24)}">${pct(b.chg24)} <small style="color:var(--dim)">24h</small></span></div>
      <div class="pick">${BAG && BAG.mint === b.mint ? '✓ your hedge bag' : 'use as my hedge bag'}</div></button>`).join('');
    $$('.bag', bagres).forEach(el => el.addEventListener('click', () => { const b = j.bags[+el.dataset.i]; BAG = { mint: b.mint, name: b.name, symbol: b.symbol, icon: b.icon, usd: b.usd };
      try { localStorage.setItem('tilt.bag', JSON.stringify(BAG)); } catch (e) {}
      $$('.bag', bagres).forEach(x => { x.classList.toggle('sel', x === el); x.querySelector('.pick').textContent = x === el ? '✓ your hedge bag' : 'use as my hedge bag'; }); }));
  } catch (e) { bagres.innerHTML = `<div class="bagmsg">${esc(e.message)}</div>`; }
}
$('#bagform').addEventListener('submit', e => { e.preventDefault(); checkBags($('#addr').value); });
$('#connect').addEventListener('click', async () => {
  const w = window.phantom?.solana || window.backpack || window.solflare || window.solana;
  if (!w) { bagres.innerHTML = `<div class="bagmsg">No Solana wallet found in this browser. Paste an address instead.</div>`; return; }
  try { const r = await w.connect(); const pk = (r?.publicKey || w.publicKey).toString(); $('#addr').value = pk; checkBags(pk); }
  catch (e) { bagres.innerHTML = `<div class="bagmsg">The wallet didn't connect (${esc(e.message || 'cancelled')}).</div>`; }
});

// ───────────── the hedge drawer ─────────────
const drawer = $('#drawer'), scrim = $('#scrim');
function openDrawer(mint) {
  const p = (DATA?.pairs || []).find(x => x.mint === mint); if (!p) return;
  let side = 'h';
  const bag = BAG ? `<div class="d-bag">${avatar(BAG.icon, BAG.name || BAG.symbol)}<div><b>${esc(BAG.name || BAG.symbol)}</b><br><span style="color:var(--dim)">${fmtUsd(BAG.usd)} when you checked</span></div></div>`
    : `<div class="d-bag">No bag picked yet. <a href="#bags" data-close>Check your bags</a></div>`;
  $('#dBody').innerHTML = `
    <div class="ch mono">fresh pump.fun pair</div>
    <div class="d-h">${avatar(p.img, p.name)}<div><b>${esc(p.name)}</b><span class="mono" style="color:var(--dim)">$${esc(p.symbol)} · ${fmtAge(p.ageMin)} old</span></div></div>
    <div class="d-stats"><div><small>since first trade</small><span class="${cls(p.chg)}">${pct(p.chg)}</span></div><div><small>value</small>${fmtUsd(p.fdv)}</div><div><small>last hour</small>${p.buys} buys · ${p.sells} sells</div><div><small>volume</small>${fmtUsd(p.vol)}</div></div>
    <div class="d-sec"><div class="ch mono">your side</div><div class="sides"><button class="h on" data-s="h"><b>HEDGE</b><span>it dumps from here</span></button><button class="o" data-s="o"><b>HOLD</b><span>it holds its first price</span></button></div></div>
    <div class="d-sec"><div class="ch mono">your stake</div>${bag}</div>
    <button class="btn wide" disabled>pots open soon</button>
    <div class="d-note">Pots need their program on mainnet first. When it's live, this opens this pair's pot with your bag as the stake: sold for SOL at market, settled once, 24 hours after the pot opens.</div>
    <div class="d-links"><a href="https://pump.fun/coin/${encodeURIComponent(p.mint)}" target="_blank" rel="noopener">pump.fun ↗</a><a href="https://dexscreener.com/solana/${encodeURIComponent(p.mint)}" target="_blank" rel="noopener">chart ↗</a><a href="https://solscan.io/token/${encodeURIComponent(p.mint)}" target="_blank" rel="noopener">solscan ↗</a></div>`;
  $$('.sides button', drawer).forEach(b => b.addEventListener('click', () => { side = b.dataset.s; $$('.sides button', drawer).forEach(x => x.classList.toggle('on', x === b)); }));
  $$('[data-close]', drawer).forEach(a => a.addEventListener('click', closeDrawer));
  drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false');
}
function closeDrawer() { drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true'); }
$('#rows').addEventListener('click', e => { const b = e.target.closest('.hg'); if (b) openDrawer(b.dataset.m); });
$('#dClose').addEventListener('click', closeDrawer); scrim.addEventListener('click', closeDrawer); addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// ───────────── the end: chips raining onto the felt ─────────────
(function rain() {
  const cv = $('#rain'), x = cv.getContext('2d'); let W = 0, H = 0, D = 1, on = false; const P = [];
  const sprite = (a, b) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? b : a; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 62, i / 16 * Math.PI * 2, (i + 1) / 16 * Math.PI * 2); g.fill(); }
    g.fillStyle = '#1e0a10'; g.beginPath(); g.arc(0, 0, 38, 0, 7); g.fill(); g.strokeStyle = 'rgba(246,237,220,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 61, 0, 7); g.stroke();
    g.strokeStyle = '#f6eddc'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-20, 2); g.bezierCurveTo(-14, -8, -9, -10, -4, -10); g.bezierCurveTo(4, -10, 8, -2, 12, 6); g.stroke(); return c; };
  const S = [sprite('#f6eddc', '#a3122b'), sprite('#1e0a10', '#d4ff3f'), sprite('#a3122b', '#f6eddc')];
  const size = () => { D = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * D; cv.height = H * D; x.setTransform(D, 0, 0, D, 0, 0); };
  size(); addEventListener('resize', size);
  new IntersectionObserver(es => { on = es[0].isIntersecting; }, { threshold: .05 }).observe(cv);
  let mx = -999, my = -999; cv.parentElement.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  const add = () => P.push({ x: Math.random() * W, y: -40, vx: (Math.random() - .5) * .6, vy: 1 + Math.random() * 1.5, r: 14 + Math.random() * 18, a: Math.random() * 6, va: (Math.random() - .5) * .06, f: Math.random() * 6, vf: .03 + Math.random() * .05, s: S[Math.floor(Math.random() * 3)] });
  (function loop() { requestAnimationFrame(loop); if (!on || RM) return; x.clearRect(0, 0, W, H); if (P.length < (mobile ? 22 : 46) && Math.random() < .25) add();
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.vy += .025; p.x += p.vx; p.y += p.vy; p.a += p.va; p.f += p.vf;
      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy); if (d < 120) { p.vx += dx / d * .5; p.vy += dy / d * .3; }
      if (p.y > H + 60) { P.splice(i, 1); continue; }
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.scale(1, Math.max(.12, Math.abs(Math.cos(p.f)))); x.globalAlpha = .9; x.drawImage(p.s, -p.r, -p.r, p.r * 2, p.r * 2); x.restore(); } })();
})();

// ───────────── v2: the gauge, the spread, the tape ─────────────
const gauge = { a: -90, v: 0, target: -90 };
(() => { const g = $('#gTicks'); let h = ''; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 - i / 10), x1 = 120 + Math.cos(a) * 84, y1 = 120 - Math.sin(a) * 84, x2 = 120 + Math.cos(a) * (i % 5 ? 78 : 72), y2 = 120 - Math.sin(a) * (i % 5 ? 78 : 72); h += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; } g.innerHTML = h; })();
function setGauge(pctv) { gauge.target = -90 + pctv * 1.8; $('#gArc').style.strokeDashoffset = 314.16 * (1 - pctv / 100); }
(function needle(now) { const g = gauge; g.v += (g.target - g.a) * .035; g.v *= .86; g.a += g.v; const jit = g.target > -90 ? Math.sin(now / 90) * .6 + Math.sin(now / 37) * .35 : 0;
  $('#gNeedle').setAttribute('transform', `rotate(${(g.a + jit).toFixed(2)} 120 120)`); requestAnimationFrame(needle); })(0);

// the spread: every pair is a dot. age across, move since first trade up and down. New pairs drop in.
const SP = { cv: $('#spread'), dots: new Map(), w: 0, h: 0, hover: null };
const slog = c => Math.sign(c) * Math.log10(1 + Math.abs(c) / 10), YT = slog(500), YB = slog(-100);
function spSize() { const c = SP.cv, d = Math.min(2, devicePixelRatio || 1); SP.w = c.clientWidth; SP.h = c.clientHeight; c.width = SP.w * d; c.height = SP.h * d; c.getContext('2d').setTransform(d, 0, 0, d, 0, 0); }
spSize(); addEventListener('resize', spSize);
const PADL = 44, PADR = 12, PADT = 10, PADB = 26;
const sx = (age, span) => PADL + (SP.w - PADL - PADR) * Math.min(1, age / Math.max(1, span));
const sy = c => PADT + (SP.h - PADT - PADB) * (YT - slog(Math.max(-99, Math.min(500, c)))) / (YT - YB);
function spUpdate() {
  const pairs = DATA?.pairs || [], span = Math.max(3, DATA?.sample?.spanMin || 3), live = new Set();
  for (const p of pairs) { if (p.chg == null) continue; live.add(p.mint); let d = SP.dots.get(p.mint);
    const tx = sx(p.ageMin, span), ty = sy(p.chg);
    if (!d) { d = { x: tx, y: -12, vy: 0, a: 0, born: performance.now() }; SP.dots.set(p.mint, d); }
    Object.assign(d, { tx, ty, p, dead: false }); }
  for (const [m, d] of SP.dots) if (!live.has(m)) d.dead = true;
}
(function spDraw() {
  requestAnimationFrame(spDraw); const c = SP.cv, x = c.getContext('2d'), W = SP.w, H = SP.h; if (!W || c.getBoundingClientRect().bottom < 0 || c.getBoundingClientRect().top > innerHeight) return;
  x.clearRect(0, 0, W, H); x.font = '500 10px JBM, monospace'; x.textBaseline = 'middle';
  for (const [c0, lab] of [[300, '+300%'], [100, '+100%'], [0, 'first price'], [-50, '−50%'], [-90, '−90%']]) { const y = sy(c0); x.strokeStyle = c0 === 0 ? 'rgba(246,237,220,.35)' : 'rgba(246,237,220,.07)'; x.setLineDash(c0 === 0 ? [4, 5] : []); x.beginPath(); x.moveTo(PADL, y); x.lineTo(W - PADR, y); x.stroke(); x.setLineDash([]); x.fillStyle = c0 === 0 ? 'rgba(246,237,220,.7)' : 'rgba(246,237,220,.35)'; x.textAlign = 'right'; x.fillText(c0 === 0 ? '0%' : lab, PADL - 8, y); }
  x.textAlign = 'left'; x.fillStyle = 'rgba(246,237,220,.35)'; x.fillText('just launched', PADL, H - 9); x.textAlign = 'right'; x.fillText((DATA?.sample?.spanMin || 3) + 'm ago', W - PADR, H - 9);
  const below = sy(0); x.fillStyle = 'rgba(255,93,108,.04)'; x.fillRect(PADL, below, W - PADL - PADR, H - PADB - below);
  for (const [m, d] of SP.dots) {
    if (d.dead) { d.a -= .03; if (d.a <= 0) { SP.dots.delete(m); continue; } } else d.a = Math.min(1, d.a + .05);
    d.x += (d.tx - d.x) * .08; if (d.y < d.ty - .5 || d.vy) { d.vy += .6; d.y += d.vy; if (d.y > d.ty) { d.y = d.ty; d.vy = Math.abs(d.vy) > 2 ? -d.vy * .35 : 0; } } else d.y += (d.ty - d.y) * .1;
    const neg = d.p.chg < 0, r = 4 + Math.min(6, Math.sqrt((d.p.fdv || 3000) / 3000) * 2.2), hov = SP.hover === m;
    x.globalAlpha = d.a; x.fillStyle = neg ? '#ff5d6c' : d.p.chg > 0 ? '#d4ff3f' : '#f6eddc';
    x.shadowColor = x.fillStyle; x.shadowBlur = hov ? 18 : 8; x.beginPath(); x.arc(d.x, d.y, hov ? r + 3 : r, 0, 7); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = 'rgba(30,10,16,.8)'; x.lineWidth = 1.5; x.beginPath(); x.arc(d.x, d.y, (hov ? r + 3 : r) * .45, 0, 7); x.stroke(); x.globalAlpha = 1;
  }
})();
SP.cv.addEventListener('pointermove', e => { const r = SP.cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 16;
  for (const [m, d] of SP.dots) { const dd = Math.hypot(d.x - mx, d.y - my); if (dd < bd && !d.dead) { bd = dd; best = m; } }
  SP.hover = best; const tip = $('#tip'); if (!best) { tip.classList.remove('on'); return; } const d = SP.dots.get(best);
  tip.innerHTML = `<b>$${esc(d.p.symbol || d.p.name)}</b> <span class="${cls(d.p.chg)}">${pct(d.p.chg)}</span> · ${fmtAge(d.p.ageMin)} · ${fmtUsd(d.p.fdv)}`; tip.style.left = (d.x + 22) + 'px'; tip.style.top = (d.y + 50) + 'px'; tip.classList.add('on'); });
SP.cv.addEventListener('pointerleave', () => { SP.hover = null; $('#tip').classList.remove('on'); });
SP.cv.addEventListener('click', () => { if (SP.hover) openDrawer(SP.hover); });

// the tape: what changed between two reads of the feed
let PREV = null; const TAPE = [];
function tapeUpdate() {
  const now = new Date(), t = now.toTimeString().slice(0, 8), cur = new Map((DATA?.pairs || []).map(p => [p.mint, p])), ev = [];
  if (PREV) { let news = 0;
    for (const [m, p] of cur) { const o = PREV.get(m), sym = '$' + (p.symbol || p.name);
      if (!o) { if (news++ < 5) ev.push(['new', 'NEW', `${sym} launched · ${fmtUsd(p.fdv)}`]); continue; }
      if (o.chg == null || p.chg == null) continue;
      if (o.chg > -50 && p.chg <= -50) ev.push(['half', '−50%', `${sym} is down ${pct(p.chg).slice(1)} from its first trade`]);
      else if (o.chg >= 0 && p.chg < 0) ev.push(['below', 'BELOW', `${sym} fell under its first price`]);
      else if (o.chg < 0 && p.chg >= 0) ev.push(['up', 'BACK', `${sym} is back above its first price`]); } }
  else ev.push(['dim', '', `watching ${cur.size} pairs from the feed`]);
  PREV = cur; if (!ev.length) return;
  const box = $('#tape'); if (box.querySelector('.tx.dim') && PREV) box.innerHTML = '';
  for (const [k, lab, txt] of ev.reverse()) { TAPE.unshift(1); const el = document.createElement('div'); el.className = 'tx mono' + (k === 'dim' ? ' dim' : '');
    el.innerHTML = k === 'dim' ? esc(txt) : `<time>${t}</time><span class="k ${k}">${lab}</span><span>${esc(txt)}</span>`; box.prepend(el); }
  while (box.children.length > 40) box.lastChild.remove();
}

// hook the new pieces into every read of the feed
const _renderAll = renderAll;
renderAll = function () { _renderAll(); if (DATA?.sample?.downPct != null) setGauge(DATA.sample.downPct); spUpdate(); tapeUpdate(); };

// ───────────── v2: the pot calculator ─────────────
(function calc() {
  let side = 'h'; const C = 490.09, stake = $('#cStake'), hP = $('#cH'), oP = $('#cO');
  const fill = el => el.style.setProperty('--f', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  function run() {
    [stake, hP, oP].forEach(fill);
    const s = +stake.value, H = +hP.value + (side === 'h' ? s : 0), O = +oP.value + (side === 'o' ? s : 0), mine = side === 'h' ? H : O, other = side === 'h' ? O : H;
    const profit = mine > 0 ? s / mine * other : 0, pot = H + O;
    $('#cStakeV').textContent = s.toFixed(2) + ' SOL'; $('#cHV').textContent = (+hP.value).toFixed(1) + ' SOL'; $('#cOV').textContent = (+oP.value).toFixed(1) + ' SOL';
    $('#cWin').textContent = '+' + profit.toFixed(profit < 10 ? 3 : 1) + ' SOL'; $('#cWinP').textContent = '×' + ((s + profit) / s).toFixed(2) + ' back';
    $('#cLose').textContent = '−' + s.toFixed(2) + ' SOL'; $('#cPot').textContent = pot.toFixed(pot < 100 ? 1 : 0);
    const hf = pot ? H / pot : .5, aH = $('#cArcH'), aO = $('#cArcO');
    aH.style.strokeDasharray = `${C * hf} ${C}`; aO.style.strokeDasharray = `${C * (1 - hf)} ${C}`; aO.style.transform = `rotate(${hf * 360}deg)`;
  }
  [stake, hP, oP].forEach(el => el.addEventListener('input', run));
  $('#cSide').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; side = b.dataset.v; $$('#cSide button').forEach(x => x.classList.toggle('on', x === b)); run(); });
  run();
})();

// ───────────── v2: motion that follows the scroll ─────────────
let lastY = scrollY, vel = 0;
const bands = [[$('#band1'), 1], [$('#band2'), -1]], h2s = $$('.sec h2');
(function scrollFx() {
  const dy = scrollY - lastY; lastY = scrollY; vel += (dy - vel) * .15;
  for (const [el, dir] of bands) { if (!el) continue; const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    const w = el.scrollWidth / 2, off = ((r.top - innerHeight) * .55 * dir) % w; el.style.transform = `translate3d(${dir > 0 ? off - w * .25 : -w * .25 - off}px,0,0) skewX(${Math.max(-8, Math.min(8, -vel * .25))}deg)`; }
  const sk = Math.max(-2.5, Math.min(2.5, vel * .06)); for (const h of h2s) h.style.transform = Math.abs(sk) > .05 ? `skewY(${sk}deg)` : '';
  tkBoost = Math.min(6, Math.abs(vel) * .08);
  requestAnimationFrame(scrollFx);
})();

// 3D hover tilt with a sheen that follows the pointer
function tiltify(el) { if (!matchMedia('(pointer: fine)').matches || RM || el.dataset.tilt) return; el.dataset.tilt = 1; if (!el.querySelector(':scope > .sheen')) el.insertAdjacentHTML('beforeend', '<i class="sheen"></i>');
  el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.classList.add('tilting'); el.style.transform = `perspective(1100px) rotateX(${(.5 - py) * 5}deg) rotateY(${(px - .5) * 6}deg) translateZ(0)`; el.style.setProperty('--sx', px * 100 + '%'); el.style.setProperty('--sy', py * 100 + '%'); });
  el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 800); }); }
$$('.tilt3d, .cr, .meter, .calc').forEach(tiltify);
new MutationObserver(() => $$('.bag').forEach(tiltify)).observe($('#bagres'), { childList: true });

// FAQ: smooth open and close
$$('details').forEach(d => { const p = d.querySelector('p'); const box = document.createElement('div'); box.className = 'dc'; p.replaceWith(box); box.append(p);
  d.querySelector('summary').addEventListener('click', e => { e.preventDefault(); if (RM) { d.open = !d.open; return; }
    if (d.open) { box.style.height = box.scrollHeight + 'px'; requestAnimationFrame(() => box.style.height = '0px'); setTimeout(() => { d.open = false; box.style.height = ''; }, 500); }
    else { d.open = true; box.style.height = '0px'; requestAnimationFrame(() => box.style.height = box.scrollHeight + 'px'); setTimeout(() => box.style.height = '', 500); } }); });
