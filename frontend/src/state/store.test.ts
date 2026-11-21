import { describe, it, expect } from "vitest";
import { materialize } from "../data/seed";
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice } from "../lib/forecast";
import { addInvoice, effectiveStatus, markChased, markPaid, type Invoice } from "./store";

const DAY_MS = 86_400_000;

function shiftDays(ymd: string, n: number): string {
  return new Date(Date.parse(ymd) + n * DAY_MS).toISOString().slice(0, 10);
}

const base = (over: Partial<Invoice> = {}): Invoice => ({
  id: "INV-1",
  clientId: "c1",
  amount: 1000,
  description: "test",
  issuedDate: "2025-01-01",
  dueDate: "2025-02-01",
  paidDate: null,
  lastChasedDate: null,
  chasedCount: 0,
  status: "sent",
  ...over,
});

describe("store", () => {
  it("markPaid moves a sent invoice to paid and sets paidDate to today", () => {
    const out = markPaid([base()], "INV-1", "2025-01-15");
    expect(out[0].status).toBe("paid");
    expect(out[0].paidDate).toBe("2025-01-15");
  });

  it("addInvoice creates a sent invoice with the next id and leaves others unchanged", () => {
    const existing = [base({ id: "INV-1" }), base({ id: "INV-7", status: "paid", paidDate: "2025-01-02" })];
    const out = addInvoice(
      existing,
      { clientId: "c2", amount: 500, description: "new", dueDate: "2025-02-10" },
      "2025-01-15",
    );
    expect(out).toHaveLength(3);
    expect(out.slice(0, 2)).toEqual(existing);
    expect(out[2].id).toBe("INV-8");
    expect(out[2].status).toBe("sent");
    expect(out[2].issuedDate).toBe("2025-01-15");
    expect(out[2].paidDate).toBeNull();
    expect(out[2].chasedCount).toBe(0);
  });

  it("effectiveStatus is overdue for a sent invoice past due, and sent when due on or after today", () => {
    const today = "2025-01-15";
    expect(effectiveStatus(base({ dueDate: "2025-01-10" }), today)).toBe("overdue");
    expect(effectiveStatus(base({ dueDate: "2025-01-15" }), today)).toBe("sent");
    expect(effectiveStatus(base({ dueDate: "2025-01-20" }), today)).toBe("sent");
  });

  it("new invoices flow into the forecast", () => {
    const today = "2025-01-15";
    const { invoices, bills, clients, owner } = materialize(new Date(today + "T00:00:00Z"));

    const toInvoices = (list: Invoice[]): ForecastInvoice[] =>
      list.map((i) => ({
        clientId: i.clientId,
        amount: i.amount,
        status: i.status,
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

    const dueDate = shiftDays(today, 5);
    const withNew = addInvoice(
      invoices as Invoice[],
      { clientId: "c4", amount: 50000, description: "forecast test", dueDate },
      today,
    );

    const without = forecast(toInvoices(invoices as Invoice[]), forecastBills, forecastClients, owner.openingBalance, [], 90, today);
    const withRes = forecast(toInvoices(withNew), forecastBills, forecastClients, owner.openingBalance, [], 90, today);

    const c4 = clients.find((c) => c.id === "c4");
    const receipt = shiftDays(dueDate, c4?.avgDelayDays ?? 0);
    const idx = withRes.series.findIndex((p) => p.date === receipt);
    expect(idx).toBeGreaterThanOrEqual(0);

    expect(withRes.series[idx].balance - without.series[idx].balance).toBe(50000);
    expect(withRes.runwayDays).toBeGreaterThanOrEqual(without.runwayDays);
  });

  it("markChased increments chasedCount and sets lastChasedDate", () => {
    const today = "2025-01-15";
    const { invoices } = materialize(new Date(today + "T00:00:00Z"));
    const sent = (invoices as Invoice[]).find((i) => i.status === "sent");
    expect(sent).toBeDefined();

    const out = markChased([sent!], sent!.id, today);
    expect(out[0].chasedCount).toBe(sent!.chasedCount + 1);
    expect(out[0].lastChasedDate).toBe(today);
  });

  it("markChased leaves a paid invoice unchanged", () => {
    const paid = base({ id: "INV-9", status: "paid", paidDate: "2025-01-02", chasedCount: 2 });
    const out = markChased([paid], "INV-9", "2025-01-15");
    expect(out).toEqual([paid]);
  });
});
