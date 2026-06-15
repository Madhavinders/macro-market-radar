import { useMemo } from 'react';

interface SparklineProps {
  change: number;
  seed: string;
}

export function Sparkline({ change, seed }: SparklineProps) {
  const points = useMemo(() => {
    // Deterministic random generator based on a seed string so the curve is consistent per ticker
    const xPositions = Array.from({ length: 15 }, (_, i) => i * 10); // 15 points
    let currentVal = 40; // start in the middle of a 100x60 container
    const computedPoints = [{ x: 0, y: currentVal }];

    // Simple hash function for seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const direction = change >= 0 ? -1 : 1; // -1 translates to SVG coordinates upwards
    const targetMove = Math.min(Math.abs(change) * 5, 25) * direction;

    for (let i = 1; i < xPositions.length; i++) {
      const stepSeed = Math.sin(hash + i) * 10000;
      const noise = (stepSeed - Math.floor(stepSeed)) - 0.5; // -0.5 to 0.5
      
      // Interpolate towards the final target change to ensure visual accuracy
      const pct = i / (xPositions.length - 1);
      const trend = targetMove * pct;
      const y = Math.max(5, Math.min(55, 40 + trend + noise * 12));
      
      computedPoints.push({ x: xPositions[i], y });
    }

    return computedPoints;
  }, [change, seed]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // Smooth curve calculation using cubic beziers
      const prev = points[i - 1];
      const cp1X = prev.x + 4;
      const cp1Y = prev.y;
      const cp2X = p.x - 4;
      const cp2Y = p.y;
      return `${acc} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  // SVG closed path for gradient fill
  const fillD = useMemo(() => {
    if (!pathD) return '';
    return `${pathD} L 140 60 L 0 60 Z`;
  }, [pathD]);

  const isPositive = change >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradId = `spark-grad-${seed.replace(/[^a-zA-Z]/g, '')}`;

  return (
    <div className="w-28 h-10 overflow-hidden opacity-90 transition-all duration-300 group-hover:opacity-100">
      <svg viewBox="0 0 140 60" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill */}
        <path
          d={fillD}
          fill={`url(#${gradId})`}
          stroke="none"
        />

        {/* Glow glow-path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_2px_4px_rgba(239,68,68,0.25)]"
          style={{
            filter: isPositive ? 'drop-shadow(0px 2px 5px rgba(16,185,129,0.3))' : 'drop-shadow(0px 2px 5px rgba(239,68,68,0.3))'
          }}
        />
      </svg>
    </div>
  );
}
