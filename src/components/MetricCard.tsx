import { MetricItem, AssetDefinition } from '../types';
import { Sparkline } from './Sparkline';
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle } from 'lucide-react';

interface MetricCardProps {
  item: MetricItem;
  meta: AssetDefinition;
  isSelected: boolean;
  onClick: () => void;
  key?: string;
}

export function MetricCard({ item, meta, isSelected, onClick }: MetricCardProps) {
  const isPositive = item.regularMarketChangePercent >= 0;

  // Pretty formatting for prices based on asset characteristics
  const formatPrice = (price: number, symbol: string) => {
    if (symbol.startsWith('^') || symbol === 'DX-Y.NYB') {
      // Yields and DXY index
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }
    if (price > 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const getUnitSymbol = (meta: AssetDefinition) => {
    if (meta.unit === '%') return '%';
    if (meta.unit?.includes('USD')) return '$';
    return '';
  };

  return (
    <button
      id={`metric-card-${item.symbol.replace(/[^a-zA-Z]/g, '')}`}
      onClick={onClick}
      className={`group relative text-left w-full rounded-xl p-4 transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-brand-green/40 cursor-pointer ${
        isSelected
          ? 'bg-brand-hover border-brand-green/40 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
          : 'bg-brand-card border-brand-border hover:bg-brand-hover hover:border-brand-border-active hover:shadow-lg'
      }`}
    >
      {/* Decorative colored glow bar */}
      <div 
        className={`absolute top-0 left-4 right-4 h-[2px] transition-opacity duration-300 rounded-full ${
          isSelected 
            ? 'opacity-100 bg-gradient-to-r from-transparent via-brand-green to-transparent' 
            : 'opacity-0 group-hover:opacity-60 bg-gradient-to-r from-transparent via-brand-border-active to-transparent'
        }`}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand-text-muted tracking-wider">
              {item.symbol}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-brand-text-muted bg-[#0F0F10] px-1.5 py-0.5 rounded border border-brand-border">
              {meta.category}
            </span>
          </div>
          <h3 className="text-sm font-medium text-brand-text mt-1 truncate group-hover:text-white transition-colors">
            {meta.name}
          </h3>
        </div>

        <div className={`flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full ${
          isPositive 
            ? 'text-brand-green bg-[#10B981]/10 border border-[#10B981]/20' 
            : 'text-brand-red bg-[#EF4444]/10 border border-[#EF4444]/20'
        }`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
          <span>{isPositive ? '+' : ''}{item.regularMarketChangePercent.toFixed(2)}%</span>
        </div>
      </div>

      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="flex items-baseline gap-1">
            {getUnitSymbol(meta) === '$' && <span className="text-brand-text-muted font-medium text-xs font-mono">$</span>}
            <span className="text-xl font-semibold font-mono tracking-tight text-white">
              {formatPrice(item.regularMarketPrice, item.symbol)}
            </span>
            {getUnitSymbol(meta) === '%' && <span className="text-brand-text-muted font-mono text-sm">%</span>}
          </div>
          <p className="text-[10px] text-brand-text-muted mt-0.5 font-mono">
            {meta.unit && meta.unit !== '%' && meta.unit !== 'USD' && <span>{meta.unit}</span>}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Sparkline change={item.regularMarketChangePercent} seed={item.symbol} />
          <span className="text-[9px] text-brand-text-muted font-mono tracking-tighter opacity-60 group-hover:opacity-90">
            via {item.source}
          </span>
        </div>
      </div>
    </button>
  );
}
