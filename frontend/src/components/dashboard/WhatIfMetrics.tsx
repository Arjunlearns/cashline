// what-if headline metrics: runway, days in red and worst cash gap, with deltas against the baseline
import { formatINR } from "../../lib/format";

export interface WhatIfNumbers {
  runwayDays: number;
  daysInRed: number;
  worstGap: number;
}

export interface WhatIfMetricsProps {
  baseline: WhatIfNumbers;
  current: WhatIfNumbers;
  active: boolean;
}

/** "+3" / "-3" / "0": a plain signed count. */
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Green when the change helps, red when it hurts, muted when it is zero. */
function toneFor(delta: number, higherIsBetter: boolean): string {
  if (delta === 0) return "text-text-muted";
  return (delta > 0) === higherIsBetter ? "text-success" : "text-danger";
}

function Metric({ label, value, delta }: { label: string; value: string; delta: { text: string; tone: string } | null }) {
  return (
    <div className="rounded-2xl border border-surface-border p-5">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-text">{value}</div>
      {delta && <div className={`mt-1 text-xs tabular-nums ${delta.tone}`}>{delta.text}</div>}
    </div>
  );
}

export default function WhatIfMetrics({ baseline, current, active }: WhatIfMetricsProps) {
  // Values shown are the current ones when a what-if is set, otherwise the baseline.
  const shown = active ? current : baseline;

  const dRunway = current.runwayDays - baseline.runwayDays;
  const dRed = current.daysInRed - baseline.daysInRed;
  const dGap = current.worstGap - baseline.worstGap;

  // Warning line: only when runway is unchanged but cash got worse.
  let warning: string | null = null;
  if (active && dRunway === 0) {
    if (dGap < 0) {
      warning = `Runway unchanged, but your worst cash gap grows by ${formatINR(Math.abs(dGap))}.`;
    } else if (dRed > 0) {
      warning = `Runway unchanged, but you spend ${dRed} more days in the red.`;
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Runway (days)"
          value={`${shown.runwayDays}`}
          delta={active ? { text: `${signed(dRunway)} days`, tone: toneFor(dRunway, true) } : null}
        />
        <Metric
          label="Days in the red"
          value={`${shown.daysInRed}`}
          delta={active ? { text: `${signed(dRed)} days`, tone: toneFor(dRed, false) } : null}
        />
        <Metric
          label="Worst cash gap"
          value={formatINR(shown.worstGap)}
          delta={
            active
              ? { text: `${dGap > 0 ? "+" : ""}${formatINR(dGap)}`, tone: toneFor(dGap, true) }
              : null
          }
        />
      </div>
      {warning && <p className="mt-3 text-sm text-warning">{warning}</p>}
    </div>
  );
}
