// GET /api/stonk — the StonkFun coins trading the most right now (24h volume), from StonkFun's public API,
// with icons and 24h change from Jupiter. Cached briefly so the ticker never hammers either.
const SF = 'https://www.stonkfun.xyz/api/public/v1/tokens?sort=volume&pageSize=30';
const BAD = /fuck|shit|cunt|n[i1]gg|fag|retard|porn|\bsex|\bcum|rape|nazi|hitler|kkk|pedo|whore|slut|dick|cock|pussy|bitch/i;
let CACHE = null;

async function build() {
  const r = await fetch(SF, { headers: { accept: 'application/json', 'user-agent': 'tilt/1.0 (+https://tilt-lime.vercel.app)' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('StonkFun answered ' + r.status);
  const j = await r.json();
  const toks = (j.data?.tokens || []).filter(t => t.mint && !BAD.test((t.name || '') + ' ' + (t.symbol || '')));
  const meta = {};
  try {
    const q = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=' + toks.map(t => t.mint).join(','), { signal: AbortSignal.timeout(6000) });
    if (q.ok) for (const t of await q.json()) meta[t.id] = t;
  } catch (e) { /* icons are a nice-to-have */ }
  return {
    ok: true, at: Date.now(), source: 'StonkFun public API, sorted by 24h volume',
    coins: toks.map(t => ({ mint: t.mint, name: (t.name || '').slice(0, 40), symbol: (t.symbol || '').slice(0, 14), quote: t.quote?.symbol || null,
      mcap: t.market?.marketCapUsd ?? null, vol: t.market?.volume24hUsd ?? null, liq: t.market?.liquidityUsd ?? null, status: t.status || null,
      icon: meta[t.mint]?.icon || null, chg24: meta[t.mint]?.stats24h?.priceChange ?? null })),
  };
}

module.exports = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  try {
    if (!CACHE || Date.now() - CACHE.at > 45000) CACHE = await build();
    res.setHeader('cache-control', 's-maxage=30, stale-while-revalidate=120');
    res.status(200).json(CACHE);
  } catch (e) {
    if (CACHE) return res.status(200).json({ ...CACHE, stale: true });
    res.status(502).json({ ok: false, reason: String(e.message || e) });
  }
};
