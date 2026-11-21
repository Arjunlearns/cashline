// tests that read the demo expectations and totals straight from seed.json
import { describe, it, expect } from "vitest";
import seed from "../data/seed.json";
import { materialize } from "../data/seed";
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice } from "./forecast";

const TODAY = "2025-01-15";
const HORIZON = 90;
const data = materialize(new Date("2025-01-15T00:00:00Z"));
const opening = data.owner.openingBalance;

// Same input mapping as forecast.test.ts, typed for the forecast() signature.
const invoices: ForecastInvoice[] = data.invoices.map((i) => ({
  clientId: i.clientId,
  amount: i.amount,
  status: i.status,
  dueDate: i.dueDate,
  paidDate: i.paidDate,
}));
const bills: ForecastBill[] = data.bills.map((b) => ({
  amount: b.amount,
  firstDueDate: b.firstDueDate,
  everyDays: b.everyDays,
}));
const clients: ForecastClient[] = data.clients.map((c) => ({
  id: c.id,
  avgDelayDays: c.avgDelayDays,
}));

describe("seed demo results", () => {
  it("default runway matches seed expectedDemoResults.default", () => {
    const result = forecast(invoices, bills, clients, opening, [], HORIZON, TODAY);
    expect(result.runwayDays).toBe(seed.expectedDemoResults.default.runwayDays);
  });

  it("s1 runway matches seed expectedDemoResults.scenario_s1", () => {
    const scenarios = seed.scenarios
      .filter((s) => s.id === "s1")
      .map((s) => ({ clientId: s.clientId, delayDays: s.delayDays }));
    const result = forecast(invoices, bills, clients, opening, scenarios, HORIZON, TODAY);
    expect(result.runwayDays).toBe(seed.expectedDemoResults.scenario_s1.runwayDays);
  });

  it("seed marks s1 as the demo default", () => {
    const s1 = seed.scenarios.find((s) => s.id === "s1");
    expect(s1?.isDemoDefault).toBe(true);
  });

  it("outstanding is 131000 and overdue is 54000", () => {
    // These totals come from the seed invoice list; the test fails if the seed changes.
    const seedData = materialize(new Date());
    const today = new Date().toISOString().slice(0, 10);
    const unpaid = seedData.invoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const outstanding = unpaid.reduce((sum, i) => sum + i.amount, 0);
    const overdue = unpaid
      .filter((i) => i.dueDate < today)
      .reduce((sum, i) => sum + i.amount, 0);
    expect(outstanding).toBe(131000);
    expect(overdue).toBe(54000);
  });
});
