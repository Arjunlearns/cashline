// "Who owes me, how much, and since when?" grouped into ageing buckets.
import { ageingBuckets, inr, type OverdueItem, type Bucket } from "../../lib/alerts";

const colour: Record<Bucket, string> = { "0-30": "bg-amber-400", "31-60": "bg-orange-500", "60+": "bg-red-500" };

export default function WhoOwesMe({ items, onChase }: { items: OverdueItem[]; onChase: (invoiceId: string) => void }) {
  const buckets = ageingBuckets(items);
  const grand = items.reduce((s, x) => s + x.invoice.amount, 0) || 1;
  if (!items.length) return <p className="text-sm text-zinc-400">Nobody is overdue. Nice.</p>;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">Who owes me</h3>
      {(Object.keys(buckets) as Bucket[]).map((b) => (
        <div key={b} className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>{b} days overdue</span><span className="tabular-nums">{inr(buckets[b].total)}</span>
          </div>
          <div className="h-1.5 rounded bg-zinc-800"><div className={`h-1.5 rounded ${colour[b]}`} style={{ width: `${(buckets[b].total / grand) * 100}%` }} /></div>
          {buckets[b].items.sort((a, c) => c.daysOverdue - a.daysOverdue).map((x) => (
            <div key={x.invoice.id} className="mt-2 flex items-center justify-between text-sm">
              <span>{x.clientName} <span className="text-zinc-500">{x.daysOverdue}d</span></span>
              <span className="flex items-center gap-3 tabular-nums">{inr(x.invoice.amount)}
                <button onClick={() => onChase(x.invoice.id)} className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800">Chase</button>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
