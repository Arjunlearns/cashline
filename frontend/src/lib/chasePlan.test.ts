// chasePlan: which pending invoices to chase today, on the seed.
import { describe, it, expect } from "vitest";
import seed from "../data/seed.json";
import { materialize } from "../data/seed";
import { forecast } from "./forecast";
import { buildChasePlan, chaseButtonLabel } from "./chasePlan";

const data = materialize(new Date("2025-01-15T00:00:00Z"));
const today = "2025-01-15";
const opening = data.owner.openingBalance;

function planWith(scenarios: { clientId: string; delayDays?: number }[]) {
  return buildChasePlan({
    invoices: data.invoices,
    bills: data.bills,
    clients: data.clients,
    openingBalance: opening,
    scenarios,
    today,
  });
}

describe("buildChasePlan on the seed", () => {
  it("Studio Kala +15 (s1): first step is INV-1006 and the plan lifts runway above 19", () => {
    const s1 = data.scenarios
      .filter((s) => s.id === "s1")
      .map((s) => ({ clientId: s.clientId, delayDays: s.delayDays }));
    const plan = planWith(s1);
    expect(plan.shortfall).toBe(true);
    expect(plan.baselineRunway).toBe(seed.expectedDemoResults.scenario_s1.runwayDays);
    expect(plan.steps[0].invoiceId).toBe("INV-1006");
    expect(plan.planRunway).toBeGreaterThan(19);
  });

  it("no scenario: first shortfall is 5 Mar 2025 (runway 49), and step 1 matches a direct forecast call", () => {
    const plan = planWith([]);
    expect(plan.shortfall).toBe(true);
    expect(plan.firstNegativeDate).toBe("2025-03-05");
    expect(plan.baselineRunway).toBe(seed.expectedDemoResults.default.runwayDays);

    // Independent check: pay the step-1 invoice today in a raw forecast call.
    const first = plan.steps[0];
    const paidToday = data.invoices.map((inv) =>
      inv.id === first.invoiceId ? { ...inv, status: "paid", paidDate: today } : inv,
    );
    const direct = forecast(paidToday, data.bills, data.clients, opening, [], 90, today);
    expect(first.runwayAfter).toBe(direct.runwayDays);
  });

  it("a large opening balance means no shortfall and no steps", () => {
    const plan = buildChasePlan({
      invoices: data.invoices,
      bills: data.bills,
      clients: data.clients,
      openingBalance: 10_000_000,
      scenarios: [],
      today,
    });
    expect(plan.shortfall).toBe(false);
    expect(plan.steps).toEqual([]);
  });
});

describe("chase plan prefers overdue invoices", () => {
  const s1 = data.scenarios
    .filter((s) => s.id === "s1")
    .map((s) => ({ clientId: s.clientId, delayDays: s.delayDays }));

  it("no scenario: first step is overdue and is INV-1006", () => {
    const plan = planWith([]);
    expect(plan.steps[0].isOverdue).toBe(true);
    expect(plan.steps[0].invoiceId).toBe("INV-1006");
  });

  it("Studio Kala +15 (s1): first step is overdue", () => {
    const plan = planWith(s1);
    expect(plan.steps[0].isOverdue).toBe(true);
  });

  it.each([
    ["no scenario", []],
    ["Studio Kala +15 (s1)", s1],
  ] as const)("%s: no step with 0 days overdue comes before an overdue step", (_name, scenarios) => {
    const plan = planWith([...scenarios]);
    let seenNotOverdue = false;
    for (const step of plan.steps) {
      if (step.daysOverdue === 0) {
        expect(step.isOverdue).toBe(false);
        seenNotOverdue = true;
      } else {
        expect(seenNotOverdue).toBe(false);
        expect(step.isOverdue).toBe(true);
      }
    }
  });

  it("chaseButtonLabel: not overdue is 'Ask for early payment', overdue is 'Chase'", () => {
    expect(chaseButtonLabel({ isOverdue: false })).toBe("Ask for early payment");
    expect(chaseButtonLabel({ isOverdue: true })).toBe("Chase");
  });

  it.each([
    ["no scenario", []],
    ["Studio Kala +15 (s1)", s1],
  ] as const)("%s: no 0-days-overdue step is labelled 'Chase'", (_name, scenarios) => {
    const plan = planWith([...scenarios]);
    for (const step of plan.steps.filter((s) => s.daysOverdue === 0)) {
      expect(chaseButtonLabel(step)).not.toBe("Chase");
    }
  });
});
