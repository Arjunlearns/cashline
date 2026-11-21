// dashboard page
import { useEffect, useState } from "react";
import { useStore, effectiveStatus } from "../state/store";
import { formatINR } from "../lib/format";
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice } from "../lib/forecast";
import ForecastChart, { type ForecastMarker } from "../components/dashboard/ForecastChart";
import AlertStrip from "../components/dashboard/AlertStrip";
import WhoOwesMe from "../components/dashboard/WhoOwesMe";
import ChaseDrawer from "../components/chase/ChaseDrawer";
import { overdueItems, topAlerts } from "../lib/alerts";
import { useCountUp } from "../lib/useCountUp";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" plus n days -> "YYYY-MM-DD" (UTC, no timezone drift). */
function shiftDays(ymd: string, n: number): string {
  return new Date(Date.parse(ymd) + n * DAY_MS).toISOString().slice(0, 10);
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const shown = useCountUp(value);
  // Final frame equals the target exactly; intermediate frames are rounded to whole units.
  const display = shown === value ? value : Math.round(shown);
  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <div className="text-sm text-[#8a909c]">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${tone ?? ""}`}>{formatINR(display)}</div>
    </div>
  );
}

export default function Dashboard() {
  const [chaseId, setChaseId] = useState<string | null>(null);
  // Show skeleton blocks for 250ms on first mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);
  const { invoices, clients, bills, owner, today, markChased } = useStore();
  // Unpaid = status sent or overdue (draft and paid excluded).
  const unpaid = invoices.filter((i) => {
    const s = effectiveStatus(i, today);
    return s === "sent" || s === "overdue";
  });
  const outstanding = unpaid.reduce((s, i) => s + i.amount, 0);
  // Overdue = unpaid and dueDate before today.
  const overdue = unpaid
    .filter((i) => i.dueDate < today)
    .reduce((s, i) => s + i.amount, 0);

  if (invoices.length === 0) {
    return (
      <section className="fade-in-up">
        <EmptyState title="No invoices yet." body="Create one to see your numbers." />
      </section>
    );
  }

  // 90-day forecast inputs, mapped to the forecast engine's field names.
  const forecastInvoices: ForecastInvoice[] = invoices.map((i) => ({
    clientId: i.clientId,
    amount: i.amount,
    status: effectiveStatus(i, today),
    dueDate: i.dueDate,
    paidDate: i.paidDate,
  }));
  const forecastBills: ForecastBill[] = bills.map((b) => ({
    amount: b.amount,
    firstDueDate: b.firstDueDate,
    everyDays: b.everyDays ?? 30,
  }));
  const forecastClients: ForecastClient[] = clients.map((c) => ({
    id: c.id,
    avgDelayDays: c.avgDelayDays,
  }));
  let series: ReturnType<typeof forecast>["series"] | null = null;
  let forecastError: string | null = null;
  try {
    series = forecast(
      forecastInvoices,
      forecastBills,
      forecastClients,
      owner.openingBalance,
      [],
      90,
      today,
    ).series;
  } catch (err) {
    forecastError = err instanceof Error ? err.message : String(err);
  }

  // Markers only count inside the chart's date window.
  const windowStart = series && series.length ? series[0].date : today;
  const windowEnd = series && series.length ? series[series.length - 1].date : today;
  const inWindow = (d: string) => d >= windowStart && d <= windowEnd;

  const clientById = new Map(clients.map((c) => [c.id, c]));

  // (a) Expected receipts for unpaid invoices: due date plus client's average delay.
  const invoiceMarkers: ForecastMarker[] = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .map((i) => {
      const client = clientById.get(i.clientId);
      const expected = shiftDays(i.dueDate, client?.avgDelayDays ?? 0);
      return {
        date: expected < today ? today : expected,
        label: `${i.id} ${client?.name ?? ""}`.trim(),
        kind: "in" as const,
        amount: i.amount,
      };
    })
    .filter((m) => inWindow(m.date));

  // (b) Every bill occurrence inside the window, skipping dates before today.
  const billMarkers: ForecastMarker[] = [];
  for (const b of bills) {
    const every = b.everyDays ?? 30;
    let d = b.firstDueDate;
    while (d < today && every > 0) d = shiftDays(d, every);
    while (inWindow(d)) {
      billMarkers.push({ date: d, label: b.name, kind: "out", amount: b.amount });
      if (every <= 0) break;
      d = shiftDays(d, every);
    }
  }

  const markers: ForecastMarker[] = [...invoiceMarkers, ...billMarkers];

  const items = overdueItems(invoices, clients, today);
  const alerts = topAlerts(items);

  const chaseOverdue = items.find((it) => it.invoice.id === chaseId);
  const chaseItem = chaseOverdue
    ? {
        invoiceId: chaseOverdue.invoice.id,
        clientName: chaseOverdue.clientName,
        amount: chaseOverdue.invoice.amount,
        daysOverdue: chaseOverdue.daysOverdue,
      }
    : null;
  const chaseCli = chaseItem ? clients.find((c) => c.name === chaseItem.clientName) : undefined;
  const chaseClient = chaseCli ? { name: chaseCli.name, contact: chaseCli.contact, phone: chaseCli.phone } : null;

  return (
    <>
      <section className="fade-in-up mb-6">
        <AlertStrip alerts={alerts} onAction={(a) => setChaseId(a.invoiceId)} />
      </section>

      <section className="fade-in-up grid gap-4 sm:grid-cols-3">
        {ready ? (
          <>
            <Stat label="Opening balance" value={owner.openingBalance} />
            <Stat label="Total outstanding" value={outstanding} />
            <Stat label="Overdue" value={overdue} tone="text-red-400" />
          </>
        ) : (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        )}
      </section>

      <section className="fade-in-up mt-8 rounded-2xl border border-white/10 p-5">
        <h2 className="mb-3 text-lg font-semibold">90-day forecast</h2>
        {!ready ? (
          <Skeleton className="h-64 w-full" />
        ) : series === null ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-medium text-red-300">Could not compute the forecast.</p>
            <p className="mt-1 text-xs text-[#8a909c]">{forecastError}</p>
          </div>
        ) : (
          <ForecastChart series={series} markers={markers} />
        )}
      </section>

      <section className="fade-in-up mt-8">
        <WhoOwesMe items={items} onChase={(id) => setChaseId(id)} />
      </section>

      <ChaseDrawer
        open={chaseId !== null}
        onClose={() => setChaseId(null)}
        item={chaseItem}
        client={chaseClient}
        onMarkChased={(id) => markChased(id)}
      />
    </>
  );
}
