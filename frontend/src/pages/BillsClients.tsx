// bills and clients page
import { formatINR } from "../lib/format";
import { useStore, type Invoice } from "../state/store";
import EmptyState from "../components/ui/EmptyState";

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MUTED = "text-[#8a909c]";
const CARD = "rounded-2xl border border-white/10 p-4";

/** Whole days from `a` to `b` (both YYYY-MM-DD); b minus a. PURE. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** Adds n days to a YYYY-MM-DD string. PURE. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** First date on or after `today` reached from `firstDueDate` in steps of `everyDays`. PURE. */
function nextDue(firstDueDate: string, everyDays: number, today: string): string {
  if (everyDays <= 0) return firstDueDate;
  let due = firstDueDate;
  while (due < today) due = addDays(due, everyDays);
  return due;
}

/** "dd MMM yyyy" from YYYY-MM-DD. PURE. */
function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Mean whole days from issue to payment over a client's PAID invoices; null when there are none. PURE. */
function avgDaysToPay(clientId: string, invoices: Invoice[]): number | null {
  const days = invoices.flatMap((i) =>
    i.clientId === clientId && i.status === "paid" && i.paidDate ? [daysBetween(i.issuedDate, i.paidDate)] : [],
  );
  if (days.length === 0) return null;
  return days.reduce((sum, n) => sum + n, 0) / days.length;
}

export default function BillsClients() {
  const { invoices, clients, bills, today } = useStore();

  // Monthly total counts only bills with everyDays === 30, not all bills.
  const monthlyTotal = bills
    .filter((b) => b.everyDays === 30)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <section className="fade-in-up mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold text-white">Bills & Clients</h1>

      <div className={CARD}>
        <h2 className="mb-3 text-sm font-medium text-white">Recurring bills</h2>
        {bills.length === 0 ? (
          <EmptyState title="No recurring bills yet." body="Add a recurring bill to see it here." />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${MUTED}`}>
              <tr>
                <th className="py-2 pr-4 font-normal">Bill</th>
                <th className="py-2 pr-4 font-normal">Category</th>
                <th className="py-2 pr-4 text-right font-normal">Amount</th>
                <th className="py-2 pr-4 font-normal">Every</th>
                <th className="py-2 font-normal">Next due</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t border-white/10">
                  <td className="py-2 pr-4 text-white">{b.name}</td>
                  <td className={`py-2 pr-4 ${MUTED}`}>{b.category}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatINR(b.amount)}</td>
                  <td className="py-2 pr-4 tabular-nums">{b.everyDays} days</td>
                  <td className="py-2 tabular-nums">
                    {formatDue(nextDue(b.firstDueDate, b.everyDays, today))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <td colSpan={2} className="pt-3 text-white">Monthly total</td>
                <td className="pt-3 text-right font-medium tabular-nums text-white">{formatINR(monthlyTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </div>

      <div className={CARD}>
        <h2 className="mb-3 text-sm font-medium text-white">Clients</h2>
        {clients.length === 0 ? (
          <EmptyState title="No clients yet." body="Add a client to see their payment history here." />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${MUTED}`}>
              <tr>
                <th className="py-2 pr-4 font-normal">Client</th>
                <th className="py-2 pr-4 font-normal">Contact</th>
                <th className="py-2 pr-4 text-right font-normal">Invoices</th>
                <th className="py-2 pr-4 text-right font-normal">Avg days, invoice to payment</th>
                <th className="py-2 pr-4 text-right font-normal" title="Seed value used by the cash-flow forecast">
                  Avg days late
                </th>
                <th className="py-2 text-right font-normal">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const own = invoices.filter((i) => i.clientId === c.id);
                const avg = avgDaysToPay(c.id, invoices);
                const outstanding = own
                  .filter((i) => i.status === "sent" || i.status === "overdue")
                  .reduce((sum, i) => sum + i.amount, 0);
                return (
                  <tr key={c.id} className="border-t border-white/10">
                    <td className="py-2 pr-4 text-white">{c.name}</td>
                    <td className={`py-2 pr-4 ${MUTED}`}>{c.contact}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{own.length}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {avg === null ? (
                        <span className={MUTED}>No history</span>
                      ) : (
                        `${Math.round(avg * 10) / 10} days`
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">+{c.avgDelayDays} days</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(outstanding)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </section>
  );
}
