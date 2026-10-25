// GET /api/bags?owner=<wallet> — the memecoins a wallet holds right now, with what they're worth.
// Read-only: token accounts from a public Solana RPC, names, icons and prices from Jupiter. No keys, nothing to sign.
const RPCS = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
const PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const SKIP = new Set(['So11111111111111111111111111111111111111112', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB']);
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function rpc(method, params) {
  let last;
  for (const u of RPCS) {
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(9000) });
      const j = await r.json(); if (j.error) throw new Error(j.error.message || 'rpc error'); return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('rpc unreachable');
}

module.exports = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  const owner = String(req.query.owner || '').trim();
  if (!B58.test(owner)) return res.status(400).json({ ok: false, reason: 'that is not a Solana wallet address' });
  try {
    const [balR, ...listR] = await Promise.allSettled([rpc('getBalance', [owner]), ...PROGRAMS.map(p => rpc('getTokenAccountsByOwner', [owner, { programId: p }, { encoding: 'jsonParsed' }]))]);
    if (listR.every(x => x.status === 'rejected')) throw listR[0].reason;   // one token program may fail; both failing is an error
    const bal = balR.status === 'fulfilled' ? balR.value : null, lists = listR.filter(x => x.status === 'fulfilled').map(x => x.value);
    const held = new Map();
    for (const l of lists) for (const a of l.value || []) {
      const info = a.account?.data?.parsed?.info; if (!info) continue;
      const amt = +info.tokenAmount?.uiAmountString || 0; if (amt <= 0 || SKIP.has(info.mint)) continue;
      held.set(info.mint, (held.get(info.mint) || 0) + amt);
    }
    const mints = [...held.keys()];
    const meta = {};
    for (let i = 0; i < mints.length && i < 300; i += 100) {
      const r = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=' + mints.slice(i, i + 100).join(','), { signal: AbortSignal.timeout(9000) });
      if (r.ok) for (const t of await r.json()) meta[t.id] = t;
    }
    const bags = mints.map(m => {
      const t = meta[m] || {}, amount = held.get(m), price = +t.usdPrice || 0;
      return { mint: m, name: t.name || null, symbol: t.symbol || null, icon: t.icon || null, amount, price, usd: price * amount,
        chg24: t.stats24h?.priceChange ?? null, mcap: t.mcap ?? null, launchpad: t.launchpad || null, pump: t.launchpad === 'pump.fun' || /pump$/.test(m) };
    }).filter(b => b.usd >= .01 || b.pump).sort((a, b) => b.usd - a.usd).slice(0, 60);
    res.setHeader('cache-control', 'no-store');
    res.json({ ok: true, owner, sol: (bal?.value || 0) / 1e9, count: held.size, bags });
  } catch (e) {
    res.status(502).json({ ok: false, reason: /busy|timeout|abort/i.test(String(e.message)) ? 'Solana is busy right now, try again in a moment' : String(e.message || e) });
  }
};
