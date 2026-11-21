// small status pill for invoices
import type { InvoiceStatus } from "../../state/store";

const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  overdue: "Overdue",
  paid: "Paid",
};

// one accent colour per status: low-opacity background, thin border
const STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-text-muted/10 text-text-muted border-text-muted/40",
  sent: "bg-accent/10 text-accent border-accent/40",
  overdue: "bg-danger/10 text-danger border-danger/40",
  paid: "bg-success/10 text-success border-success/40",
};

export default function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
