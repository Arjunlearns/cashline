// "Who owes me, how much, and since when?" grouped into ageing buckets.
import { ageingBuckets, inr, type OverdueItem, type Bucket } from "../../lib/alerts";

const colour: Record<Bucket, string> = { "0-30": "bg-warning", "31-60": "bg-orange-500", "60+": "bg-danger" };

export default function WhoOwesMe({
  items,
  onChase,
  highlightIds,
}: {
  items: OverdueItem[];
  onChase: (invoiceId: string) => void;
  /** Invoice ids delayed by the active what-if scenario; these rows get a badge and accent border. */
  highlightIds?: Set<string>;
}) {
  const buckets = ageingBuckets(items);
  const grand = items.reduce((s, x) => s + x.invoice.amount, 0) || 1;
  if (!items.length) return <p className="text-sm text-text-muted">Nobody is overdue. Nice.</p>;
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-text">Who owes me</h3>
      {(Object.keys(buckets) as Bucket[]).map((b) => (
        <div key={b} className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>{b} days overdue</span><span className="tabular-nums">{inr(buckets[b].total)}</span>
          </div>
          <div className="h-1.5 rounded bg-surface-border"><div className={`h-1.5 rounded ${colour[b]}`} style={{ width: `${(buckets[b].total / grand) * 100}%` }} /></div>
          {buckets[b].items.sort((a, c) => c.daysOverdue - a.daysOverdue).map((x) => {
            const delayed = highlightIds?.has(x.invoice.id) ?? false;
            return (
            <div
              key={x.invoice.id}
              className={`mt-2 flex items-center justify-between text-sm ${delayed ? "border-l-2 border-warning pl-2" : ""}`}
            >
              <span className="flex items-center gap-2">{x.clientName} <span className="text-text-muted">{x.daysOverdue}d</span>
                {delayed && <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">Delayed by scenario</span>}
              </span>
              <span className="flex items-center gap-3 tabular-nums">{inr(x.invoice.amount)}
                <button onClick={() => onChase(x.invoice.id)} className="rounded-md border border-surface-border px-2 py-0.5 text-xs hover:bg-surface-border">Chase</button>
              </span>
            </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
