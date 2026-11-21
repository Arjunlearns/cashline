// Top alerts, each with one clear next action.
import type { Alert } from "../../lib/alerts";

const tone = { red: "border-danger/40 bg-danger/10 text-danger", amber: "border-warning/40 bg-warning/10 text-warning" };

export default function AlertStrip({ alerts, onAction }: { alerts: Alert[]; onAction: (a: Alert) => void }) {
  if (!alerts.length)
    return <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">All clear. Nothing to chase today.</div>;
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${tone[a.severity]}`}>
          <span className="tabular-nums">{a.text}</span>
          <button onClick={() => onAction(a)} className="rounded-lg bg-surface-border px-3 py-1 font-medium hover:bg-text-muted/20">{a.action}</button>
        </div>
      ))}
    </div>
  );
}
