// slider at 0 must equal the baseline; s1 at 15 gives 19.
import { describe, it, expect } from "vitest";
import seed from "../data/seed.json";
import { materialize } from "../data/seed";
import { forecast, type ForecastBill, type ForecastClient, type ForecastInvoice } from "./forecast";

const TODAY = "2025-01-15";
const HORIZON = 90;
const data = materialize(new Date("2025-01-15T00:00:00Z"));
const opening = data.owner.openingBalance;

// Same input mapping as seedDemo.test.ts, typed for the forecast() signature.
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

describe("what-if slider", () => {
  it("slider at 0 equals the baseline", () => {
    const baseline = forecast(invoices, bills, clients, opening, [], HORIZON, TODAY);
    const slider = forecast(
      invoices,
      bills,
      clients,
      opening,
      [{ clientId: "c1", delayDays: 0 }],
      HORIZON,
      TODAY,
    );
    expect(slider.runwayDays).toBe(baseline.runwayDays);
    expect(slider.firstNegativeDate).toBe(baseline.firstNegativeDate);
    expect(slider.series.length).toBe(baseline.series.length);
    slider.series.forEach((point, index) => {
      expect(point.balance).toBe(baseline.series[index].balance);
    });
  });

  it("s1 chip delay matches seed expectation", () => {
    const s1 = seed.scenarios.find((s) => s.id === "s1");
    const scenarios = s1 ? [{ clientId: s1.clientId, delayDays: s1.delayDays }] : [];
    const result = forecast(invoices, bills, clients, opening, scenarios, HORIZON, TODAY);
    expect(result.runwayDays).toBe(seed.expectedDemoResults.scenario_s1.runwayDays);
  });
});
