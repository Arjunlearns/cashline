// Chase plan panel: the few pending invoices to collect today, props-only.
import { chaseButtonLabel, type ChasePlan } from "../lib/chasePlan";
import { formatINR } from "../lib/format";

export interface ChasePlanPanelProps {
  plan: ChasePlan;
  onChase: (invoiceId: string) => void;
}

export default function ChasePlanPanel({ plan, onChase }: ChasePlanPanelProps) {
  return (
    <section className="rounded-2xl border border-surface-border p-5 bg-surface">
      <h2 className="mb-3 text-lg font-semibold text-text">Chase plan</h2>
      {!plan.shortfall ? (
        <p className="text-sm text-text-muted">{"Nothing urgent. You're covered."}</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-text-muted">{plan.summary}</p>
          <ol className="space-y-3">
            {plan.steps.slice(0, 3).map((step) => (
              <li key={step.invoiceId} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">
                    {step.client} <span className="text-text-muted">· {step.invoiceId}</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatINR(step.amount)} · {step.daysOverdue} days overdue
                  </div>
                  <div className="text-xs text-text-muted">{step.reason}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onChase(step.invoiceId)}
                  className="shrink-0 rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface"
                >
                  {chaseButtonLabel(step)}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
