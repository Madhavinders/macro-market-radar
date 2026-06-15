import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2';

dotenv.config();

const app = express();
const PORT = 3000;

interface CacheEntry { data: any; timestamp: number; }
const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 15 * 1000;

const SYMBOL_MATRIX: Record<string, string[]> = {
  'SPY':      ['SPY', 'IVV', 'VOO'],
  'QQQ':      ['QQQ', 'TQQQ'],
  'DIA':      ['DIA'],
  'EEM':      ['EEM'],
  'BZ=F':     ['BZ=F', 'LCO=F', 'BRN=F'],
  'CL=F':     ['CL=F', 'QM=F'],
  '^TNX':     ['^TNX', 'TNX'],
  '^IRX':     ['^IRX', 'IRX'],
  'TLT':      ['TLT'],
  'GC=F':     ['GC=F', 'XAU=F'],
  'SI=F':     ['SI=F', 'XAG=F'],
  'DX-Y.NYB': ['DX-Y.NYB', 'DX=F'],
  '^VIX':     ['^VIX', 'VIX'],
  'BTC-USD':  ['BTC-USD'],
  'HG=F':     ['HG=F'],
};

// Alpha Vantage supports equities/ETFs; for forex/crypto/commodities use different AV functions
const AV_EQUITY_SYMBOLS   = ['SPY', 'QQQ', 'DIA', 'EEM', 'TLT'];
const AV_CRYPTO_SYMBOLS: Record<string, string>  = { 'BTC-USD': 'BTC' };
const AV_FOREX_SYMBOLS: Record<string, [string,string]> = { 'DX-Y.NYB': ['USD', 'EUR'] }; // DXY approximation

const ALL_SYMBOLS = Object.keys(SYMBOL_MATRIX).join(',');

const getCachedData = (key: string) => {
  const e = cache[key];
  return e && Date.now() - e.timestamp < CACHE_DURATION ? e.data : null;
};
const setCachedData = (key: string, data: any) => {
  cache[key] = { data, timestamp: Date.now() };
};

const isValidPrice = (p: any): boolean =>
  typeof p === 'number' && isFinite(p) && p > 0;

const smartFetch = (url: string, extraHeaders: any = {}) =>
  fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com/',
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(12000),
  });

// ─── helpers ────────────────────────────────────────────────────────────────

const toCanonical = (incoming: string): string | null => {
  const up = incoming.toUpperCase();
  for (const [canon, aliases] of Object.entries(SYMBOL_MATRIX)) {
    if (aliases.map(a => a.toUpperCase()).includes(up)) return canon;
  }
  return null;
};

const pushResult = (
  bag: any[],
  symbol: string,
  price: number,
  change: number,
  source: string
) => {
  if (isValidPrice(price)) bag.push({ symbol, price, change: change ?? 0, source });
};

// ─── SOURCE FUNCTIONS (each returns results independently) ───────────────────

async function fetchViaRapidAPI(key: string): Promise<any[]> {
  const results: any[] = [];
  try {
    console.log('[L1] RapidAPI → yahoo-finance15...');
    const r = await smartFetch(
      `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${ALL_SYMBOLS}`,
      { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com' }
    );
    console.log(`[L1] RapidAPI HTTP ${r.status}`);
    if (r.ok) {
      const data = await r.json();
      const list = Array.isArray(data)
        ? data
        : (data.quoteResponse?.result || data.quotes || []);
      for (const q of list) {
        pushResult(results, q.symbol, q.regularMarketPrice ?? q.price,
          q.regularMarketChangePercent ?? q.changePercent, 'RapidAPI');
      }
      console.log(`[L1] RapidAPI got ${results.length} symbols`);
    } else {
      const txt = await r.text();
      console.warn(`[L1] RapidAPI error body: ${txt.slice(0, 200)}`);
    }
  } catch (e) { console.error('[L1] RapidAPI exception:', e); }
  return results;
}

async function fetchViaAlphaVantageEquity(key: string, symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  // Fire all requests in parallel — AV free tier: 25 req/day, so we batch only needed symbols
  await Promise.all(symbols.map(async (sym) => {
    try {
      const r = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${key}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const d = await r.json();
      if (d.Note || d.Information) {
        console.warn(`[L2-AV] Rate limit hit for ${sym}: ${(d.Note || d.Information)?.slice(0, 80)}`);
        return;
      }
      const q = d['Global Quote'];
      const price = parseFloat(q?.['05. price']);
      const change = parseFloat(q?.['10. change percent']?.replace('%', '') ?? '0');
      pushResult(results, sym, price, change, 'Alpha Vantage');
      console.log(`[L2-AV] ${sym}: $${price}`);
    } catch (e) { console.error(`[L2-AV] ${sym} error:`, e); }
  }));
  return results;
}

async function fetchViaAlphaVantageCrypto(key: string): Promise<any[]> {
  const results: any[] = [];
  await Promise.all(Object.entries(AV_CRYPTO_SYMBOLS).map(async ([canonical, cryptoSym]) => {
    try {
      const r = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${cryptoSym}&to_currency=USD&apikey=${key}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const d = await r.json();
      const rate = d['Realtime Currency Exchange Rate'];
      const price = parseFloat(rate?.['5. Exchange Rate']);
      if (isValidPrice(price)) {
        pushResult(results, canonical, price, 0, 'Alpha Vantage Crypto');
        console.log(`[L2-AV] ${canonical}: $${price}`);
      }
    } catch (e) { console.error(`[L2-AV] crypto error:`, e); }
  }));
  return results;
}

async function fetchViaYahooFinance2(symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  await Promise.all(symbols.map(async (sym) => {
    const trySymbols = SYMBOL_MATRIX[sym] || [sym];
    for (const attempt of trySymbols) {
      try {
        const q: any = await yahooFinance.quote(attempt);
        const price = q?.regularMarketPrice ?? q?.price;
        const change = q?.regularMarketChangePercent ?? q?.changePercent;
        if (isValidPrice(price)) {
          pushResult(results, sym, price, change, `yf2${attempt !== sym ? ` (${attempt})` : ''}`);
          console.log(`[L3-YF2] ${sym} via ${attempt}: $${price}`);
          break;
        }
      } catch (_) {}
    }
  }));
  return results;
}

async function fetchViaYahooV7(symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  try {
    const r = await smartFetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`
    );
    console.log(`[L4-YV7] HTTP ${r.status}`);
    if (r.ok) {
      const d = await r.json();
      for (const q of (d.quoteResponse?.result || [])) {
        pushResult(results, q.symbol, q.regularMarketPrice ?? q.price,
          q.regularMarketChangePercent ?? q.changePercent, 'Yahoo v7');
      }
    }
  } catch (e) { console.error('[L4-YV7] error:', e); }
  return results;
}

// ─── MAIN ROUTE ──────────────────────────────────────────────────────────────

app.get('/api/market-data', async (req, res) => {
  const cached = getCachedData('market-data');
  if (cached) return res.json(cached);

  const rapidApiKey  = process.env.RAPIDAPI_KEY?.trim();
  const alphaVantageKey = process.env.ALPHA_VANTAGE_KEY?.trim();

  console.log(`[ENG] Keys present — RapidAPI: ${rapidApiKey ? `YES (${rapidApiKey.length} chars)` : 'NO'}, AV: ${alphaVantageKey ? `YES (${alphaVantageKey.length} chars)` : 'NO'}`);

  const rawResults: any[] = [];
  const timestamp = Date.now();

  // ── ROUND 1: Fire RapidAPI + Alpha Vantage in parallel ──────────────────
  const round1Promises: Promise<any[]>[] = [];

  if (rapidApiKey)     round1Promises.push(fetchViaRapidAPI(rapidApiKey));
  if (alphaVantageKey) round1Promises.push(fetchViaAlphaVantageEquity(alphaVantageKey, AV_EQUITY_SYMBOLS));
  if (alphaVantageKey) round1Promises.push(fetchViaAlphaVantageCrypto(alphaVantageKey));

  const round1 = (await Promise.all(round1Promises)).flat();
  rawResults.push(...round1);

  // ── ROUND 2: yahoo-finance2 for anything still missing ──────────────────
  const coveredR1 = new Set(rawResults.map(r => {
    const c = toCanonical(r.symbol); return c ?? r.symbol.toUpperCase();
  }));
  const missingR1 = Object.keys(SYMBOL_MATRIX).filter(s => !coveredR1.has(s));

  if (missingR1.length > 0) {
    console.log(`[ENG] Round 2: yf2 for ${missingR1.length} missing: ${missingR1.join(', ')}`);
    const r2 = await fetchViaYahooFinance2(missingR1);
    rawResults.push(...r2);
  }

  // ── ROUND 3: Yahoo v7 for anything still missing ─────────────────────────
  const coveredR2 = new Set(rawResults.map(r => {
    const c = toCanonical(r.symbol); return c ?? r.symbol.toUpperCase();
  }));
  const missingR2 = Object.keys(SYMBOL_MATRIX).filter(s => !coveredR2.has(s));

  if (missingR2.length > 0) {
    console.log(`[ENG] Round 3: Yahoo v7 for ${missingR2.length} missing: ${missingR2.join(', ')}`);
    const r3 = await fetchViaYahooV7(missingR2);
    rawResults.push(...r3);
  }

  // ── NORMALIZATION ────────────────────────────────────────────────────────
  const SOURCE_PRIORITY = ['RapidAPI', 'Alpha Vantage', 'Alpha Vantage Crypto', 'yf2', 'Yahoo v7'];
  const finalMap = new Map<string, any>();

  for (const item of rawResults) {
    if (!item?.symbol || !isValidPrice(item.price)) continue;
    const canon = toCanonical(item.symbol) ?? item.symbol.toUpperCase();
    if (!SYMBOL_MATRIX[canon]) continue;

    if (!finalMap.has(canon)) {
      finalMap.set(canon, { symbol: canon, regularMarketPrice: item.price, regularMarketChangePercent: item.change ?? 0, source: item.source });
    } else {
      const existing = finalMap.get(canon)!;
      const ep = SOURCE_PRIORITY.findIndex(s => existing.source?.startsWith(s));
      const ip = SOURCE_PRIORITY.findIndex(s => item.source?.startsWith(s));
      if (ip !== -1 && (ep === -1 || ip < ep)) {
        finalMap.set(canon, { symbol: canon, regularMarketPrice: item.price, regularMarketChangePercent: item.change ?? 0, source: item.source });
      }
    }
  }

  const finalResults = Array.from(finalMap.values());
  const missing = Object.keys(SYMBOL_MATRIX).filter(s => !finalMap.has(s));

  if (missing.length > 0) console.warn(`[ENG] Still missing after all rounds: ${missing.join(', ')}`);
  else console.log('[ENG] ✅ All symbols resolved.');

  const payload = {
    data: finalResults,
    timestamp,
    source: finalResults.length > 0 ? 'Live Multi-Source' : 'No Data',
    missing: missing.length > 0 ? missing : undefined,
  };

  if (finalResults.length > 0) setCachedData('market-data', payload);
  res.json(payload);
});

// ─── DIAGNOSE ROUTE ──────────────────────────────────────────────────────────

app.get('/api/diagnose', async (req, res) => {
  const rapidApiKey     = process.env.RAPIDAPI_KEY?.trim();
  const alphaVantageKey = process.env.ALPHA_VANTAGE_KEY?.trim();
  const out: Record<string, string> = {};

  // Yahoo v7
  try {
    const r = await smartFetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=SPY');
    const d = r.ok ? await r.json() : null;
    const price = d?.quoteResponse?.result?.[0]?.regularMarketPrice;
    out.yahoo_v7 = price ? `✅ SPY $${price}` : `❌ HTTP ${r.status}`;
  } catch (e: any) { out.yahoo_v7 = `❌ ${e.message}`; }

  // RapidAPI
  if (rapidApiKey) {
    try {
      const r = await smartFetch(
        'https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/SPY,BTC-USD,GC=F',
        { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com' }
      );
      const txt = await r.text();
      let price: any = null;
      try {
        const parsed = JSON.parse(txt);
        const list = Array.isArray(parsed) ? parsed : (parsed?.quoteResponse?.result || parsed?.quotes || []);
        price = list?.find((q: any) => q.symbol === 'SPY')?.regularMarketPrice;
      } catch (_) {}
      out.rapidapi = price ? `✅ SPY $${price}` : `❌ HTTP ${r.status} — ${txt.slice(0, 150)}`;
    } catch (e: any) { out.rapidapi = `❌ ${e.message}`; }
  } else { out.rapidapi = '⚠️ No key'; }

  // Alpha Vantage equity
  if (alphaVantageKey) {
    try {
      const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${alphaVantageKey}`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      const price = d['Global Quote']?.['05. price'];
      out.alpha_vantage_equity = price ? `✅ SPY $${price}` : d.Note ? `❌ Rate limit: ${d.Note.slice(0,80)}` : `❌ ${JSON.stringify(d).slice(0,100)}`;
    } catch (e: any) { out.alpha_vantage_equity = `❌ ${e.message}`; }

    // Alpha Vantage crypto
    try {
      const r = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${alphaVantageKey}`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      const rate = d['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
      out.alpha_vantage_crypto = rate ? `✅ BTC $${parseFloat(rate).toFixed(0)}` : `❌ ${JSON.stringify(d).slice(0,100)}`;
    } catch (e: any) { out.alpha_vantage_crypto = `❌ ${e.message}`; }
  } else { out.alpha_vantage_equity = out.alpha_vantage_crypto = '⚠️ No key'; }

  // yahoo-finance2
  try {
    const q: any = await yahooFinance.quote('GC=F');
    const price = q?.regularMarketPrice;
    out.yahoo_finance2 = price ? `✅ GC=F $${price}` : `❌ No price returned`;
  } catch (e: any) { out.yahoo_finance2 = `❌ ${e.message}`; }

  res.json({
    timestamp: new Date().toISOString(),
    keys: {
      RAPIDAPI_KEY: rapidApiKey ? `✅ Set (${rapidApiKey.length} chars)` : '❌ Missing',
      ALPHA_VANTAGE_KEY: alphaVantageKey ? `✅ Set (${alphaVantageKey.length} chars)` : '❌ Missing',
    },
    sources: out,
  });
});

// ─── NEWS ROUTE ──────────────────────────────────────────────────────────────

app.get('/api/news', async (req, res) => {
  const cached = getCachedData('market-news');
  if (cached) return res.json(cached);

  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
  let news: any[] = [];

  try {
    const r = await smartFetch(
      'https://query2.finance.yahoo.com/v1/finance/search?q=market+economy+finance&newsCount=25&enableFuzzyQuery=false'
    );
    if (r.ok) {
      const d = await r.json();
      news = (d.news || []).map((item: any) => ({
        title: item.title,
        source: item.publisher || 'Yahoo Finance',
        pubDate: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
        link: item.link,
      }));
    }
  } catch (e) { console.error('[NEWS] Primary error:', e); }

  if (news.length < 5 && rapidApiKey) {
    try {
      const r = await smartFetch(
        'https://yahoo-finance166.p.rapidapi.com/api/news/list?region=US&snippetCount=20',
        { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'yahoo-finance166.p.rapidapi.com' }
      );
      if (r.ok) {
        const d = await r.json();
        const items = d.data?.main?.stream || d.news || [];
        news.push(...items
          .map((i: any) => ({ title: i.title || i.heading, source: i.source || 'Yahoo Finance', pubDate: i.pubDate || new Date().toISOString(), link: i.link || i.url || '#' }))
          .filter((n: any) => n.title)
        );
      }
    } catch (e) { console.error('[NEWS] RapidAPI error:', e); }
  }

  const deduplicated = Array.from(new Map(news.map(n => [n.title, n])).values());
  if (deduplicated.length > 0) setCachedData('market-news', deduplicated);
  res.json(deduplicated);
});

// ─── SERVER STARTUP ──────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, r) => r.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`[ENG] Server → http://localhost:${PORT}`));
}

startServer();
