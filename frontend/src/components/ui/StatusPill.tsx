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
  draft: "bg-zinc-500/15 text-zinc-300 border-zinc-400/30",
  sent: "bg-[#60a5fa]/15 text-[#60a5fa] border-[#60a5fa]/30",
  overdue: "bg-[#f87171]/15 text-[#f87171] border-[#f87171]/30",
  paid: "bg-[#34d399]/15 text-[#34d399] border-[#34d399]/30",
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
