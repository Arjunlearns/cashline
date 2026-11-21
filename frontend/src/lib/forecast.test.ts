// asserts runway 49 and 19
import { describe, it, expect } from "vitest";
import { materialize } from "../data/seed";
import { forecast } from "./forecast";

const TODAY = "2025-01-15";
const HORIZON = 90;
const data = materialize(new Date("2025-01-15T00:00:00Z"));
const opening = data.owner.openingBalance;

describe("forecast runway", () => {
  it("default (no scenarios active) runs out on day 49", () => {
    const result = forecast(
      data.invoices,
      data.bills,
      data.clients,
      opening,
      [],
      HORIZON,
      TODAY,
    );
    expect(result.runwayDays).toBe(49);
    expect(result.series).toHaveLength(HORIZON);
  });

  it("with scenario s1 (Studio Kala pays 15 days late) runs out on day 19", () => {
    const s1 = data.scenarios.filter((s) => s.id === "s1");
    const result = forecast(
      data.invoices,
      data.bills,
      data.clients,
      opening,
      s1,
      HORIZON,
      TODAY,
    );
    expect(result.runwayDays).toBe(19);
    expect(result.series).toHaveLength(HORIZON);
  });
});
