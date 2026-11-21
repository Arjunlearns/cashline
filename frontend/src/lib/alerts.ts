// builds "Chase X today" alerts from invoices
import { formatINR } from "./format";

export type Bucket = "0-30" | "31-60" | "60+";

export interface OverdueItem {
  clientName: string;
  daysOverdue: number;
  invoice: { id: string; amount: number; chasedCount?: number };
}

const DAY_MS = 86_400_000;

/** Whole days from "YYYY-MM-DD" a to "YYYY-MM-DD" b (UTC, no timezone drift). */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

export function inr(n: number): string {
  return formatINR(n);
}

export function ageingBuckets(items: OverdueItem[]): Record<Bucket, { total: number; items: OverdueItem[] }> {
  const out: Record<Bucket, { total: number; items: OverdueItem[] }> = {
    "0-30": { total: 0, items: [] },
    "31-60": { total: 0, items: [] },
    "60+": { total: 0, items: [] },
  };
  for (const item of items) {
    const d = item.daysOverdue;
    const key: Bucket | null = d >= 1 && d <= 30 ? "0-30" : d >= 31 && d <= 60 ? "31-60" : d > 60 ? "60+" : null;
    if (!key) continue;
    out[key].items.push(item);
    out[key].total += item.invoice.amount;
  }
  return out;
}

export function overdueItems(
  invoices: { id: string; clientId: string; amount: number; status: string; dueDate: string; chasedCount?: number }[],
  clients: { id: string; name: string }[],
  today: string,
): OverdueItem[] {
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const items: OverdueItem[] = [];
  for (const inv of invoices) {
    const include = inv.status === "overdue" || (inv.status === "sent" && inv.dueDate < today);
    if (!include) continue;
    const daysOverdue = daysBetween(inv.dueDate, today);
    if (daysOverdue <= 0) continue;
    items.push({
      clientName: nameById.get(inv.clientId) ?? "",
      daysOverdue,
      invoice: { id: inv.id, amount: inv.amount, chasedCount: inv.chasedCount },
    });
  }
  return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface Alert {
  id: string;
  severity: "red" | "amber";
  text: string;
  action: string;
  invoiceId: string;
}

export function topAlerts(items: OverdueItem[]): Alert[] {
  if (items.length === 0) return [];
  const neverChased = (x: OverdueItem) => !x.invoice.chasedCount;
  const sorted = [...items].sort(
    (a, b) =>
      Number(neverChased(b)) - Number(neverChased(a)) ||
      b.daysOverdue - a.daysOverdue ||
      b.invoice.amount - a.invoice.amount,
  );
  const top = sorted[0];
  const text = neverChased(top)
    ? `Chase ${top.clientName} ${inr(top.invoice.amount)}, never chased`
    : `Chase ${top.clientName} ${inr(top.invoice.amount)}, ${top.daysOverdue} days overdue`;
  return [
    {
      id: top.invoice.id,
      severity: neverChased(top) ? "amber" : "red",
      text,
      action: "Chase",
      invoiceId: top.invoice.id,
    },
  ];
}

