export interface ChartBar {
  label: string; // x-axis label (e.g. "Apr", "May")
  value: number; // can be negative (downward bar)
}

interface Props {
  bars: ChartBar[];
  height?: number; // px height of the plot area
  selectedIndex?: number; // highlight the bar matching the selected row
}

const fmtAxis = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

/**
 * Bar chart for the Stock Item Monthly/Daily summary — plots the closing
 * balance per period. Strict gray theme (no hue): sign is conveyed by shade
 * and direction, not colour. Positive bars grow up in dark grey, negative bars
 * grow down in mid grey; the selected bar is solid black. A zero baseline rule
 * plus min/max axis labels give it the structure of TallyPrime's report chart.
 */
export default function StockBarChart({ bars, height = 96, selectedIndex = -2 }: Props) {
  if (!bars.length) return null;

  const values = bars.map((b) => b.value);
  const maxPos = Math.max(0, ...values);
  const minNeg = Math.min(0, ...values);
  const hasNeg = minNeg < 0;
  const hasPos = maxPos > 0;
  const span = Math.max(1, maxPos - minNeg); // total value range across baseline

  const plotH = height;
  // Baseline splits the plot proportionally so up/down bars share the height.
  const baseY = hasNeg ? (maxPos / span) * plotH : plotH - 1;

  // Per-slot geometry in a normalized 0..100 width space.
  const slot = 100 / bars.length;
  const barW = Math.min(8, slot * 0.6);
  const gap = (slot - barW) / 2;

  return (
    <div className="border-t border-gray-200 bg-white px-3 pt-1.5 pb-1 shrink-0 select-none">
      <div className="flex gap-2">
        {/* y-axis labels — positioned against the real zero baseline */}
        <div
          className="relative text-[8px] font-mono text-black leading-none w-8 shrink-0"
          style={{ height: plotH }}
        >
          {hasPos && (
            <span className="absolute right-0" style={{ top: 0 }}>
              {fmtAxis(maxPos)}
            </span>
          )}
          <span className="absolute right-0 -translate-y-1/2" style={{ top: baseY }}>
            0
          </span>
          {hasNeg && (
            <span className="absolute right-0" style={{ bottom: 0 }}>
              {fmtAxis(minNeg)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 100 ${plotH}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: plotH }}
          >
            {/* zero baseline */}
            <line
              x1="0"
              y1={baseY}
              x2="100"
              y2={baseY}
              stroke="#a1a1aa"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
            {bars.map((b, i) => {
              const isNeg = b.value < 0;
              const h = (Math.abs(b.value) / span) * plotH;
              const x = i * slot + gap;
              const y = isNeg ? baseY : baseY - h;
              const sel = i === selectedIndex;
              const fill = sel ? '#18181b' : isNeg ? '#a1a1aa' : '#52525b';
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(b.value === 0 ? 0 : 0.6, h)}
                  fill={fill}
                />
              );
            })}
          </svg>
          {/* x-axis labels (HTML so they stay crisp / non-stretched) */}
          <div className="flex w-full text-[8px] font-mono text-black leading-none pt-0.5">
            {bars.map((b, i) => (
              <span
                key={i}
                className={`text-center truncate ${i === selectedIndex ? 'text-black font-bold' : ''}`}
                style={{ width: `${slot}%` }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
