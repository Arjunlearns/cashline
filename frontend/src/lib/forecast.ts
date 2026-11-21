// PURE function, the core of the product

const DAY_MS = 86_400_000;

export interface ForecastInvoice {
  clientId: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
}

export interface ForecastBill {
  amount: number;
  firstDueDate: string;
  everyDays: number;
}

export interface ForecastClient {
  id: string;
  avgDelayDays: number;
}

export interface ForecastScenario {
  clientId: string;
  delayDays?: number;
}

export interface ForecastPoint {
  date: string;
  balance: number;
}

export interface ForecastResult {
  series: ForecastPoint[];
  runwayDays: number;
  firstNegativeDate: string | null;
}

/** "YYYY-MM-DD" -> integer day number (UTC, no timezone drift). */
function toDayNumber(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Integer day number -> "YYYY-MM-DD". */
function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function forecast(
  invoices: ForecastInvoice[],
  bills: ForecastBill[],
  clients: ForecastClient[],
  openingBalance: number,
  scenarios: ForecastScenario[],
  days: number,
  today: string,
): ForecastResult {
  const t0 = toDayNumber(today);
  const inflow = new Array<number>(days).fill(0);
  const outflow = new Array<number>(days).fill(0);

  // Invoices
  for (const inv of invoices) {
    if (inv.status === "draft") continue;

    if (inv.status === "paid") {
      if (!inv.paidDate) continue;
      const idx = toDayNumber(inv.paidDate) - t0;
      if (idx >= 0 && idx < days) inflow[idx] += inv.amount;
      continue;
    }

    if (inv.status === "sent" || inv.status === "overdue") {
      const client = clients.find((c) => c.id === inv.clientId);
      const scenario = scenarios.find((s) => s.clientId === inv.clientId);
      const delay = (client?.avgDelayDays ?? 0) + (scenario?.delayDays ?? 0);
      let idx = toDayNumber(inv.dueDate) + delay - t0;
      // Already late: place on day 0.
      if (idx < 0) idx = 0;
      if (idx < days) inflow[idx] += inv.amount;
    }
  }

  // Bills: first due date, then every `everyDays` while inside the horizon.
  for (const bill of bills) {
    const every = bill.everyDays;
    let idx = toDayNumber(bill.firstDueDate) - t0;
    if (every <= 0) {
      if (idx >= 0 && idx < days) outflow[idx] += bill.amount;
      continue;
    }
    // Occurrences before today fall outside the horizon; step forward to the first one inside it.
    if (idx < 0) idx += Math.ceil(-idx / every) * every;
    for (; idx < days; idx += every) {
      outflow[idx] += bill.amount;
    }
  }

  // Cumulative balance series.
  const series: ForecastPoint[] = [];
  let balance = openingBalance;
  for (let k = 0; k < days; k++) {
    balance += inflow[k] - outflow[k];
    series.push({ date: fromDayNumber(t0 + k), balance });
  }

  const firstNeg = series.findIndex((p) => p.balance < 0);
  return {
    series,
    runwayDays: firstNeg === -1 ? days : firstNeg,
    firstNegativeDate: firstNeg === -1 ? null : series[firstNeg].date,
  };
}
