// tilt: the motion layer. Smooth wheel scrolling, words that rise in, reveals, magnetic buttons, count-ups, the scramble labels,
// the lamp-light that follows the pointer, and the chip that rolls down the right edge as you read.
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function split(el) {
  if (el.dataset.split) return; el.dataset.split = 1; let i = 0;
  const walk = node => { for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { frag.append(' '); return; } const o = document.createElement('span'); o.className = 'w'; const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++); o.append(s); frag.append(o); }); n.replaceWith(frag); }
    else if (n.nodeType === 1) walk(n); } };
  walk(el);
}

export function scramble(el) {
  const final = el.textContent, chars = 'abcdefghijklmnopqrstuvwxyz#%$/'; let f = 0;
  const run = () => { el.textContent = final.split('').map((c, i) => c === ' ' ? ' ' : i < f / 2 ? c : chars[Math.floor(Math.random() * chars.length)]).join(''); if (f++ < final.length * 2) requestAnimationFrame(run); else el.textContent = final; };
  run();
}

export function countTo(el, to, { dur = 1400, dec = 0, from = null } = {}) {
  const start = from != null ? from : (+el.dataset.v || 0); el.dataset.v = to; if (RM) { el.textContent = to.toFixed(dec); return; }
  const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = (start + (to - start) * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export function reveals() {
  $$('.split').forEach(split);
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const t = e.target; t.classList.add('in'); io.unobserve(t);
    if (t.classList.contains('stg')) [...t.children].forEach((c, i) => c.style.setProperty('--i', i));
    if (t.classList.contains('scr')) scramble(t); }), { rootMargin: '0px 0px -12% 0px' });
  $$('.rv, .stg, .scr, .sec .split, .end .split').forEach(el => io.observe(el));
  $$('.stg').forEach(el => [...el.children].forEach((c, i) => c.style.setProperty('--i', i)));
}

export function magnetic() {
  if (RM || !matchMedia('(pointer: fine)').matches) return;
  $$('.mag').forEach(el => {
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) * .28, y = (e.clientY - r.top - r.height / 2) * .38; el.style.transform = `translate(${x}px, ${y}px)`; });
    el.addEventListener('pointerleave', () => { el.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1), color .35s, box-shadow .35s'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 700); });
  });
}

export function ambient() {
  const glow = $('#glow'), chip = $('#rbChip'), nav = $('#nav'); let gx = -999, gy = -999, tx = -999, ty = -999;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (gx < -900) { gx = tx; gy = ty; } }, { passive: true });
  const tick = () => {
    gx += (tx - gx) * .12; gy += (ty - gy) * .12; if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? scrollY / max : 0;
    if (chip) { const h = chip.parentElement.clientHeight - 22; chip.style.transform = `translateY(${p * h}px) rotate(${p * h / 11 * 57.3}deg)`; }
    nav && nav.classList.toggle('solid', scrollY > innerHeight * .6);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// smooth wheel scrolling on desktop: the page glides to where the wheel sends it. Touch and keys stay native.
export function smoothScroll() {
  if (RM || !matchMedia('(pointer: fine)').matches) return { to: y => scrollTo(0, y) };
  document.documentElement.style.scrollBehavior = 'auto';
  let target = scrollY, cur = scrollY, running = false, lastSet = -1;
  const max = () => document.documentElement.scrollHeight - innerHeight;
  const scrollable = el => { for (; el && el !== document.body; el = el.parentElement) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) return el; } return null; };
  const loop = () => { cur += (target - cur) * .09; if (Math.abs(target - cur) < .4) { cur = target; running = false; } lastSet = Math.round(cur); scrollTo(0, cur); if (running) requestAnimationFrame(loop); };
  const go = y => { if (!running) cur = scrollY; target = Math.max(0, Math.min(max(), y)); if (!running) { running = true; requestAnimationFrame(loop); } };
  addEventListener('wheel', e => {
    if (e.ctrlKey || document.documentElement.classList.contains('intro')) return;
    const sc = scrollable(e.target); if (sc && ((e.deltaY > 0 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1) || (e.deltaY < 0 && sc.scrollTop > 0))) return;
    e.preventDefault(); if (!running) { cur = scrollY; target = scrollY; }
    go(target + (e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY));
  }, { passive: false });
  addEventListener('scroll', () => { if (Math.abs(scrollY - lastSet) > 2 && !running) cur = target = scrollY; }, { passive: true });
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href'); const el = id === '#top' ? document.body : $(id); if (!el) return;
    e.preventDefault(); go(id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - 10); });
  return { to: go };
}
