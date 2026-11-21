// "Who can hurt you most": pending clients ranked by how much their non-payment would worsen cash
import type { ClientRisk } from "../../lib/cashMetrics";

const verdictStyle: Record<ClientRisk["verdict"], string> = {
  Critical: "border-danger/40 bg-danger/10 text-danger",
  Watch: "border-warning/40 bg-warning/10 text-warning",
  "Low risk": "border-success/40 bg-success/10 text-success",
};

export default function WhoCanHurtYou({
  ranking,
  onSelect,
}: {
  ranking: ClientRisk[];
  /** Adds the client to the what-if at 15 days late. */
  onSelect: (clientId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold text-text">Who can hurt you most</h3>
      {ranking.length === 0 ? (
        <p className="text-sm text-text-muted">No pending payments.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((r, i) => {
            const d = r.impactDaysInRed;
            return (
              <li key={r.clientId}>
                <button
                  type="button"
                  onClick={() => onSelect(r.clientId)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-surface-border px-3 py-2 text-left transition-colors hover:bg-surface-border/40"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{r.name}</span>
                    <span className="block text-xs tabular-nums text-text-muted">{`${r.sharePct}% of pending`}</span>
                    <span className="block text-xs tabular-nums text-text-muted">
                      {`${d > 0 ? "+" : ""}${d} days in the red if they never pay`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${verdictStyle[r.verdict]}`}
                  >
                    {r.verdict}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
