import type { MonthPoint } from "../data/mock";

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const stroke = score >= 75 ? "var(--leaf)" : score >= 50 ? "var(--amber)" : "var(--alarm)";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Sustainability score ${score} of 100`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={9} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.1em"
        className="fill-[var(--ink)] font-mono text-[26px] tabular-nums"
      >
        {score}
      </text>
      <text
        x="50%"
        y="68%"
        textAnchor="middle"
        className="fill-[var(--ink-faint)] text-[10px] uppercase tracking-[0.2em]"
      >
        score
      </text>
    </svg>
  );
}

export function ScopeBar({
  scope1,
  scope2,
  scope3,
}: {
  scope1: number;
  scope2: number;
  scope3: number;
}) {
  const total = Math.max(0.001, scope1 + scope2 + scope3);
  const parts = [
    { label: "Scope 1", value: scope1, color: "var(--leaf)" },
    { label: "Scope 2", value: scope2, color: "var(--teal)" },
    { label: "Scope 3", value: scope3, color: "var(--lime)" },
  ];
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {parts.map((p) => (
          <div
            key={p.label}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
        {parts.map((p) => (
          <span
            key={p.label}
            className="flex items-center gap-2 font-mono text-[11px] text-ink-muted tabular-nums"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label} · {p.value.toFixed(1)} t ({Math.round((p.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

const W = 640;
const H = 180;

export function TrendChart({ series }: { series: MonthPoint[] }) {
  const totals = series.map((m) => m.scope1 + m.scope2 + m.scope3);
  const max = Math.max(...totals) * 1.12;
  const bw = W / series.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 22}`}
      width="100%"
      height={H + 22}
      role="img"
      aria-label="Monthly emissions trend"
    >
      {series.map((m, i) => {
        const stack = [
          { v: m.scope3, c: "var(--lime)" },
          { v: m.scope2, c: "var(--teal)" },
          { v: m.scope1, c: "var(--leaf)" },
        ];
        let y = H;
        return (
          <g key={m.month}>
            {stack.map((s) => {
              const h = (s.v / max) * H;
              y -= h;
              return (
                <rect
                  key={s.c}
                  x={i * bw + bw * 0.18}
                  y={y}
                  width={bw * 0.64}
                  height={Math.max(1, h)}
                  fill={s.c}
                  rx={2}
                  opacity={0.92}
                />
              );
            })}
            <text
              x={i * bw + bw / 2}
              y={H + 15}
              textAnchor="middle"
              className="fill-[var(--ink-faint)] text-[10px]"
            >
              {m.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
