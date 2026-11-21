// Ageing buckets and next-action alerts. Pure functions, no React, no AI.
export type Bucket = "0-30" | "31-60" | "60+";

export interface InvoiceLike {
  id: string; clientId: string; amount: number; status: string;
  dueDate: string; chasedCount?: number; lastChasedDate?: string | null;
}
export interface ClientLike { id: string; name: string }

export interface OverdueItem {
  invoice: InvoiceLike; clientName: string; daysOverdue: number; bucket: Bucket;
}
export interface Alert {
  id: string; severity: "red" | "amber"; text: string;
  action: string; invoiceId?: string;
}

const DAY = 86_400_000;
const midnight = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export const bucketOf = (days: number): Bucket =>
  days <= 30 ? "0-30" : days <= 60 ? "31-60" : "60+";

/** Overdue = unpaid, non-draft, due date before today (derived, not trusted from status). */
export function getOverdue(invoices: InvoiceLike[], clients: ClientLike[], today = new Date()): OverdueItem[] {
  const t = midnight(today);
  return invoices
    .filter((i) => i.status !== "paid" && i.status !== "draft")
    .map((invoice) => ({
      invoice,
      clientName: clients.find((c) => c.id === invoice.clientId)?.name ?? "Unknown",
      daysOverdue: Math.round((t - Date.parse(invoice.dueDate)) / DAY),
    }))
    .filter((x) => x.daysOverdue > 0)
    .map((x) => ({ ...x, bucket: bucketOf(x.daysOverdue) }));
}

export function ageingBuckets(items: OverdueItem[]) {
  const out: Record<Bucket, { items: OverdueItem[]; total: number }> = {
    "0-30": { items: [], total: 0 }, "31-60": { items: [], total: 0 }, "60+": { items: [], total: 0 },
  };
  for (const it of items) { out[it.bucket].items.push(it); out[it.bucket].total += it.invoice.amount; }
  return out;
}

/** Priority = amount weighted by lateness. Never-chased invoices get no penalty, just a clearer message. */
const priority = (x: OverdueItem) => x.invoice.amount * (1 + x.daysOverdue / 30);

export const inr = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

export function buildAlerts(items: OverdueItem[], firstShortfallDay?: number | null, max = 3): Alert[] {
  const alerts: Alert[] = [...items].sort((a, b) => priority(b) - priority(a)).slice(0, max).map((x) => {
    const never = !x.invoice.chasedCount;
    return {
      id: `chase-${x.invoice.id}`,
      severity: x.daysOverdue > 30 ? "red" : "amber",
      text: `Chase ${x.clientName} ${inr(x.invoice.amount)}, ${never ? "never chased" : `${x.daysOverdue} days overdue`}`,
      action: "Chase today",
      invoiceId: x.invoice.id,
    } as Alert;
  });
  if (firstShortfallDay != null && firstShortfallDay <= 30)
    alerts.push({ id: "shortfall", severity: "red", text: `Cash runs out in ${firstShortfallDay} days`, action: "See forecast" });
  return alerts;
}