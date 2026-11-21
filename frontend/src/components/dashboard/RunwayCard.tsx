// dashboard runway card
import { useCountUp } from "../../lib/useCountUp";

export interface RunwayCardProps {
  runwayDays: number;
  horizon: number;
  firstShortfall: { date: string; beforeBill: string | null } | null;
  deltaDays: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "YYYY-MM-DD" -> "d MMM" (e.g. "10 Dec") without a date library. */
function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
}

export default function RunwayCard({ runwayDays, horizon, firstShortfall, deltaDays }: RunwayCardProps) {
  const isSafeAll = runwayDays >= horizon;
  const shown = Math.round(useCountUp(runwayDays, 600));

  // Colour follows the target value so it changes at once rather than mid-count.
  const tone =
    runwayDays >= 45
      ? "text-emerald-hero"
      : runwayDays >= 20
        ? "text-amber-hero"
        : "text-red-hero";

  const deltaLabel =
    deltaDays === null || deltaDays === 0
      ? null
      : `${deltaDays < 0 ? "-" : "+"}${Math.abs(deltaDays)} days vs baseline`;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm backdrop-blur-sm">
      <div className="text-sm text-muted-text">Cash runway</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <div className={`text-5xl font-semibold tabular-nums transition-colors duration-500 ${tone}`}>
          {isSafeAll ? "You're safe for 90+ days" : `You're safe for ${shown} days`}
        </div>
        {deltaLabel && (
          <span className="rounded-full border border-border-soft px-2.5 py-0.5 text-xs tabular-nums text-muted-text">
            {deltaLabel}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-text">
        {firstShortfall
          ? `First shortfall: ${formatDayMonth(firstShortfall.date)}${
              firstShortfall.beforeBill ? `, before ${firstShortfall.beforeBill}` : ""
            }`
          : `No shortfall in the next ${horizon} days`}
      </p>
    </div>
  );
}
