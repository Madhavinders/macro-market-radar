import { MetricItem } from '../types';
import { ASSETS_METADATA } from '../constants';
import { ShieldCheck, AlertTriangle, Flame, Layers, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface MarketStatsProps {
  items: MetricItem[];
}

export function MarketStats({ items }: MarketStatsProps) {
  // 1. Calculate overall market breadth (gainers vs losers count)
  const totalSymbols = items.length;
  const gainers = items.filter(t => t.regularMarketChangePercent > 0).length;
  const losers = totalSymbols - gainers;
  const breadthPercent = totalSymbols > 0 ? (gainers / totalSymbols) * 100 : 50;

  // 2. Volatility analysis (VIX)
  const vixItem = items.find(t => t.symbol === '^VIX');
  const vixPrice = vixItem ? vixItem.regularMarketPrice : 15;
  
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'extreme' = 'low';
  let riskLabel = 'Low Volatility Environment';
  let riskColor = 'text-brand-green bg-[#10B981]/15 border-[#10B981]/35';
  let riskDesc = 'Equity markets are characterized by stable conditions and low fear indices.';

  if (vixPrice >= 30) {
    riskLevel = 'extreme';
    riskLabel = 'Systemic Volatility / Extreme Fear';
    riskColor = 'text-brand-red bg-[#EF4444]/15 border-[#EF4444]/35';
    riskDesc = 'Severe market stress and panic pricing. Gold or dollar safe-havens may be experiencing volume.';
  } else if (vixPrice >= 20) {
    riskLevel = 'elevated';
    riskLabel = 'Elevated Volatility / Real Uncertainty';
    riskColor = 'text-amber-400 bg-amber-500/15 border-amber-500/35';
    riskDesc = 'Widespread hedging is taking place. Expect fast adjustments across indices.';
  } else if (vixPrice >= 14) {
    riskLevel = 'moderate';
    riskLabel = 'Standard Market Variance';
    riskColor = 'text-blue-400 bg-blue-500/15 border-blue-500/35';
    riskDesc = 'Healthy equilibrium, standard liquid asset rotation.';
  }

  // 3. Category performance averages
  const categoryStats = items.reduce((acc, item) => {
    const meta = ASSETS_METADATA[item.symbol];
    if (!meta) return acc;
    if (!acc[meta.category]) {
      acc[meta.category] = { sum: 0, count: 0 };
    }
    acc[meta.category].sum += item.regularMarketChangePercent;
    acc[meta.category].count += 1;
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  return (
    <div id="market-stats-container" className="bg-brand-card border border-brand-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-brand-green" />
        Macro Intelligence Desk
      </h3>

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        
        {/* Market Breadth Card */}
        <div className="bg-brand-hover p-4 rounded-lg border border-brand-border">
          <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono">Market Breadth</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-semibold text-white font-mono">{breadthPercent.toFixed(0)}%</span>
            <span className="text-xs text-brand-text-muted">Green</span>
          </div>
          
          {/* Custom gauge timeline */}
          <div className="w-full bg-brand-border h-1.5 rounded-full mt-3 overflow-hidden flex">
            <div 
              style={{ width: `${breadthPercent}%` }} 
              className="bg-brand-green transition-all duration-500"
            />
            <div 
              style={{ width: `${100 - breadthPercent}%` }} 
              className="bg-brand-red transition-all duration-500"
            />
          </div>
          <p className="text-[10px] text-brand-text-muted mt-2 font-mono flex items-center justify-between">
            <span>{gainers} Gainers</span>
            <span>{losers} Losers</span>
          </p>
        </div>

        {/* Volatility Indicator */}
        <div className="bg-brand-hover p-4 rounded-lg border border-brand-border col-span-1 md:col-span-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono">System Risk Factor</span>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${riskColor}`}>
              VIX: {vixPrice.toFixed(2)}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-white mt-2 flex items-center gap-1.5">
            {vixPrice >= 20 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-brand-green shrink-0" />
            )}
            {riskLabel}
          </h4>
          <p className="text-[10.5px] text-brand-text-muted mt-1 leading-relaxed">
            {riskDesc}
          </p>
        </div>

      </div>

      {/* Category Performance index row */}
      <div>
        <h4 className="text-[10.5px] font-mono text-brand-text-muted uppercase tracking-wider mb-2">
          Category Momentum Profile
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(categoryStats).map(([category, { sum, count }]) => {
            const avg = sum / count;
            const isAvgPos = avg >= 0;
            return (
              <div 
                key={category} 
                className="bg-brand-hover/60 hover:bg-brand-hover hover:border-brand-border-active transition-colors p-3 rounded-lg border border-brand-border flex flex-col justify-between"
              >
                <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-semibold">
                  {category}
                </span>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-[10px] text-brand-text-muted font-mono">Avg:</span>
                  <span className={`text-xs font-semibold font-mono ${isAvgPos ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isAvgPos ? '▲ +' : '▼ '}{avg.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
