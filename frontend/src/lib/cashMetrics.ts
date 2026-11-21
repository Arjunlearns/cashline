// pure cash metrics for the what-if panel: simulate, days in red, worst gap, client risk.
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice, type ForecastScenario, type ForecastPoint } from "./forecast";

export const CRITICAL_DAYS = 10;
export const CRITICAL_GAP = 25000;

export type Delay = number | "never";
export const NEVER_DAYS = 999;
export const HORIZON = 90;

interface InvoiceInput {
  clientId: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
}

interface BillInput {
  amount: number;
  firstDueDate: string;
  everyDays?: number;
}

interface ClientInput {
  id: string;
  name: string;
  avgDelayDays: number;
}

export function toScenarios(delays: Record<string, Delay>): { clientId: string; delayDays: number }[] {
  return Object.entries(delays).map(([clientId, delay]) => ({
    clientId,
    delayDays: delay === "never" ? NEVER_DAYS : delay,
  }));
}

export function isPending(inv: { status: string; dueDate: string }, today: string): boolean {
  if (inv.status === "sent" || inv.status === "overdue") return true;
  return false;
}

export function daysInRed(series: { balance: number }[]): number {
  return series.filter((p) => p.balance < 0).length;
}

export function worstCashGap(series: { balance: number }[]): number {
  return series.reduce((min, p) => (p.balance < min ? p.balance : min), series[0]?.balance ?? 0);
}

export interface SimResult {
  runwayDays: number;
  daysInRed: number;
  worstGap: number;
  firstNegativeDate: string | null;
}

export function simulate(args: {
  invoices: InvoiceInput[];
  bills: BillInput[];
  clients: ClientInput[];
  openingBalance: number;
  delays: Record<string, Delay>;
  today: string;
}): SimResult {
  const invoices: ForecastInvoice[] = args.invoices.map((inv) => ({
    clientId: inv.clientId,
    amount: inv.amount,
    status: inv.status === "sent" && inv.dueDate < args.today ? "overdue" : inv.status,
    dueDate: inv.dueDate,
    paidDate: inv.paidDate,
  }));
  const bills: ForecastBill[] = args.bills.map((b) => ({
    amount: b.amount,
    firstDueDate: b.firstDueDate,
    everyDays: b.everyDays ?? 30,
  }));
  const clients: ForecastClient[] = args.clients.map((c) => ({
    id: c.id,
    avgDelayDays: c.avgDelayDays,
  }));
  const scenarios: ForecastScenario[] = toScenarios(args.delays);
  const result = forecast(invoices, bills, clients, args.openingBalance, scenarios, HORIZON, args.today);
  const series: ForecastPoint[] = result.series;
  return {
    runwayDays: result.runwayDays,
    daysInRed: daysInRed(series),
    worstGap: worstCashGap(series),
    firstNegativeDate: result.firstNegativeDate,
  };
}

export interface ClientRisk {
  clientId: string;
  name: string;
  pendingAmount: number;
  sharePct: number;
  plus15: SimResult;
  never: SimResult;
  impactDaysInRed: number;
  impactWorstGap: number;
  verdict: "Critical" | "Watch" | "Low risk";
}

export function rankClientRisk(args: {
  invoices: InvoiceInput[];
  bills: BillInput[];
  clients: ClientInput[];
  openingBalance: number;
  today: string;
}): ClientRisk[] {
  const pending = args.invoices.filter((inv) => isPending(inv, args.today));
  const totalPending = pending.reduce((sum, inv) => sum + inv.amount, 0);

  const pendingByClient = new Map<string, number>();
  for (const inv of pending) {
    pendingByClient.set(inv.clientId, (pendingByClient.get(inv.clientId) ?? 0) + inv.amount);
  }

  const base = {
    invoices: args.invoices,
    bills: args.bills,
    clients: args.clients,
    openingBalance: args.openingBalance,
    today: args.today,
  };
  const baseline = simulate({ ...base, delays: {} });

  const risks: ClientRisk[] = [];
  for (const [clientId, pendingAmount] of pendingByClient) {
    const client = args.clients.find((c) => c.id === clientId);
    const plus15 = simulate({ ...base, delays: { [clientId]: 15 } });
    const never = simulate({ ...base, delays: { [clientId]: "never" } });
    const impactDaysInRed = never.daysInRed - baseline.daysInRed;
    const impactWorstGap = never.worstGap - baseline.worstGap;

    let verdict: ClientRisk["verdict"];
    if (impactDaysInRed >= CRITICAL_DAYS || impactWorstGap <= -CRITICAL_GAP) {
      verdict = "Critical";
    } else if (impactDaysInRed > 0 || impactWorstGap < 0) {
      verdict = "Watch";
    } else {
      verdict = "Low risk";
    }

    risks.push({
      clientId,
      name: client?.name ?? clientId,
      pendingAmount,
      sharePct: totalPending === 0 ? 0 : Math.round((100 * pendingAmount) / totalPending),
      plus15,
      never,
      impactDaysInRed,
      impactWorstGap,
      verdict,
    });
  }

  risks.sort((a, b) => {
    if (b.impactDaysInRed !== a.impactDaysInRed) return b.impactDaysInRed - a.impactDaysInRed;
    if (a.impactWorstGap !== b.impactWorstGap) return a.impactWorstGap - b.impactWorstGap;
    return a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0;
  });
  return risks;
}
