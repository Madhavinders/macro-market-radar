import { MetricItem, AssetDefinition } from '../types';
import { ExternalLink, Info, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AssetInspectorProps {
  item: MetricItem;
  meta: AssetDefinition;
  aliases: string[];
}

export function AssetInspector({ item, meta, aliases }: AssetInspectorProps) {
  const isPositive = item.regularMarketChangePercent >= 0;

  // Let's create intelligent custom economic correlation commentary per asset class!
  const getCorrelationCommentary = (symbol: string) => {
    switch (symbol) {
      case 'SPY':
        return 'Standard benchmark equity asset. Highly correlated with QQQ and DIA. Highly negatively correlated with ^VIX (the fear index). Serves as the key proxy for general domestic stock sentiment.';
      case 'QQQ':
        return 'Technology and high-beta focused index. High volatility relative to the broader indices, heavily influenced by mega-cap central tech balance sheets. Responsive to sovereign rate expectations.';
      case 'DIA':
        return 'Conservative mega-cap industrials. Highly correlated with domestic capital expenditures, industrial manufacturing health, and Dow-30 capital flow cycles.';
      case 'EEM':
        return 'Emerging markets equity basket. Highly sensitive to global dollar strength (DXY) and sovereign debt cycles, reflecting international credit risk appetite.';
      case 'BZ=F':
      case 'CL=F':
        return 'Fossil fuels / Energy index. Influenced directly by OPEC supply dynamics and US industrial output. Tend to have an inverse correlation with general consumer equity margin confidence during inflation spikes.';
      case '^TNX':
        return 'U.S. 10-Year Treasury Yield. Directly influences commercial bank borrowing, home mortgage interest rates, and absolute valuation discounts. Rises on expansion/inflation expectations.';
      case '^IRX':
        return 'U.S. 3-Month Treasury Yield. Pure indicator of Federal Reserve short-term policy. Aligns strictly with set borrowing bounds.';
      case 'TLT':
        return 'Long bond ETF. Strongly negatively correlated with ^TNX yields (bond prices fall as interest rates rise). Relied on by institutions for capital safety and safety hedges.';
      case 'GC=F':
        return 'Gold spot future. Historical wealth preserver. Positively correlated with negative real interest rates and geopolitical uncertainty (e.g., spike in VIX). Negatively correlated with aggressive dollar spikes (DXY).';
      case 'SI=F':
        return 'Silver spot. High volatility companion to Gold. Combines safe-haven premium with physical industrial demand (solar, semiconductors, global fabrication lines).';
      case 'DX-Y.NYB':
        return 'US Dollar Sovereign Strength Index. Highly negatively correlated with global commodity indices, emerging market securities, and Bitcoin (which trade inversely relative to fiat dollar strength).';
      case '^VIX':
        return 'S&P 500 implied risk/fear gauge. Sharply spiked during sudden equity panics. Standard negative correlation of -0.8 relative to daily SPY returns.';
      case 'BTC-USD':
        return 'Bitcoin digital token. Acts as a high-beta global liquidity index. Strongly correlated with interest-rate trends and technological expansion assets like QQQ, trading with high intraday variance.';
      case 'HG=F':
        return 'Copper spot future. Nicknamed "Dr. Copper" for its reliable leading indicator status. Extremely correlated with international industrial cycle expansion and manufacturing purchase indices.';
      default:
        return 'Provides an important proxy for global financial activity, interest-rate cycles, or physical trade requirements.';
    }
  };

  const yahooFinanceUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(item.symbol)}`;

  return (
    <div id="asset-inspector-panel" className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Aesthetic matrix grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      <div className="relative">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-text-muted font-mono">
              <Info className="w-3.5 h-3.5 text-brand-green" />
              Structural Inspector
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 flex items-baseline gap-2 font-sans">
              {meta.name}
              <span className="text-xs font-mono text-brand-text-muted font-medium bg-[#0F0F10] border border-brand-border px-1 rounded">
                {item.symbol}
              </span>
            </h2>
          </div>
          
          <a
            href={yahooFinanceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-text hover:text-white bg-brand-hover hover:bg-[#0F0F10] border border-brand-border px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono"
          >
            Terminal View
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="mt-4 border-t border-brand-border/80 pt-4 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono">Current Spot Rate</span>
            <p className="text-2xl font-bold font-mono text-white mt-0.5">
              {meta.unit && meta.unit.includes('USD') && <span className="text-sm font-normal text-brand-text-muted mr-0.5">$</span>}
              {item.regularMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              {meta.unit && meta.unit === '%' && <span className="text-sm font-normal text-brand-text-muted ml-0.5">%</span>}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono">24hr Net Action</span>
            <p className={`text-sm font-semibold font-mono mt-2.5 flex items-center gap-1 ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 shrink-0" /> : <ArrowDownRight className="w-4 h-4 shrink-0" />}
              {isPositive ? '+' : ''}{item.regularMarketChangePercent.toFixed(3)}%
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono block">Asset Profile & Role</span>
            <p className="text-xs text-brand-text leading-relaxed mt-1.5">
              {meta.description}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-mono block">Financial Correlation Notes</span>
            <p className="text-xs text-brand-text-muted leading-relaxed mt-1.5 italic">
              {getCorrelationCommentary(item.symbol)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-brand-border/80 pt-4">
        <div className="flex items-center gap-2 text-[10px] text-brand-text-muted font-mono mb-2">
          Server Alias Matrices Mapped:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {aliases.map((alias) => (
            <span
              key={alias}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                alias === item.symbol
                  ? 'bg-brand-green/10 text-brand-green border-brand-green/20 font-bold'
                  : 'bg-brand-hover text-brand-text-muted border-brand-border'
              }`}
            >
              {alias}
            </span>
          ))}
        </div>
        <div className="mt-3 text-[9.5px] text-brand-text-muted font-mono leading-relaxed">
          * Our multi-tier query cascades across Yahoo spark, query lists, and direct SDK buffers to resolve these tags sequentially.
        </div>
      </div>
    </div>
  );
}
