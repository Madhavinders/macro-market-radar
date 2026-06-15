import { MetricItem } from '../types';
import { ASSETS_METADATA } from '../constants';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerRibbonProps {
  items: MetricItem[];
  onSelectSymbol: (symbol: string) => void;
}

export function TickerRibbon({ items, onSelectSymbol }: TickerRibbonProps) {
  // We prefer to feature several bellwether indices in the top ribbon
  const featuredSymbols = ['SPY', 'QQQ', 'DX-Y.NYB', '^VIX', 'CL=F', 'GC=F', 'BTC-USD'];
  const featuredItems = items.filter(i => featuredSymbols.includes(i.symbol));

  return (
    <div className="bg-brand-bar border-y border-brand-border overflow-hidden py-2 whitespace-nowrap">
      <div className="flex animate-scroll hover:pause gap-8 items-center px-4 inline-flex">
        {featuredItems.map((item) => {
          const meta = ASSETS_METADATA[item.symbol];
          if (!meta) return null;
          const isPositive = item.regularMarketChangePercent >= 0;

          return (
            <button
              id={`ribbon-item-${item.symbol.replace(/[^a-zA-Z]/g, '')}`}
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="flex items-center gap-2 bg-brand-card hover:bg-brand-hover border border-brand-border px-3 py-1 rounded-lg text-left cursor-pointer transition-colors"
            >
              <span className="font-mono text-xs font-bold text-brand-text">{item.symbol}</span>
              <span className="text-[10px] text-brand-text-muted font-medium hidden sm:inline">{meta.name}</span>
              <span className="font-mono text-xs font-semibold text-white ml-1">
                {item.regularMarketPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className={`font-mono text-[10px] flex items-center gap-0.5 font-bold ${
                isPositive ? 'text-brand-green' : 'text-brand-red'
              }`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{item.regularMarketChangePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
        {/* Mirror the tickers for infinite scroll effect when window is narrow */}
        {featuredItems.map((item) => {
          const meta = ASSETS_METADATA[item.symbol];
          if (!meta) return null;
          const isPositive = item.regularMarketChangePercent >= 0;

          return (
            <button
              id={`ribbon-item-dup-${item.symbol.replace(/[^a-zA-Z]/g, '')}`}
              key={`${item.symbol}-dup`}
              onClick={() => onSelectSymbol(item.symbol)}
              className="flex items-center gap-2 bg-brand-card hover:bg-brand-hover border border-brand-border px-3 py-1 rounded-lg text-left cursor-pointer transition-colors"
            >
              <span className="font-mono text-xs font-bold text-brand-text">{item.symbol}</span>
              <span className="text-[10px] text-brand-text-muted font-medium hidden sm:inline">{meta.name}</span>
              <span className="font-mono text-xs font-semibold text-white ml-1">
                {item.regularMarketPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className={`font-mono text-[10px] flex items-center gap-0.5 font-bold ${
                isPositive ? 'text-brand-green' : 'text-brand-red'
              }`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{item.regularMarketChangePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
