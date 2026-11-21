// dashboard page
import { useEffect, useMemo, useState } from "react";
import { useStore, effectiveStatus } from "../state/store";
import { formatINR } from "../lib/format";
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice } from "../lib/forecast";
import ForecastChart, { type ForecastMarker } from "../components/dashboard/ForecastChart";
import AlertStrip from "../components/dashboard/AlertStrip";
import RunwayCard from "../components/dashboard/RunwayCard";
import WhatIfControls from "../components/dashboard/WhatIfControls";
import WhatIfMetrics from "../components/dashboard/WhatIfMetrics";
import WhoCanHurtYou from "../components/dashboard/WhoCanHurtYou";
import { daysInRed, isPending, rankClientRisk, toScenarios, worstCashGap, type Delay } from "../lib/cashMetrics";
import WhoOwesMe from "../components/dashboard/WhoOwesMe";
import ChasePlanPanel from "../components/ChasePlanPanel";
import { buildChasePlan } from "../lib/chasePlan";
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
    <div className="rounded-2xl border border-surface-border p-5">
      <div className="text-sm text-text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${tone ?? ""}`}>{formatINR(display)}</div>
    </div>
  );
}

export default function Dashboard() {
  const [chaseId, setChaseId] = useState<string | null>(null);
  // What-if delays per client: days late, or "never". Empty means the baseline.
  const [delays, setDelays] = useState<Record<string, Delay>>({});
  // Show skeleton blocks for 250ms on first mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);
  const { invoices, clients, bills, owner, today, markChased, scenarios } = useStore();
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
  // Baseline (no delays) and current (what-if delays applied) forecasts, both over 90 days.
  let baseline: ReturnType<typeof forecast> | null = null;
  let current: ReturnType<typeof forecast> | null = null;
  let forecastError: string | null = null;
  try {
    baseline = forecast(forecastInvoices, forecastBills, forecastClients, owner.openingBalance, [], 90, today);
    current = forecast(
      forecastInvoices,
      forecastBills,
      forecastClients,
      owner.openingBalance,
      toScenarios(delays),
      90,
      today,
    );
  } catch (err) {
    forecastError = err instanceof Error ? err.message : String(err);
  }
  // Cash signal for the aurora tint: safe at 45+ days of runway, watch at 20-44, risk below 20.
  const runwayDays = current ? current.runwayDays : null;
  useEffect(() => {
    const root = document.documentElement;
    if (invoices.length === 0 || forecastError !== null || runwayDays === null) {
      delete root.dataset.cash;
    } else if (runwayDays >= 45) {
      root.dataset.cash = "safe";
    } else if (runwayDays >= 20) {
      root.dataset.cash = "watch";
    } else {
      root.dataset.cash = "risk";
    }
  }, [invoices.length, forecastError, runwayDays]);

  // Chase plan: which pending invoices to collect today, from the same inputs as the forecast above.
  const chasePlan = useMemo(
    () =>
      buildChasePlan({
        invoices: invoices.map((i, idx) => ({ ...forecastInvoices[idx], id: i.id })),
        bills: forecastBills,
        clients: clients.map((c, idx) => ({ ...forecastClients[idx], name: c.name })),
        openingBalance: owner.openingBalance,
        scenarios: toScenarios(delays),
        today,
        horizon: 90,
      }),
    // forecastInvoices/forecastBills/forecastClients are derived purely from these store values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, bills, clients, owner.openingBalance, delays, today],
  );

  if (invoices.length === 0) {
    return (
      <section className="fade-in-up">
        <EmptyState title="No invoices yet." body="Create one to see your numbers." />
      </section>
    );
  }

  const series = current ? current.series : null;
  const baselineSeries = baseline ? baseline.series : undefined;

  // Name of the bill whose next occurrence on or after `ymd` is earliest (null if none).
  const billAtOrAfter = (ymd: string): string | null => {
    let best: { date: string; name: string } | null = null;
    for (const b of bills) {
      const every = b.everyDays ?? 30;
      const diff = (Date.parse(ymd) - Date.parse(b.firstDueDate)) / DAY_MS;
      let d = b.firstDueDate;
      if (diff > 0) {
        if (every <= 0) continue; // one-off bill that falls before ymd
        d = shiftDays(b.firstDueDate, Math.ceil(diff / every) * every);
      }
      if (!best || d < best.date) best = { date: d, name: b.name };
    }
    return best?.name ?? null;
  };

  // Hero card inputs for the active scenario.
  const firstShortfall = current?.firstNegativeDate
    ? { date: current.firstNegativeDate, beforeBill: billAtOrAfter(current.firstNegativeDate) }
    : null;
  const deltaDays =
    Object.keys(delays).length > 0 && current && baseline ? current.runwayDays - baseline.runwayDays : null;

  // Markers only count inside the chart's date window.
  const windowStart = series && series.length ? series[0].date : today;
  const windowEnd = series && series.length ? series[series.length - 1].date : today;
  const inWindow = (d: string) => d >= windowStart && d <= windowEnd;

  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Pending invoices of clients with a what-if delay other than 0: these rows get the scenario badge.
  const highlightIds = new Set(
    invoices
      .filter((i) => isPending(i, today) && delays[i.clientId] !== undefined && delays[i.clientId] !== 0)
      .map((i) => i.id),
  );

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

  // Pending (sent or overdue) money by client, with each client's share of the total.
  const pendingInvoices = invoices.filter((i) => isPending(i, today));
  const pendingTotal = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const pendingSums = new Map<string, number>();
  for (const i of pendingInvoices) pendingSums.set(i.clientId, (pendingSums.get(i.clientId) ?? 0) + i.amount);
  const pendingByClient = Array.from(pendingSums.entries())
    .map(([clientId, pendingAmount]) => ({
      clientId,
      name: clientById.get(clientId)?.name ?? clientId,
      pendingAmount,
      sharePct: pendingTotal === 0 ? 0 : Math.round((100 * pendingAmount) / pendingTotal),
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount);

  // Client risk ranking for the "Who can hurt you most" list.
  const ranking = rankClientRisk({ invoices, bills, clients, openingBalance: owner.openingBalance, today });

  // Quick presets: store scenario labels when available, otherwise the fixed labels.
  const scenarioLabel = (id: string, fallback: string) => scenarios.find((s) => s.id === id)?.label ?? fallback;
  const everyonePending: Record<string, Delay> = {};
  for (const p of pendingByClient) everyonePending[p.clientId] = 15;
  const presets: { id: string; label: string; delays: Record<string, Delay> }[] = [
    { id: "s1", label: scenarioLabel("s1", "Studio Kala pays 15 days late"), delays: { c1: 15 } },
    { id: "s2", label: scenarioLabel("s2", "Pixel & Pine never pays"), delays: { c5: "never" } },
    { id: "all15", label: "Everyone pays 15 days late", delays: everyonePending },
  ];

  // Selecting a client from the risk list adds them at 15 days, unless they are already set.
  const addClient = (clientId: string) => setDelays((d) => (clientId in d ? d : { ...d, [clientId]: 15 }));

  // Headline metrics for the what-if panel.
  const baselineMetrics = baseline
    ? { runwayDays: baseline.runwayDays, daysInRed: daysInRed(baseline.series), worstGap: worstCashGap(baseline.series) }
    : null;
  const currentMetrics = current
    ? { runwayDays: current.runwayDays, daysInRed: daysInRed(current.series), worstGap: worstCashGap(current.series) }
    : null;

  // Shared y-axis range across baseline and current lines, padded by 5%, always including 0.
  const balances = [0, ...(baseline ? baseline.series : []).map((p) => p.balance), ...(current ? current.series : []).map((p) => p.balance)];
  const yLow = Math.min(...balances);
  const yHigh = Math.max(...balances);
  const yPad = (yHigh - yLow) * 0.05 || 1;
  const yDomain: [number, number] = [Math.floor(yLow - yPad), Math.ceil(yHigh + yPad)];

  return (
    <>
      <section className="fade-in-up mb-6">
        <AlertStrip alerts={alerts} onAction={(a) => setChaseId(a.invoiceId)} />
      </section>

      {current && (
        <section className="fade-in-up mb-6">
          <RunwayCard
            runwayDays={current.runwayDays}
            horizon={90}
            firstShortfall={firstShortfall}
            deltaDays={deltaDays}
          />
        </section>
      )}

      {baselineMetrics && currentMetrics && (
        <section className="fade-in-up mb-6">
          <WhatIfMetrics
            baseline={baselineMetrics}
            current={currentMetrics}
            active={Object.keys(delays).length > 0}
          />
        </section>
      )}

      <section className="fade-in-up grid gap-4 sm:grid-cols-3">
        {ready ? (
          <>
            <Stat label="Opening balance" value={owner.openingBalance} />
            <Stat label="Total outstanding" value={outstanding} />
            <Stat label="Overdue" value={overdue} tone="text-danger" />
          </>
        ) : (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        )}
      </section>

      <section className="fade-in-up mt-8 rounded-2xl border border-surface-border p-5">
        <h2 className="mb-3 text-lg font-semibold">90-day forecast</h2>
        {!ready ? (
          <Skeleton className="h-64 w-full" />
        ) : series === null ? (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-danger">Could not compute the forecast.</p>
            <p className="mt-1 text-xs text-text-muted">{forecastError}</p>
          </div>
        ) : (
          <ForecastChart series={series} markers={markers} baselineSeries={baselineSeries} yDomain={yDomain} />
        )}
      </section>

      <section className="fade-in-up mt-4">
        <WhatIfControls
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          pendingByClient={pendingByClient}
          delays={delays}
          onChange={setDelays}
          presets={presets}
        />
      </section>

      <section className="fade-in-up mt-8">
        <WhoCanHurtYou ranking={ranking} onSelect={addClient} />
      </section>

      <section className="fade-in-up mt-8">
        <WhoOwesMe items={items} onChase={(id) => setChaseId(id)} highlightIds={highlightIds} />
      </section>

      <section className="fade-in-up mt-8">
        <ChasePlanPanel plan={chasePlan} onChase={setChaseId} />
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

