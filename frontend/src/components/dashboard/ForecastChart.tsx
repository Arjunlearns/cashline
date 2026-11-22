// dashboard forecast chart
import { useEffect, useState } from "react";
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
import { prefersReducedMotion } from "./useTimelapse";

export interface ForecastMarker {
  date: string;
  label: string;
  kind: "in" | "out";
  amount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "YYYY-MM-DD" -> "dd MMM" without a date library. */
export function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? ""}`;
}

const AXIS_STEPS = [10_000, 20_000, 30_000, 50_000];
const AXIS_MAX_TICKS = 8;

/**
 * Y-axis tick spacing: the smallest step from AXIS_STEPS that keeps the tick count within AXIS_MAX_TICKS
 * once [low, high] is widened to whole multiples of that step (0 is always inside, as a multiple).
 */
export function axisStep(low: number, high: number): number {
  for (const s of AXIS_STEPS) {
    const count = Math.ceil(high / s) - Math.floor(low / s) + 1;
    if (count <= AXIS_MAX_TICKS) return s;
  }
  return AXIS_STEPS[AXIS_STEPS.length - 1];
}

/** Round ticks from the domain's low end to its high end (both already multiples of the step). */
function axisTicks(domain: [number, number]): number[] {
  const step = axisStep(domain[0], domain[1]);
  const out: number[] = [];
  for (let v = domain[0]; v <= domain[1]; v += step) out.push(v);
  return out;
}

// Chart-only SVG paint: gradients and hatch use theme tokens; glow and head effects are transform/opacity-free filters.
const CHART_CSS = `
.fc-glow .recharts-area-curve { filter: drop-shadow(0 0 3px var(--accent)); }
.fc-glow .fc-head { filter: drop-shadow(0 0 4px var(--accent)); }
`;

interface ChartRow {
  date: string;
  /** null for days not yet revealed by the time-lapse. */
  balance: number | null;
  positive: number | null;
  negative: number | null;
  /** Baseline (no scenario) balance on the same date; present only when a baseline is drawn. */
  baseline?: number;
  /** [low, high] between the baseline and the active balance; null when hidden or no baseline. */
  gap?: [number, number] | null;
}

function ForecastTooltip({ active, payload, markers }: { active?: boolean; payload?: any[]; markers?: ForecastMarker[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  if (row.balance === null) return null;
  const events = (markers ?? []).filter((m) => m.date === row.date);
  return (
    <div
      style={{
        background: "var(--surface-solid)",
        border: "1px solid var(--surface-border)",
        borderRadius: 12,
        color: "var(--text)",
        padding: "8px 12px",
      }}
    >
      <div className="text-xs text-muted-text">{formatDayMonth(row.date)}</div>
      <div className="font-semibold tabular-nums">{formatINR(row.balance)}</div>
      {events.map((m) => (
        <div
          key={`${m.kind}-${m.label}`}
          className={`mt-1 text-xs tabular-nums ${m.kind === "out" ? "text-danger" : "text-success"}`}
        >
          {`${m.kind === "out" ? "-" : "+"}${formatINR(m.amount)} ${m.label}`}
        </div>
      ))}
    </div>
  );
}

export default function ForecastChart({
  series,
  markers,
  baselineSeries,
  yDomain,
  playDay,
  pulse,
  reduced = false,
}: {
  series: ForecastPoint[];
  markers: ForecastMarker[];
  /** Baseline (no scenario) series, drawn as a faint dashed ghost line behind the active line. */
  baselineSeries?: ForecastPoint[];
  /** Fixed y-axis range; when absent the axis auto-scales as before. */
  yDomain?: [number, number];
  /** Time-lapse: index of the current day. Days after it are hidden; a "today" line is drawn. */
  playDay?: number;
  /** Time-lapse: indexes into `markers` whose pulse is currently running. */
  pulse?: ReadonlySet<number>;
  /** Reduced motion: no head pulse and no draw-in. */
  reduced?: boolean;
}) {
  const baselineByDate = baselineSeries ? new Map(baselineSeries.map((p: ForecastPoint) => [p.date, p.balance])) : null;
  const shown = playDay === undefined ? series.length : playDay + 1;
  const data: ChartRow[] = series.map((p, i) => {
    const hidden = i >= shown;
    const base = baselineByDate?.get(p.date);
    return {
      date: p.date,
      balance: hidden ? null : p.balance,
      positive: hidden ? null : Math.max(0, p.balance),
      negative: hidden ? null : Math.min(0, p.balance),
      ...(baselineByDate ? { baseline: base } : {}),
      gap: hidden || base === undefined ? null : [Math.min(p.balance, base), Math.max(p.balance, base)],
    };
  });

  // Largest gap between the ghost baseline and the active line, over the revealed days.
  let gapIdx = -1;
  let gapAmt = 0;
  data.forEach((row, i) => {
    if (row.gap) {
      const d = row.gap[1] - row.gap[0];
      if (d > gapAmt) {
        gapAmt = d;
        gapIdx = i;
      }
    }
  });

  // Draw the line in once on first load only; later re-renders (scenario changes) do not replay it.
  const [drawing, setDrawing] = useState(() => playDay === undefined && !reduced && !prefersReducedMotion());
  useEffect(() => {
    if (!drawing) return;
    const t = setTimeout(() => setDrawing(false), 600);
    return () => clearTimeout(t);
  }, [drawing]);

  // Event dots sit on the bottom edge of the plotted range, so they never collide with the balance line.
  const floorY = Math.min(0, ...series.map((p) => p.balance));
  const firstShortfall = series.find((p) => p.balance < 0);

  // Gradient split point: where zero sits between the top and bottom of the y domain (0 = top).
  const domLo = yDomain ? yDomain[0] : floorY;
  const domHi = yDomain ? yDomain[1] : Math.max(0, ...series.map((p) => p.balance));
  const zeroFrac = domHi > domLo ? Math.min(1, Math.max(0, domHi / (domHi - domLo))) : 0.5;
  const yTicks = yDomain ? axisTicks(yDomain) : undefined;

  // Replay head: current day plus a short fading trail of the 8 days before it.
  const headIdx = playDay !== undefined && series[playDay] ? playDay : -1;
  const trail = headIdx >= 0 ? Array.from({ length: 8 }, (_, k) => headIdx - k - 1).filter((i) => i >= 0) : [];

  return (
    <div className="tabular-nums">
      <style>{CHART_CSS}</style>
      {/* Shared paint definitions, referenced by url(#id) below. Hidden and zero-size. */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="fc-stroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} style={{ stopColor: "var(--success)" }} />
            <stop offset={zeroFrac} style={{ stopColor: "var(--success)" }} />
            <stop offset={zeroFrac} style={{ stopColor: "var(--danger)" }} />
            <stop offset={1} style={{ stopColor: "var(--danger)" }} />
          </linearGradient>
          <linearGradient id="fc-area-pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} style={{ stopColor: "var(--success)", stopOpacity: 0.35 }} />
            <stop offset={1} style={{ stopColor: "var(--success)", stopOpacity: 0 }} />
          </linearGradient>
          <pattern id="fc-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" style={{ fill: "var(--danger)", fillOpacity: 0.08 }} />
            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: "var(--danger)", strokeWidth: 2 }} />
          </pattern>
        </defs>
      </svg>
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
      <div className="fc-glow">
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
              {...(yDomain ? { domain: yDomain, ticks: yTicks } : {})}
              tickFormatter={(v: number) => (v === 0 ? "0" : v.toLocaleString("en-IN"))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              stroke="var(--surface-border)"
            />
            <Tooltip
              content={<ForecastTooltip markers={markers} />}
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
            />
            <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} strokeOpacity={0.5} />
            {markers.map((m, i) => {
              const color = m.kind === "in" ? "var(--success)" : "var(--danger)";
              const tip = `${m.label} · ${formatINR(m.amount)}`;
              const pulsing = pulse?.has(i) ?? false;
              return (
                <ReferenceDot
                  key={`${m.kind}-${m.date}-${m.label}`}
                  x={m.date}
                  y={floorY}
                  ifOverflow="extendDomain"
                  shape={(p: { cx?: number; cy?: number }) => (
                    <g>
                      <title>{tip}</title>
                      {pulsing && <circle className="tl-pulse" cx={p.cx} cy={p.cy} r={4} fill={color} />}
                      <circle cx={p.cx} cy={p.cy} r={4} fill={color} />
                    </g>
                  )}
                />
              );
            })}
            {playDay !== undefined && series[playDay] && (
              <ReferenceLine x={series[playDay].date} stroke="var(--accent)" strokeWidth={1} ifOverflow="extendDomain" />
            )}
            {firstShortfall && (
              <ReferenceLine
                x={firstShortfall.date}
                stroke="var(--danger)"
                strokeOpacity={0.6}
                strokeDasharray="4 4"
                label={{ value: "Cash runs out", position: "top", fill: "var(--danger)", fontSize: 10 }}
              />
            )}
            {trail.map((i, k) => (
              <ReferenceDot
                key={`trail-${i}`}
                x={series[i].date}
                y={series[i].balance}
                ifOverflow="extendDomain"
                shape={(p: { cx?: number; cy?: number }) => (
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={3}
                    style={{ fill: "var(--accent)" }}
                    fillOpacity={(trail.length - k) / (trail.length + 1)}
                  />
                )}
              />
            ))}
            {headIdx >= 0 && (
              <ReferenceDot
                key="head"
                x={series[headIdx].date}
                y={series[headIdx].balance}
                ifOverflow="extendDomain"
                shape={(p: { cx?: number; cy?: number }) => (
                  <g className="fc-head">
                    {!reduced && <circle className="tl-pulse" cx={p.cx} cy={p.cy} r={7} style={{ fill: "var(--accent)" }} />}
                    <circle cx={p.cx} cy={p.cy} r={4.5} style={{ fill: "var(--accent)" }} />
                  </g>
                )}
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
            {baselineSeries && (
              <Area
                type="monotone"
                dataKey="gap"
                stroke="none"
                fill="url(#fc-hatch)"
                isAnimationActive={false}
              />
            )}
            {baselineSeries && gapIdx >= 0 && data[gapIdx].gap && (
              <ReferenceDot
                x={data[gapIdx].date}
                y={data[gapIdx].gap![1]}
                ifOverflow="extendDomain"
                r={3}
                fill="var(--danger)"
                stroke="none"
                label={{
                  value: `-${formatINR(gapAmt)}`,
                  position: "top",
                  fill: "var(--danger)",
                  fontSize: 11,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="positive"
              stroke="url(#fc-stroke)"
              strokeWidth={2.5}
              fill="url(#fc-area-pos)"
              isAnimationActive={drawing}
              animationDuration={600}
            />
            <Area
              type="monotone"
              dataKey="negative"
              stroke="url(#fc-stroke)"
              strokeWidth={2.5}
              fill="url(#fc-hatch)"
              isAnimationActive={drawing}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
