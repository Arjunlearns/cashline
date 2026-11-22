// 90-day forecast with a "play the next 90 days" time-lapse on top of ForecastChart
import { useEffect, useRef, useState } from "react";
import { formatINR } from "../../lib/format";
import { getCalm } from "../../lib/theme";
import type { ForecastPoint } from "../../lib/forecast";
import ForecastChart, { formatDayMonth, type ForecastMarker } from "./ForecastChart";
import TimelapseControls from "./TimelapseControls";
import { msPerDay, prefersReducedMotion, useTimelapse } from "./useTimelapse";

/** How long an event pulse and its label stay on screen, in real milliseconds. */
const LABEL_MS = 1400;
/** At most this many event labels are visible at once. */
const MAX_LABELS = 2;

// Only transform and opacity are animated. Calm mode swaps in gentler keyframes.
const TIMELAPSE_CSS = `
.tl-pulse { transform-box: fill-box; transform-origin: center; animation: tl-pulse 900ms ease-out both; }
@keyframes tl-pulse { from { transform: scale(1); opacity: 0.7; } to { transform: scale(3); opacity: 0; } }
.tl-calm .tl-pulse { animation-name: tl-pulse-calm; }
@keyframes tl-pulse-calm { from { transform: scale(1); opacity: 0.35; } to { transform: scale(1.8); opacity: 0; } }
.tl-label { animation: tl-label 1400ms ease-out both; }
@keyframes tl-label { 0% { opacity: 0; transform: translateY(4px); } 15%, 75% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-2px); } }
.tl-vignette { position: fixed; inset: 0; pointer-events: none; z-index: 40; box-shadow: inset 0 0 160px 40px var(--danger); animation: tl-vignette 1200ms ease-out both; }
@keyframes tl-vignette { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
.tl-calm .tl-vignette { animation-name: tl-vignette-calm; animation-duration: 800ms; }
@keyframes tl-vignette-calm { 0% { opacity: 0; } 30% { opacity: 0.3; } 100% { opacity: 0; } }
`;

/** Label text such as "-₹28,000 Rent" or "+₹35,000 Studio Kala" (invoice id dropped). */
function eventLabel(m: ForecastMarker): string {
  const name = m.kind === "in" ? m.label.replace(/^INV-\d+\s*/, "") : m.label.split(" (")[0];
  return `${m.kind === "out" ? "-" : "+"}${formatINR(m.amount)} ${name.trim()}`;
}

export default function ForecastTimelapse({
  series,
  markers,
  baselineSeries,
  yDomain,
}: {
  series: ForecastPoint[];
  markers: ForecastMarker[];
  /** Baseline (no scenario) series. Drawn in full from the start as the ghost line. */
  baselineSeries?: ForecastPoint[];
  yDomain?: [number, number];
}) {
  const last = series.length - 1;
  const tl = useTimelapse(last);
  const [reduced] = useState(prefersReducedMotion);
  const calm = getCalm();
  const day = Math.min(tl.day, last);
  const point = series[day];
  const negative = point.balance < 0;

  // Events placed on the series' day index, in firing order.
  const dayOf = new Map(series.map((p, i) => [p.date, i]));
  const events = markers
    .map((m, idx) => ({ idx, m, day: dayOf.get(m.date) ?? -1 }))
    .filter((e) => e.day >= 0)
    .sort((a, b) => a.day - b.day || a.idx - b.idx);
  // Events fire as the marker passes them; their pulse and label last LABEL_MS of real time.
  const windowDays = Math.max(1, Math.ceil(LABEL_MS / msPerDay(last, tl.speed)));
  const fired = tl.playing && !reduced ? events.filter((e) => e.day <= day && day - e.day < windowDays) : [];
  const pulse = new Set(fired.map((e) => e.idx));
  const labels = fired.slice(-MAX_LABELS);

  // Vignette: flash once, the first time the balance goes below zero during a playthrough.
  const firstNeg = series.findIndex((p) => p.balance < 0);
  const flashedRef = useRef(false);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (!tl.playing || reduced || firstNeg < 0 || day < firstNeg || flashedRef.current) return;
    flashedRef.current = true;
    setFlashKey((k) => k + 1);
  }, [day, tl.playing, reduced, firstNeg]);

  const onToggle = () => {
    // Starting a fresh run (from day 0 or after the end) re-arms the vignette.
    if (!tl.playing && (day === 0 || day >= last)) flashedRef.current = false;
    tl.toggle();
  };

  return (
    <div className={calm ? "tl-calm" : undefined}>
      <style>{TIMELAPSE_CSS}</style>

      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-xs text-text-muted">Balance on {formatDayMonth(point.date)}</div>
          <div className={`text-3xl font-semibold tabular-nums ${negative ? "text-danger" : ""}`}>
            {formatINR(point.balance)}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {tl.started && firstNeg >= 0 && day >= firstNeg && (
            <div className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-danger">
              {`Cash runs out · ${formatDayMonth(series[firstNeg].date)}`}
            </div>
          )}
          {labels.map((e) => (
            <div
              key={e.idx}
              className={`tl-label rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${
                e.m.kind === "out"
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-success/40 bg-success/10 text-success"
              }`}
            >
              {eventLabel(e.m)}
            </div>
          ))}
        </div>
      </div>

      <ForecastChart
        series={series}
        markers={markers}
        baselineSeries={baselineSeries}
        yDomain={yDomain}
        playDay={tl.started ? day : undefined}
        pulse={pulse}
        reduced={reduced}
      />

      <TimelapseControls tl={{ ...tl, toggle: onToggle }} lastDay={last} dateLabel={formatDayMonth(point.date)} />

      {flashKey > 0 && !reduced && <div key={flashKey} className="tl-vignette" aria-hidden="true" />}
    </div>
  );
}
