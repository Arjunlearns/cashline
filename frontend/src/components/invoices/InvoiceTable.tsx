// invoice table
import StatusPill from "../ui/StatusPill";
import EmptyState from "../ui/EmptyState";
import { formatINR } from "../../lib/format";
import { effectiveStatus, type Invoice, type Store } from "../../state/store";

type Client = Store["clients"][number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-05" -> "05 Mar 2026". Splits the string so no timezone shift occurs. */
function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-");
  const month = MONTHS[Number(m) - 1] ?? "";
  return `${d} ${month} ${y}`;
}

interface Props {
  invoices: Invoice[];
  clients: Client[];
  today: string;
  onMarkSent: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

const TH = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#8a909c]";
const TD = "px-4 py-3 text-sm";

export default function InvoiceTable({ invoices, clients, today, onMarkSent, onMarkPaid }: Props) {
  if (invoices.length === 0) {
    return <EmptyState title="No invoices yet." body="Create your first one below." />;
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10">
        <thead>
          <tr>
            <th className={TH}>Invoice</th>
            <th className={TH}>Client</th>
            <th className={TH}>Description</th>
            <th className={`${TH} text-right`}>Amount</th>
            <th className={TH}>Due date</th>
            <th className={TH}>Status</th>
            <th className={TH}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {invoices.map((inv) => {
            const status = effectiveStatus(inv, today);
            return (
              <tr key={inv.id}>
                <td className={`${TD} font-mono text-[#e6e8eb]`}>{inv.id}</td>
                <td className={TD}>{clientName(inv.clientId)}</td>
                <td className={`${TD} text-[#8a909c]`}>{inv.description}</td>
                <td className={`${TD} text-right tabular-nums`}>{formatINR(inv.amount)}</td>
                <td className={`${TD} whitespace-nowrap`}>{formatDue(inv.dueDate)}</td>
                <td className={TD}>
                  <StatusPill status={status} />
                </td>
                <td className={TD}>
                  {status === "draft" && (
                    <button
                      onClick={() => onMarkSent(inv.id)}
                      className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
                    >
                      Mark sent
                    </button>
                  )}
                  {(status === "sent" || status === "overdue") && (
                    <button
                      onClick={() => onMarkPaid(inv.id)}
                      className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
                    >
                      Mark as paid
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
