import { useState, useEffect, useMemo, useCallback } from 'react';
import { MetricItem, NewsItem, AssetCategory } from './types';
import { ASSETS_METADATA } from './constants';
import { MetricCard } from './components/MetricCard';
import { MarketStats } from './components/MarketStats';
import { AssetInspector } from './components/AssetInspector';
import { NewsFeed } from './components/NewsFeed';
import { TickerRibbon } from './components/TickerRibbon';
import {
  RefreshCw, Search, AlertCircle, Activity,
  Globe, Database, Clock
} from 'lucide-react';

// ─── marketData.ts ────────────────────────────────────────────────────────────

const RAPIDAPI_KEY      = '80934a8b1amsh11a4387d1c6e218p1463cajsnaca9aa619f4f';
const ALPHA_VANTAGE_KEY = 'S7NZPHFQ7UQUZI8Q';

// Using types imported from './types'

const SYMBOL_ALIASES: Record<string, string[]> = {
  'SPY':      ['SPY','IVV','VOO'],
  'QQQ':      ['QQQ','TQQQ'],
  'DIA':      ['DIA'],
  'EEM':      ['EEM'],
  'BZ=F':     ['BZ=F','LCO=F','BRN=F'],
  'CL=F':     ['CL=F','QM=F'],
  '^TNX':     ['^TNX','TNX'],
  '^IRX':     ['^IRX','IRX'],
  'TLT':      ['TLT'],
  'GC=F':     ['GC=F','XAU=F'],
  'SI=F':     ['SI=F','XAG=F'],
  'DX-Y.NYB': ['DX-Y.NYB','DX=F'],
  '^VIX':     ['^VIX','VIX'],
  'BTC-USD':  ['BTC-USD'],
  'HG=F':     ['HG=F'],
};

const ALL_SYMBOLS = Object.keys(SYMBOL_ALIASES);
const isValidPrice = (p: any) => typeof p === 'number' && isFinite(p) && p > 0;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const toCanonical = (sym: string): string | null => {
  const up = sym.toUpperCase();
  for (const [canon, aliases] of Object.entries(SYMBOL_ALIASES)) {
    if (aliases.map(a => a.toUpperCase()).includes(up)) return canon;
  }
  return null;
};

// ─── SOURCE 1a: apidojo yahoo-finance1 ───────────────────────────────────────
// Endpoint from your playground link:
// GET /market/v2/get-quotes?region=US&symbols=...
async function fetchYahooFinance1(symbols: string[]): Promise<MetricItem[]> {
  const HOST = 'apidojo-yahoo-finance-v1.p.rapidapi.com';
  try {
    const res = await fetch(
      `https://${HOST}/market/v2/get-quotes?region=US&symbols=${symbols.join(',')}`,
      { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': HOST } }
    );
    console.log(`[YF1] HTTP ${res.status}`);
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[YF1] Error body: ${txt.slice(0, 200)}`);
      return [];
    }
    const data = await res.json();
    return (data.quoteResponse?.result || [])
      .filter((q: any) => isValidPrice(q.regularMarketPrice ?? q.price))
      .map((q: any) => ({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice ?? q.price,
        regularMarketChangePercent: q.regularMarketChangePercent ?? q.changePercent ?? 0,
        source: 'RapidAPI [YF1]',
      }));
  } catch (e) { console.error('[YF1]:', e); return []; }
}

// ─── SOURCE 1b: yahoo-finance1 (alternate slug) ───────────────────────────────
async function fetchYahooFinance1Alt(symbols: string[]): Promise<MetricItem[]> {
  const HOST = 'yahoo-finance1.p.rapidapi.com';
  try {
    const res = await fetch(
      `https://${HOST}/market/v2/get-quotes?region=US&symbols=${symbols.join(',')}`,
      { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': HOST } }
    );
    console.log(`[YF1-ALT] HTTP ${res.status}`);
    if (!res.ok) { console.warn(`[YF1-ALT] ${res.status}`); return []; }
    const data = await res.json();
    return (data.quoteResponse?.result || [])
      .filter((q: any) => isValidPrice(q.regularMarketPrice ?? q.price))
      .map((q: any) => ({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice ?? q.price,
        regularMarketChangePercent: q.regularMarketChangePercent ?? q.changePercent ?? 0,
        source: 'RapidAPI [YF1-Alt]',
      }));
  } catch (e) { console.error('[YF1-ALT]:', e); return []; }
}

// ─── SOURCE 2: yahoo-finance15 (sparior) ─────────────────────────────────────
// Endpoint: GET /api/v1/markets/quote?symbol=SPY,QQQ,...&type=STOCKS
async function fetchYahooFinance15(symbols: string[]): Promise<MetricItem[]> {
  const HOST = 'yahoo-finance15.p.rapidapi.com';
  const results: MetricItem[] = [];

  // yf15 takes one symbol at a time for some endpoints, batch with comma for quote
  try {
    const res = await fetch(
      `https://${HOST}/api/v1/markets/quote?symbol=${symbols.join(',')}&type=STOCKS`,
      { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': HOST } }
    );
    console.log(`[YF15] HTTP ${res.status}`);
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[YF15] Error: ${txt.slice(0, 200)}`);
      return [];
    }
    const data = await res.json();
    // yf15 returns { body: { SPY: {...}, QQQ: {...} } } or { quoteResponse: { result: [...] } }
    const body = data.body || data.quoteResponse?.result;
    if (Array.isArray(body)) {
      for (const q of body) {
        const price  = q.regularMarketPrice ?? q.price ?? q.currentPrice;
        const change = q.regularMarketChangePercent ?? q.changePercent ?? 0;
        if (isValidPrice(price)) results.push({ symbol: q.symbol, regularMarketPrice: price, regularMarketChangePercent: change, source: 'RapidAPI [YF15]' });
      }
    } else if (body && typeof body === 'object') {
      for (const [sym, q] of Object.entries(body as Record<string, any>)) {
        const price  = q.regularMarketPrice ?? q.price ?? q.currentPrice;
        const change = q.regularMarketChangePercent ?? q.changePercent ?? 0;
        if (isValidPrice(price)) results.push({ symbol: sym, regularMarketPrice: price, regularMarketChangePercent: change, source: 'RapidAPI [YF15]' });
      }
    }
    console.log(`[YF15] Got ${results.length} symbols`);
  } catch (e) { console.error('[YF15]:', e); }
  return results;
}

// ─── SOURCE 3: Alpha Vantage (equities + BTC) ────────────────────────────────
const AV_EQUITY = ['SPY', 'QQQ', 'DIA', 'EEM', 'TLT'];

async function fetchAlphaVantage(missing: string[]): Promise<MetricItem[]> {
  const results: MetricItem[] = [];
  const equities = missing.filter(s => AV_EQUITY.includes(s));

  for (const sym of equities) {
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_VANTAGE_KEY}`
      );
      const d = await res.json();
      if (d.Note || d.Information) { console.warn(`[AV] Rate limited on ${sym}`); break; }
      const price  = parseFloat(d['Global Quote']?.['05. price']);
      const change = parseFloat(d['Global Quote']?.['10. change percent']?.replace('%', '') ?? '0');
      if (isValidPrice(price)) {
        results.push({ symbol: sym, regularMarketPrice: price, regularMarketChangePercent: change, source: 'Alpha Vantage' });
        console.log(`[AV] ${sym}: $${price}`);
      }
    } catch (e) { console.error(`[AV] ${sym}:`, e); }
    await sleep(300);
  }

  if (missing.includes('BTC-USD')) {
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`
      );
      const d = await res.json();
      const price = parseFloat(d['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
      if (isValidPrice(price)) {
        results.push({ symbol: 'BTC-USD', regularMarketPrice: price, regularMarketChangePercent: 0, source: 'Alpha Vantage' });
        console.log(`[AV] BTC-USD: $${price}`);
      }
    } catch (e) { console.error('[AV] BTC:', e); }
  }

  return results;
}

// ─── SOURCE 4: Coinbase (BTC, free, no key, open CORS) ───────────────────────
async function fetchCoinbaseBTC(): Promise<MetricItem[]> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const d   = await res.json();
    const price = parseFloat(d.data?.amount);
    if (isValidPrice(price)) {
      console.log(`[Coinbase] BTC-USD: $${price}`);
      return [{ symbol: 'BTC-USD', regularMarketPrice: price, regularMarketChangePercent: 0, source: 'Coinbase' }];
    }
  } catch (e) { console.error('[Coinbase]:', e); }
  return [];
}

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────
export async function fetchAllMarketData(): Promise<{
  data: MetricItem[];
  source: string;
  missing: string[];
  timestamp: number;
}> {
  const timestamp = Date.now();
  const finalMap  = new Map<string, MetricItem>();

  const add = (items: MetricItem[]) => {
    for (const item of items) {
      if (!item.symbol || !isValidPrice(item.regularMarketPrice)) continue;
      const canon = toCanonical(item.symbol) ?? item.symbol;
      if (!SYMBOL_ALIASES[canon]) continue;
      if (!finalMap.has(canon)) finalMap.set(canon, { ...item, symbol: canon });
    }
  };

  // Round 1: Try both yahoo-finance1 slugs in parallel
  console.log('[ORCH] Round 1: yahoo-finance1 (both slugs) + yahoo-finance15...');
  const [r1a, r1b, r1c] = await Promise.all([
    fetchYahooFinance1(ALL_SYMBOLS),
    fetchYahooFinance1Alt(ALL_SYMBOLS),
    fetchYahooFinance15(ALL_SYMBOLS),
  ]);
  add(r1a); add(r1b); add(r1c);

  const missingR1 = ALL_SYMBOLS.filter(s => !finalMap.has(s));
  console.log(`[ORCH] After Round 1: ${finalMap.size}/15. Missing: ${missingR1.join(', ') || 'none'}`);

  // Round 2: Alpha Vantage + Coinbase for gaps
  if (missingR1.length > 0) {
    console.log('[ORCH] Round 2: Alpha Vantage + Coinbase...');
    const [avRes, btcRes] = await Promise.all([
      fetchAlphaVantage(missingR1),
      missingR1.includes('BTC-USD') ? fetchCoinbaseBTC() : Promise.resolve([]),
    ]);
    add(avRes);
    add(btcRes);
  }

  const data    = Array.from(finalMap.values());
  const missing = ALL_SYMBOLS.filter(s => !finalMap.has(s));
  console.log(`[ORCH] Final: ${data.length}/15. ${missing.length ? `Missing: ${missing.join(', ')}` : '✅ All symbols live'}`);

  return {
    data,
    timestamp,
    source: data.length === ALL_SYMBOLS.length
      ? 'Live Multi-Source'
      : data.length > 0 ? 'Partial Live Data' : 'No Data',
    missing,
  };
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────
// Parses an RSS/Atom XML string into NewsItem[]
function parseRSS(xml: string, defaultSource: string): NewsItem[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const isAtom = doc.querySelector('feed') !== null;
    const items = isAtom
      ? Array.from(doc.querySelectorAll('entry'))
      : Array.from(doc.querySelectorAll('item'));

    return items.map(el => {
      const get = (tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
      const title   = get('title');
      const pubDate = get('pubDate') || get('published') || get('updated') || new Date().toISOString();
      const link    = isAtom
        ? (el.querySelector('link')?.getAttribute('href') || get('link'))
        : get('link');
      const source  = get('source') || get('dc\\:creator') || defaultSource;
      return { title, source, pubDate, link };
    }).filter(n => n.title && n.link);
  } catch (e) {
    console.error('[RSS] Parse error:', e);
    return [];
  }
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  // ── SOURCE 1: Reuters dedicated finance/markets RSS feeds ───────────────────
  const reutersFeeds = [
    { url: 'https://feeds.reuters.com/reuters/businessNews',   label: 'Reuters' },
    { url: 'https://feeds.reuters.com/news/wealth',            label: 'Reuters' },
    { url: 'https://feeds.reuters.com/reuters/technologyNews', label: 'Reuters' },
  ];

  for (const feed of reutersFeeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
      });
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRSS(xml, feed.label);
        if (parsed.length > 0) {
          allNews.push(...parsed.map(n => ({ ...n, source: feed.label })));
          console.log(`[NEWS] ${feed.url.split('/').pop()}: ${parsed.length} articles`);
        }
      }
    } catch (e) { console.error(`[NEWS] Reuters RSS error:`, e); }
  }

  // ── SOURCE 2: Google News RSS — investment-signal focused queries ────────────
  // Each query targets a specific signal category investors care about
  const googleNewsQueries = [
    // Macro & central bank (biggest market movers)
    'site:reuters.com OR site:ft.com (Fed OR "interest rates" OR inflation OR "central bank" OR "rate cut" OR "rate hike")',
    // Equity market moves
    'site:reuters.com OR site:bloomberg.com (stocks OR "S&P 500" OR equities OR "market rally" OR "market selloff")',
    // Commodities & energy (oil, gold, copper)
    'site:reuters.com (oil OR gold OR copper OR commodities OR OPEC OR "crude")',
    // Geopolitical risk & macro shocks
    'site:reuters.com (sanctions OR tariffs OR "trade war" OR recession OR GDP OR unemployment)',
    // Crypto
    'site:reuters.com (bitcoin OR crypto OR cryptocurrency OR ethereum)',
  ];

  for (const q of googleNewsQueries) {
    if (allNews.length >= 40) break; // enough signal
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url);
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRSS(xml, 'Reuters');
        allNews.push(...parsed);
        console.log(`[NEWS] GNews query "${q.slice(0, 40)}...": ${parsed.length} articles`);
      }
    } catch (e) { console.error('[NEWS] Google News query error:', e); }
  }

  // ── SOURCE 3: RapidAPI yahoo-finance15 — earnings & analyst signals ─────────
  if (allNews.length < 10) {
    try {
      const HOST = 'yahoo-finance15.p.rapidapi.com';
      // Pull news for the key market tickers directly — more signal-relevant than generic feed
      const tickers = 'SPY,QQQ,GLD,USO,TLT,BTC-USD';
      const res = await fetch(
        `https://${HOST}/api/v1/markets/news?tickers=${tickers}`,
        { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': HOST } }
      );
      if (res.ok) {
        const d = await res.json();
        const items: any[] = d.body || d.news || [];
        const yfNews = items
          .map((i: any) => ({
            title:   i.title || i.heading,
            source:  i.source || i.publisher || 'Yahoo Finance',
            pubDate: i.pubDate || new Date().toISOString(),
            link:    i.link || i.url || '#',
          }))
          .filter((n: any) => n.title);
        allNews.push(...yfNews);
        console.log(`[NEWS] YF15: ${yfNews.length} articles`);
      }
    } catch (e) { console.error('[NEWS] YF15:', e); }
  }

  // ── SIGNAL SCORING: rank by investment relevance, then recency ───────────────
  // Words that indicate a market-moving story get a higher score
  const HIGH_SIGNAL = [
    'fed', 'federal reserve', 'rate cut', 'rate hike', 'interest rate', 'inflation',
    'cpi', 'pce', 'gdp', 'recession', 'unemployment', 'jobs report', 'nonfarm',
    'opec', 'oil', 'crude', 'gold', 'bitcoin', 'crypto',
    'tariff', 'sanctions', 'trade war', 'default', 'debt ceiling',
    's&p', 'nasdaq', 'dow', 'rally', 'selloff', 'crash', 'surge', 'plunge',
    'earnings', 'guidance', 'forecast', 'outlook', 'downgrade', 'upgrade',
    'hedge fund', 'short', 'volatility', 'vix', 'yield', 'treasury', 'bond',
    'dollar', 'yen', 'euro', 'currency', 'devaluation',
  ];

  const scoreArticle = (item: NewsItem): number => {
    const text = (item.title + ' ' + item.source).toLowerCase();
    let score = 0;
    for (const kw of HIGH_SIGNAL) {
      if (text.includes(kw)) score += 1;
    }
    // Recency bonus: articles from last 6 hours get +3, last 24h get +1
    const age = Date.now() - new Date(item.pubDate).getTime();
    if (age < 6 * 60 * 60 * 1000)  score += 3;
    else if (age < 24 * 60 * 60 * 1000) score += 1;
    return score;
  };

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = allNews.filter(n => {
    if (!n.title || seen.has(n.title)) return false;
    seen.add(n.title);
    return true;
  });

  // Sort: highest signal score first, then by recency within same score
  return deduped
    .sort((a, b) => {
      const scoreDiff = scoreArticle(b) - scoreArticle(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    })
    .slice(0, 30);
}

// ─── APP COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [marketData, setMarketData]         = useState<MetricItem[]>([]);
  const [news, setNews]                     = useState<NewsItem[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingNews, setLoadingNews]       = useState(true);
  const [errorMarkets, setErrorMarkets]     = useState<string | null>(null);
  const [errorNews, setErrorNews]           = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol]   = useState<string>('SPY');
  const [searchQuery, setSearchQuery]         = useState<string>('');
  const [activeCategory, setActiveCategory]   = useState<AssetCategory>('all');

  const [tickerTimestamp, setTickerTimestamp] = useState<number | null>(null);
  const [dataSource, setDataSource]           = useState<string>('Connecting...');
  const [missingAssets, setMissingAssets]     = useState<string[]>([]);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchMacroData = useCallback(async () => {
    setLoadingMarkets(true);
    setErrorMarkets(null);
    try {
      const payload = await fetchAllMarketData();
      setMarketData(payload.data || []);
      setTickerTimestamp(payload.timestamp);
      setDataSource(payload.source || 'Live Multi-Source');
      setMissingAssets(payload.missing || []);
      setLastRefreshedAt(new Date());
      setCooldownCountdown(15);
    } catch (e: any) {
      setErrorMarkets(e.message || 'Error pulling live macro indicators');
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  const fetchNewsFeed = useCallback(async () => {
    setLoadingNews(true);
    setErrorNews(null);
    try {
      const data = await fetchMarketNews();
      setNews(data || []);
    } catch (e: any) {
      setErrorNews(e.message || 'Failed connecting to financial wires');
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchMacroData();
    fetchNewsFeed();
  }, [fetchMacroData, fetchNewsFeed]);

  useEffect(() => {
    if (cooldownCountdown <= 0) return;
    const timer = setInterval(() => setCooldownCountdown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldownCountdown]);

  const handleManualRefresh = () => {
    if (cooldownCountdown > 0) return;
    fetchMacroData();
    fetchNewsFeed();
  };

  const filteredMetrics = useMemo(() => {
    return marketData.filter((item) => {
      const meta = ASSETS_METADATA[item.symbol];
      if (!meta) return false;
      if (activeCategory !== 'all' && meta.category !== activeCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          item.symbol.toLowerCase().includes(q) ||
          meta.name.toLowerCase().includes(q) ||
          meta.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [marketData, activeCategory, searchQuery]);

  const selectedMetricItem = useMemo(
    () => marketData.find(i => i.symbol === selectedSymbol),
    [marketData, selectedSymbol]
  );

  const selectedMeta = useMemo(() => ASSETS_METADATA[selectedSymbol], [selectedSymbol]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col relative text-brand-text">

      {/* HEADER */}
      <header className="bg-brand-bar border-b border-brand-border px-4 py-3 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/10 border border-brand-green/30 animate-pulse">
              <Activity className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-extrabold text-white tracking-wider font-mono">MACRO MARKET RADAR</h1>
                <span className="text-[9px] bg-brand-hover text-brand-text-muted border border-brand-border px-1.5 py-0.5 rounded font-mono">v8.2</span>
              </div>
              <p className="text-[10px] text-brand-text-muted flex items-center gap-1.5 mt-0.5 font-mono">
                <Globe className="w-3 h-3 text-brand-green" />
                Index Engine Status: <span className="text-brand-green font-bold">{dataSource}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshedAt && (
              <div className="text-[10px] text-brand-text-muted font-mono bg-brand-hover px-3 py-1.5 rounded-lg border border-brand-border flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Synced: {lastRefreshedAt.toLocaleTimeString()}</span>
              </div>
            )}
            <button
              disabled={cooldownCountdown > 0 || loadingMarkets || loadingNews}
              onClick={handleManualRefresh}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-mono border flex items-center gap-2 transition-all cursor-pointer ${
                cooldownCountdown > 0
                  ? 'bg-brand-card text-brand-text-muted border-brand-border cursor-not-allowed'
                  : 'bg-brand-green/10 text-brand-green border-brand-green/40 hover:bg-[#10B981] hover:text-[#0A0A0B] hover:border-brand-green font-semibold'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMarkets || loadingNews ? 'animate-spin' : ''}`} />
              <span>{cooldownCountdown > 0 ? `Throttled (${cooldownCountdown}s)` : 'Pull Data'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* TICKER RIBBON */}
      <TickerRibbon
        items={marketData}
        onSelectSymbol={(sym) => {
          setSelectedSymbol(sym);
          document.getElementById(`metric-card-${sym.replace(/[^a-zA-Z]/g,'')}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }}
      />

      {/* MISSING ASSETS NOTICE */}
      {missingAssets.length > 0 && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-[10.5px] text-amber-300 font-mono">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Level Gap:</strong> Could not acquire feed for {missingAssets.join(', ')}.
              Check that your RapidAPI subscription is active on yahoo-finance1.
            </span>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* LEFT: Cards */}
        <section className="lg:col-span-7 flex flex-col h-full gap-4">
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 sm:p-5">

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
              <div className="flex flex-wrap gap-1.5 order-2 sm:order-1">
                {(['all','equities','commodities','rates','currencies'] as const).map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/35 font-bold'
                        : 'bg-brand-hover text-brand-text-muted border-brand-border hover:border-brand-border-active'
                    }`}
                  >
                    {cat === 'all' ? 'All Classes' : cat}
                  </button>
                ))}
              </div>
              <div className="relative order-1 sm:order-2 w-full sm:w-56">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Quick lookup..."
                  className="w-full text-xs bg-brand-bar hover:bg-brand-hover text-brand-text placeholder-brand-text-muted rounded-lg px-3 py-1.5 pl-8 border border-brand-border focus:outline-none focus:border-brand-green/50 transition-all font-mono"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-brand-text-muted" />
              </div>
            </div>

            {loadingMarkets && marketData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-brand-text-muted gap-3">
                <Activity className="w-8 h-8 text-brand-green animate-spin" />
                <p className="text-xs font-mono tracking-wider text-center">Querying live market sources...</p>
              </div>
            ) : errorMarkets && marketData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-brand-red gap-3 bg-brand-red/5 rounded-xl border border-brand-red/20 p-6">
                <AlertCircle className="w-8 h-8 shrink-0" />
                <p className="text-xs font-mono text-center">{errorMarkets}</p>
                <button onClick={() => fetchMacroData()}
                  className="text-xs bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors border border-brand-red/30">
                  Reload Radar
                </button>
              </div>
            ) : filteredMetrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-brand-text-muted text-xs font-mono border border-dashed border-brand-border rounded-xl">
                <span>No macroeconomic metrics fit the selected filters.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredMetrics.map((item) => {
                  const meta = ASSETS_METADATA[item.symbol];
                  if (!meta) return null;
                  return (
                    <MetricCard key={item.symbol} item={item} meta={meta}
                      isSelected={selectedSymbol === item.symbol}
                      onClick={() => setSelectedSymbol(item.symbol)}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center text-[10px] text-brand-text-muted font-mono border-t border-brand-border pt-3">
              <span>Showing {filteredMetrics.length} of {marketData.length} indexes</span>
              <span>Select any block to load specific profiles</span>
            </div>
          </div>

          {marketData.length > 0 && <MarketStats items={marketData} />}
        </section>

        {/* RIGHT: Inspector + News */}
        <section className="lg:col-span-5 flex flex-col h-full gap-6">
          <div className="flex-1 min-h-[300px]">
            {selectedMetricItem ? (
              <AssetInspector item={selectedMetricItem} meta={selectedMeta}
                aliases={SYMBOL_ALIASES[selectedSymbol] || [selectedSymbol]} />
            ) : (
              <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center text-brand-text-muted flex flex-col justify-center items-center h-full">
                <Database className="w-8 h-8 text-brand-text-muted mb-2.5 animate-pulse" />
                <h3 className="text-sm font-semibold text-white">Synchronizing Selection...</h3>
                <p className="text-[10px] max-w-xs mt-1.5 leading-relaxed">
                  Hold tight while we bind standard index tickers with the latest level responses.
                </p>
              </div>
            )}
          </div>
          <div className="flex-1">
            <NewsFeed news={news} isLoading={loadingNews} />
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="h-8 bg-brand-bar border-t border-brand-border px-6 flex items-center justify-between text-[10px] text-brand-text-muted font-mono shrink-0 select-none">
        <div className="flex gap-4">
          <span>TIME: {new Date().toLocaleTimeString('en-US', { hour12: false })} IST</span>
          <span>LATENCY: {tickerTimestamp ? `${Date.now() - tickerTimestamp}ms` : '--'}</span>
        </div>
        <div className="flex gap-4">
          <span>CACHE: {cooldownCountdown > 0 ? 'HIT' : 'STALE'}</span>
          <span>ENGINE: BROWSER_DIRECT_v3</span>
        </div>
      </footer>

      <div className="absolute top-[20%] left-[-100px] w-96 h-96 bg-[#10B981]/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-100px] w-96 h-96 bg-[#10B981]/3 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}