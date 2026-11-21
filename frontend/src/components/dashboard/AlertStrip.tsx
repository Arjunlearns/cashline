// Top alerts, each with one clear next action.
import type { Alert } from "../../lib/alerts";

const tone = { red: "border-red-500/40 bg-red-500/10 text-red-200", amber: "border-amber-500/40 bg-amber-500/10 text-amber-200" };

export default function AlertStrip({ alerts, onAction }: { alerts: Alert[]; onAction: (a: Alert) => void }) {
  if (!alerts.length)
    return <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">All clear. Nothing to chase today.</div>;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${tone[a.severity]}`}>
          <span className="tabular-nums">{a.text}</span>
          <button onClick={() => onAction(a)} className="rounded-lg bg-white/10 px-3 py-1 font-medium hover:bg-white/20">{a.action}</button>
        </div>
      ))}
    </div>
  );
}
