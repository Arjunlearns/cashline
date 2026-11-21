// PURE "Chase plan": which pending invoices to collect today to keep the runway open.
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice, type ForecastScenario } from "./forecast";
import { formatINR } from "./format";

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const NOTHING_URGENT = "Nothing urgent. You're covered.";
export const NO_QUICK_FIX = "No pending invoice can close this shortfall on its own.";

export type ChaseInvoice = ForecastInvoice & { id: string };
export type ChaseClient = ForecastClient & { name: string };

export interface ChasePlanInput {
  invoices: ChaseInvoice[];
  bills: ForecastBill[];
  clients: ChaseClient[];
  openingBalance: number;
  scenarios: ForecastScenario[];
  today: string;
  horizon?: number;
}

export interface ChaseStep {
  invoiceId: string;
  client: string;
  amount: number;
  daysOverdue: number;
  /** True when daysOverdue > 0. Only overdue steps may be labelled "Chase". */
  isOverdue: boolean;
  /** Latest day the cash should land: the day before the shortfall it closes (never before today). */
  payBy: string;
  reason: string;
  runwayAfter: number;
  worstGapAfter: number;
}

export interface ChasePlan {
  shortfall: boolean;
  firstNegativeDate: string | null;
  /** Runway under the active forecast, before any step. */
  baselineRunway: number;
  /** Runway after all steps are applied. */
  planRunway: number;
  steps: ChaseStep[];
  summary: string;
}

/** "YYYY-MM-DD" plus n days -> "YYYY-MM-DD" (UTC, no timezone drift). */
function shiftDays(ymd: string, n: number): string {
  return new Date(Date.parse(ymd) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from b to a (a - b), UTC. */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / DAY_MS);
}

/** "YYYY-MM-DD" -> "D Mon", e.g. "9 Dec". */
function fmtDay(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Worst (lowest) balance in a series. */
function worstGap(series: { balance: number }[]): number {
  return series.reduce((min, p) => (p.balance < min ? p.balance : min), series[0]?.balance ?? 0);
}

/** Button label for a plan step: "Chase" only for overdue invoices, otherwise an early-payment ask. */
export function chaseButtonLabel(step: { isOverdue: boolean }): string {
  return step.isOverdue ? "Chase" : "Ask for early payment";
}

export function buildChasePlan(input: ChasePlanInput): ChasePlan {
  const { invoices, bills, clients, openingBalance, scenarios, today, horizon = 90 } = input;

  // Forecast with the given invoice ids treated as paid today.
  const evaluate = (paidIds: string[]) => {
    const adjusted: ChaseInvoice[] = invoices.map((inv) =>
      paidIds.includes(inv.id) ? { ...inv, status: "paid", paidDate: today } : inv,
    );
    return forecast(adjusted, bills, clients, openingBalance, scenarios, horizon, today);
  };

  const base = evaluate([]);
  if (base.firstNegativeDate === null) {
    return {
      shortfall: false,
      firstNegativeDate: null,
      baselineRunway: base.runwayDays,
      planRunway: base.runwayDays,
      steps: [],
      summary: NOTHING_URGENT,
    };
  }

  // Candidates: pending invoices only, in id order so ties resolve deterministically.
  let remaining = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const pickedIds: string[] = [];
  const steps: ChaseStep[] = [];
  let current = base;

  const daysLate = (inv: ChaseInvoice) => Math.max(0, dayDiff(today, inv.dueDate));

  // Record a step for inv, given the forecast after paying it. Must be called before `current` is updated.
  const addStep = (inv: ChaseInvoice, result: ReturnType<typeof evaluate>) => {
    const shortfallDate = current.firstNegativeDate as string;
    const payBy = dayDiff(shortfallDate, today) - 1 >= 0 ? shiftDays(shortfallDate, -1) : today;
    const client = clients.find((c) => c.id === inv.clientId);
    const name = client?.name ?? inv.clientId;
    const days = daysLate(inv);
    const reason =
      result.runwayDays <= current.runwayDays
        ? `${name} is ${days} days late. Collect now. Paying this alone does not move your runway.`
        : result.firstNegativeDate === null
          ? `Closes your ${fmtDay(shortfallDate)} shortfall if paid by ${fmtDay(payBy)}`
          : `Pushes your ${fmtDay(shortfallDate)} shortfall to ${fmtDay(result.firstNegativeDate)} if paid by ${fmtDay(payBy)}`;

    steps.push({
      invoiceId: inv.id,
      client: name,
      amount: inv.amount,
      daysOverdue: days,
      isOverdue: days > 0,
      payBy,
      reason,
      runwayAfter: result.runwayDays,
      worstGapAfter: worstGap(result.series),
    });

    pickedIds.push(inv.id);
    remaining = remaining.filter((r) => r.id !== inv.id);
    current = result;
  };

  // Pass 1: the best overdue invoice (runway gain desc, then amount desc) is always first, even at zero gain.
  const overdueFirst = remaining
    .filter((inv) => daysLate(inv) > 0)
    .map((inv) => ({ inv, result: evaluate([inv.id]) }))
    .sort((a, b) => b.result.runwayDays - a.result.runwayDays || b.inv.amount - a.inv.amount)[0];
  if (overdueFirst) addStep(overdueFirst.inv, overdueFirst.result);

  // Pass 2: greedy. Only candidates with a positive runway gain. Ties: overdue before not-yet-due, then amount desc.
  while (current.firstNegativeDate !== null && remaining.length > 0) {
    const rank = (inv: ChaseInvoice) => (daysLate(inv) > 0 ? 1 : 0);
    let best: { inv: ChaseInvoice; result: ReturnType<typeof evaluate> } | null = null;
    for (const inv of remaining) {
      const result = evaluate([...pickedIds, inv.id]);
      if (result.runwayDays <= current.runwayDays) continue;
      if (
        !best ||
        result.runwayDays > best.result.runwayDays ||
        (result.runwayDays === best.result.runwayDays &&
          (rank(inv) > rank(best.inv) || (rank(inv) === rank(best.inv) && inv.amount > best.inv.amount)))
      ) {
        best = { inv, result };
      }
    }
    if (!best) break;
    addStep(best.inv, best.result);
  }


  if (steps.length === 0) {
    return {
      shortfall: true,
      firstNegativeDate: base.firstNegativeDate,
      baselineRunway: base.runwayDays,
      planRunway: base.runwayDays,
      steps,
      summary: NO_QUICK_FIX,
    };
  }

  const total = steps.reduce((sum, s) => sum + s.amount, 0);
  const earliestPayBy = steps.reduce((min, s) => (s.payBy < min ? s.payBy : min), steps[0].payBy);
  return {
    shortfall: true,
    firstNegativeDate: base.firstNegativeDate,
    baselineRunway: base.runwayDays,
    planRunway: current.runwayDays,
    steps,
    summary: `Collect ${formatINR(total)} by ${fmtDay(earliestPayBy)} to move your runway from ${base.runwayDays} days to ${current.runwayDays} days.`,
  };
}
