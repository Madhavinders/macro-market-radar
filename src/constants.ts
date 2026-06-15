import { AssetDefinition } from './types';

export const ASSETS_METADATA: Record<string, AssetDefinition> = {
  'SPY': {
    symbol: 'SPY',
    name: 'S&P 550 ETF',
    category: 'equities',
    description: 'Tracks the largest US large-cap equities (S&P 500)',
    unit: 'USD'
  },
  'QQQ': {
    symbol: 'QQQ',
    name: 'Nasdaq 100 ETF',
    category: 'equities',
    description: 'Tech-heavy index tracking the 100 largest non-financial firms',
    unit: 'USD'
  },
  'DIA': {
    symbol: 'DIA',
    name: 'Dow Jones ETF',
    category: 'equities',
    description: 'Price-weighted index representing 30 dominant blue-chip US firms',
    unit: 'USD'
  },
  'EEM': {
    symbol: 'EEM',
    name: 'Emerging Markets ETF',
    category: 'equities',
    description: 'Tracks large and mid-cap emerging market equities',
    unit: 'USD'
  },
  'BZ=F': {
    symbol: 'BZ=F',
    name: 'Brent Crude Oil',
    category: 'commodities',
    description: 'Global benchmark for sweet light crude oil shipped from North Sea',
    unit: 'USD / bbl'
  },
  'CL=F': {
    symbol: 'CL=F',
    name: 'WTI Light Crude',
    category: 'commodities',
    description: 'US domestic benchmark for light sweet crude oil futures',
    unit: 'USD / bbl'
  },
  '^TNX': {
    symbol: '^TNX',
    name: 'US 10-Year Treasury Yield',
    category: 'rates',
    description: 'Yield rate on benchmark U.S. government debt maturities',
    unit: '%'
  },
  '^IRX': {
    symbol: '^IRX',
    name: 'US 3-Month Treasury Yield',
    category: 'rates',
    description: 'Yield on short-term 90-day cash treasury bills',
    unit: '%'
  },
  'TLT': {
    symbol: 'TLT',
    name: '20+ Year Treasury Bond ETF',
    category: 'rates',
    description: 'Tracks long-term US sovereign bonds; highly sensitive to rate cuts',
    unit: 'USD'
  },
  'GC=F': {
    symbol: 'GC=F',
    name: 'Gold Bullion',
    category: 'commodities',
    description: 'Sovereign safe-haven asset hedged against fiat inflation',
    unit: 'USD / oz'
  },
  'SI=F': {
    symbol: 'SI=F',
    name: 'Silver Spot',
    category: 'commodities',
    description: 'Industrial and monetary precious metal index',
    unit: 'USD / oz'
  },
  'DX-Y.NYB': {
    symbol: 'DX-Y.NYB',
    name: 'US Dollar Index',
    category: 'currencies',
    description: 'Measures USD strength relative to a basket of major currencies',
    unit: 'DX'
  },
  '^VIX': {
    symbol: '^VIX',
    name: 'CBOE Volatility Index',
    category: 'equities',
    description: 'The market "Fear Gauge" measuring expected 30-day volatility',
    unit: 'pts'
  },
  'BTC-USD': {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    category: 'currencies',
    description: 'Decentralized digital hard-capped ledger asset',
    unit: 'USD'
  },
  'HG=F': {
    symbol: 'HG=F',
    name: 'Industrial Copper',
    category: 'commodities',
    description: 'Key industrial metal; reliable leading indicator for global growth',
    unit: 'USD / lb'
  }
};
