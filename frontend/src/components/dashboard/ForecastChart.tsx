// dashboard forecast chart
import {
  Area,
  AreaChart,
  CartesianGrid,
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
}

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div
      style={{
        background: "#0B0D10",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <div className="text-xs text-[#8a909c]">{formatDayMonth(row.date)}</div>
      <div className="font-semibold tabular-nums">{formatINR(row.balance)}</div>
    </div>
  );
}

export default function ForecastChart({
  series,
  markers,
}: {
  series: ForecastPoint[];
  markers: ForecastMarker[];
}) {
  const data: ChartRow[] = series.map((p) => ({
    date: p.date,
    balance: p.balance,
    positive: Math.max(0, p.balance),
    negative: Math.min(0, p.balance),
  }));

  return (
    <div className="tabular-nums">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayMonth}
            tick={{ fill: "#8a909c", fontSize: 11 }}
            minTickGap={24}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            tickFormatter={(v: number) => v.toLocaleString("en-IN")}
            tick={{ fill: "#8a909c", fontSize: 11 }}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip content={<ForecastTooltip />} />
          <ReferenceLine y={0} stroke="#8a909c" strokeWidth={1} />
          {markers.map((m) => {
            const color = m.kind === "in" ? "#34d399" : "#fbbf24";
            return (
              <ReferenceLine
                key={`${m.kind}-${m.date}-${m.label}`}
                x={m.date}
                stroke={color}
                strokeDasharray="4 4"
                label={{ value: m.label, position: "top", fill: color, fontSize: 10 }}
              />
            );
          })}
          <Area
            type="monotone"
            dataKey="positive"
            stroke="#34d399"
            fill="#34d399"
            fillOpacity={0.15}
            isAnimationActive
          />
          <Area
            type="monotone"
            dataKey="negative"
            stroke="#f87171"
            fill="#f87171"
            fillOpacity={0.35}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
