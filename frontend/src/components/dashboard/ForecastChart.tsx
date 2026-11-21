// dashboard forecast chart
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "../../lib/format";
import type { ForecastPoint } from "../../lib/forecast";

export interface ForecastMarker {
  date: string;
  label: string;
  kind: "in" | "out";
  amount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "YYYY-MM-DD" -> "dd MMM" without a date library. */
function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? ""}`;
}

interface ChartRow {
  date: string;
  balance: number;
  positive: number;
  negative: number;
  /** Baseline (no scenario) balance on the same date; present only when a baseline is drawn. */
  baseline?: number;
}

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: 12,
        color: "var(--text)",
        padding: "8px 12px",
      }}
    >
      <div className="text-xs text-muted-text">{formatDayMonth(row.date)}</div>
      <div className="font-semibold tabular-nums">{formatINR(row.balance)}</div>
    </div>
  );
}

export default function ForecastChart({
  series,
  markers,
  baselineSeries,
  yDomain,
}: {
  series: ForecastPoint[];
  markers: ForecastMarker[];
  /** Baseline (no scenario) series, drawn as a faint dashed ghost line behind the active line. */
  baselineSeries?: ForecastPoint[];
  /** Fixed y-axis range; when absent the axis auto-scales as before. */
  yDomain?: [number, number];
}) {
  const baselineByDate = baselineSeries ? new Map(baselineSeries.map((p: ForecastPoint) => [p.date, p.balance])) : null;
  const data: ChartRow[] = series.map((p) => ({
    date: p.date,
    balance: p.balance,
    positive: Math.max(0, p.balance),
    negative: Math.min(0, p.balance),
    ...(baselineByDate ? { baseline: baselineByDate.get(p.date) } : {}),
  }));

  // Event dots sit on the bottom edge of the plotted range, so they never collide with the balance line.
  const floorY = Math.min(0, ...series.map((p) => p.balance));
  const firstShortfall = series.find((p) => p.balance < 0);

  return (
    <div className="tabular-nums">
      <div className="mb-2 flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--success)" }} />
          Money in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} />
          Bills
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--surface-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayMonth}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            minTickGap={24}
            stroke="var(--surface-border)"
          />
          <YAxis
            {...(yDomain ? { domain: yDomain } : {})}
            tickFormatter={(v: number) => v.toLocaleString("en-IN")}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            stroke="var(--surface-border)"
          />
          <Tooltip content={<ForecastTooltip />} />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
          {markers.map((m) => {
            const color = m.kind === "in" ? "var(--success)" : "var(--danger)";
            const tip = `${m.label} · ${formatINR(m.amount)}`;
            return (
              <ReferenceDot
                key={`${m.kind}-${m.date}-${m.label}`}
                x={m.date}
                y={floorY}
                ifOverflow="extendDomain"
                shape={(p: { cx?: number; cy?: number }) => (
                  <g>
                    <title>{tip}</title>
                    <circle cx={p.cx} cy={p.cy} r={4} fill={color} />
                  </g>
                )}
              />
            );
          })}
          {firstShortfall && (
            <ReferenceLine
              x={firstShortfall.date}
              stroke="var(--danger)"
              strokeOpacity={0.6}
              strokeDasharray="4 4"
              label={{ value: "Cash runs out", position: "top", fill: "var(--danger)", fontSize: 10 }}
            />
          )}
          {baselineSeries && (
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--text-muted)"
              strokeOpacity={0.6}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="positive"
            stroke="var(--success)"
            fill="var(--success)"
            fillOpacity={0.25}
            isAnimationActive
            animationDuration={500}
          />
          <Area
            type="monotone"
            dataKey="negative"
            stroke="var(--danger)"
            fill="var(--danger)"
            fillOpacity={0.25}
            isAnimationActive
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
