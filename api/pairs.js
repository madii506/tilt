// GET /api/pairs — the newest pump.fun pairs, read from GeckoTerminal's new-pools feed.
// Returns each pair with its age and how far it has moved since its first trade, plus the share of them already below it.
const GT = 'https://api.geckoterminal.com/api/v2/networks/solana';
const BAD = /fuck|shit|cunt|n[i1]gg|fag|retard|t[i1]tt?(y|ie|s)|porn|sex|\bcum|rape|nazi|hitler|kkk|pedo|whore|slut|dick|cock|pussy|bitch|jew|isis|terror|9\/?11|shoot|kill/i;
let CACHE = null;

async function page(n) {
  const r = await fetch(`${GT}/new_pools?page=${n}&include=base_token`, { headers: { accept: 'application/json;version=20230302' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('GeckoTerminal answered ' + r.status);
  return r.json();
}
const num = v => (v == null || v === '' || isNaN(+v)) ? null : +v;

async function build() {
  const pages = await Promise.allSettled([1, 2, 3, 4, 5].map(page));
  const ok = pages.filter(p => p.status === 'fulfilled').map(p => p.value);
  if (!ok.length) throw new Error(pages[0].reason?.message || 'no data');
  const now = Date.now(), seen = new Set(), pairs = [];
  for (const j of ok) {
    const inc = Object.fromEntries((j.included || []).map(x => [x.id, x.attributes || {}]));
    for (const d of j.data || []) {
      if (d.relationships?.dex?.data?.id !== 'pump-fun') continue;
      const a = d.attributes || {}, t = inc[d.relationships?.base_token?.data?.id] || {};
      const mint = t.address || (d.relationships?.base_token?.data?.id || '').replace(/^solana_/, '');
      if (!mint || seen.has(mint)) continue; seen.add(mint);
      const name = (t.name || a.name || '').split(' / ')[0].slice(0, 40), symbol = (t.symbol || '').slice(0, 16);
      if (BAD.test(name + ' ' + symbol)) continue;
      const tx = a.transactions || {};
      pairs.push({
        mint, pool: a.address, name, symbol,
        img: t.image_url && !/missing/.test(t.image_url) ? t.image_url : null,
        ageMin: Math.max(0, Math.round((now - Date.parse(a.pool_created_at)) / 60000)),
        fdv: num(a.fdv_usd), price: num(a.base_token_price_usd),
        chg: num(a.price_change_percentage?.h24),          // younger than a day: this is the move since the first trade
        buys: (tx.h1?.buys ?? tx.h24?.buys) || 0, sells: (tx.h1?.sells ?? tx.h24?.sells) || 0,
        vol: num(a.volume_usd?.h24) || 0,
      });
    }
  }
  pairs.sort((a, b) => a.ageMin - b.ageMin);
  // the sample: pairs with at least two trades, so "since launch" means something
  const traded = pairs.filter(p => p.chg != null && p.buys + p.sells >= 2);
  const down = traded.filter(p => p.chg < 0).length;
  const sorted = traded.map(p => p.chg).sort((a, b) => a - b);
  const bins = [[-Infinity, -75], [-75, -50], [-50, -25], [-25, 0], [0, 25], [25, 100], [100, Infinity]].map(([lo, hi]) => ({ lo, hi, n: traded.filter(p => p.chg >= lo && p.chg < hi).length }));
  return {
    ok: true, at: now, pairs: pairs.slice(0, 80),
    sample: { n: traded.length, down, downPct: traded.length ? Math.round(down / traded.length * 100) : null, median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      spanMin: pairs.length ? Math.max(...pairs.map(p => p.ageMin)) : null, bins: bins.map(b => ({ lo: isFinite(b.lo) ? b.lo : null, hi: isFinite(b.hi) ? b.hi : null, n: b.n })) },
    source: 'GeckoTerminal new pools, pump.fun only', partial: ok.length < pages.length,
  };
}

module.exports = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  try {
    if (!CACHE || Date.now() - CACHE.at > 25000) CACHE = await build();
    res.setHeader('cache-control', 's-maxage=20, stale-while-revalidate=60');
    res.status(200).json(CACHE);
  } catch (e) {
    if (CACHE) return res.status(200).json({ ...CACHE, stale: true });
    res.status(502).json({ ok: false, reason: String(e.message || e) });
  }
};
