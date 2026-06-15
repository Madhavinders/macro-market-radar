export interface MetricItem {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  source: string;
}

export interface MarketDataPayload {
  data: MetricItem[];
  timestamp: number;
  source: string;
  missing?: string[];
}

export interface NewsItem {
  title: string;
  source: string;
  pubDate: string;
  link: string;
}

export type AssetCategory = 'all' | 'equities' | 'commodities' | 'rates' | 'currencies';

export interface AssetDefinition {
  symbol: string;
  name: string;
  category: 'equities' | 'commodities' | 'rates' | 'currencies';
  description: string;
  unit?: string;
}
