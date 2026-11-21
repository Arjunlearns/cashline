// cashMetrics: what-if numbers on the seed.
import { describe, it, expect } from "vitest";
import seed from "../data/seed.json";
import { materialize } from "../data/seed";
import { simulate, rankClientRisk, daysInRed, worstCashGap } from "./cashMetrics";

const data = materialize(new Date("2025-01-15T00:00:00Z"));
const today = "2025-01-15";
const opening = data.owner.openingBalance;

function runSim(delays: Parameters<typeof simulate>[0]["delays"]) {
  return simulate({
    invoices: data.invoices,
    bills: data.bills,
    clients: data.clients,
    openingBalance: opening,
    delays,
    today,
  });
}

describe("cashMetrics on the seed", () => {
  it("baseline: runway 49, 15 days in the red, worst gap -28500", () => {
    const r = runSim({});
    expect(r.runwayDays).toBe(seed.expectedDemoResults.default.runwayDays);
    expect(r.daysInRed).toBe(15);
    expect(r.worstGap).toBe(-28500);
  });

  it("Studio Kala +15: runway 19 and 31 days in the red", () => {
    const r = runSim({ c1: 15 });
    expect(r.runwayDays).toBe(seed.expectedDemoResults.scenario_s1.runwayDays);
    expect(r.daysInRed).toBe(31);
  });

  it("Nandini never pays: runway 49, 28 days in the red, worst gap -52500", () => {
    const r = runSim({ c3: "never" });
    expect(r.runwayDays).toBe(49);
    expect(r.daysInRed).toBe(28);
    expect(r.worstGap).toBe(-52500);
  });

  it("Pixel & Pine +15 is identical to baseline", () => {
    expect(runSim({ c5: 15 })).toEqual(runSim({}));
  });

  it("slider at 0 equals baseline", () => {
    expect(runSim({ c1: 0 })).toEqual(runSim({}));
  });

  it("Studio Kala ranks first", () => {
    const ranking = rankClientRisk({
      invoices: data.invoices,
      bills: data.bills,
      clients: data.clients,
      openingBalance: opening,
      today,
    });
    expect(ranking[0].clientId).toBe("c1");
    expect(ranking[0].name).toBe("Studio Kala");
  });

  it("pending shares add to about 100", () => {
    const ranking = rankClientRisk({
      invoices: data.invoices,
      bills: data.bills,
      clients: data.clients,
      openingBalance: opening,
      today,
    });
    const total = ranking.reduce((sum, r) => sum + r.sharePct, 0);
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it("helpers on a hand-made series", () => {
    const series = [{ balance: 5 }, { balance: -1 }, { balance: -3 }];
    expect(daysInRed(series)).toBe(2);
    expect(worstCashGap(series)).toBe(-3);
  });
});
