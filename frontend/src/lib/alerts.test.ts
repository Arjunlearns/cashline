// vitest cases for ageing buckets and top alert
import { describe, it, expect } from "vitest";
import { materialize } from "../data/seed";
import { ageingBuckets, overdueItems, topAlerts, inr, type OverdueItem } from "./alerts";

const today = new Date().toISOString().slice(0, 10);
const data = materialize(new Date());

// Whole days between two "YYYY-MM-DD" strings (UTC), used to derive expectations from the data.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const items = overdueItems(data.invoices, data.clients, today);

describe("overdueItems (seed)", () => {
  it("includes overdue and past-due sent invoices computed from the data", () => {
    const expectedIds = data.invoices
      .filter(
        (i: any) =>
          (i.status === "overdue" || (i.status === "sent" && i.dueDate < today)) &&
          daysBetween(i.dueDate, today) > 0,
      )
      .map((i: any) => i.id)
      .sort();
    expect(items.map((i) => i.invoice.id).sort()).toEqual(expectedIds);
  });

  it("excludes the draft invoice INV-1012", () => {
    expect(items.map((i) => i.invoice.id)).not.toContain("INV-1012");
  });

  it("excludes paid invoices", () => {
    const paidIds = data.invoices.filter((i: any) => i.status === "paid").map((i: any) => i.id);
    for (const id of paidIds) {
      expect(items.map((i) => i.invoice.id)).not.toContain(id);
    }
  });

  it("gives every item a daysOverdue greater than 0", () => {
    for (const item of items) {
      expect(item.daysOverdue).toBeGreaterThan(0);
    }
  });

  it("sorts by daysOverdue descending", () => {
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].daysOverdue).toBeGreaterThanOrEqual(items[i].daysOverdue);
    }
  });
});

describe("ageingBuckets", () => {
  it("always returns all three keys", () => {
    const buckets = ageingBuckets(items);
    expect(Object.keys(buckets).sort()).toEqual(["0-30", "31-60", "60+"]);
  });

  it("places each item in the bucket matching its daysOverdue", () => {
    const buckets = ageingBuckets(items);
    for (const item of items) {
      const d = item.daysOverdue;
      const expected = d <= 30 ? "0-30" : d <= 60 ? "31-60" : "60+";
      expect(buckets[expected].items).toContain(item);
    }
  });

  it("bucket total equals the sum of its items' invoice.amount", () => {
    const buckets = ageingBuckets(items);
    for (const key of ["0-30", "31-60", "60+"] as const) {
      const sum = buckets[key].items.reduce((s, it) => s + it.invoice.amount, 0);
      expect(buckets[key].total).toBe(sum);
    }
  });

  it("puts 1, 30, 31, 60 and 61 days in the right buckets", () => {
    const mk = (daysOverdue: number): OverdueItem => ({
      clientName: "C",
      daysOverdue,
      invoice: { id: `X-${daysOverdue}`, amount: 100 },
    });
    const buckets = ageingBuckets([mk(1), mk(30), mk(31), mk(60), mk(61)]);
    expect(buckets["0-30"].items.map((i) => i.daysOverdue)).toEqual([1, 30]);
    expect(buckets["31-60"].items.map((i) => i.daysOverdue)).toEqual([31, 60]);
    expect(buckets["60+"].items.map((i) => i.daysOverdue)).toEqual([61]);
    expect(buckets["0-30"].total).toBe(200);
  });
});

describe("topAlerts", () => {
  it("returns [] for an empty list", () => {
    expect(topAlerts([])).toEqual([]);
  });

  it("returns exactly one alert", () => {
    expect(topAlerts(items)).toHaveLength(1);
  });

  it("uses amber 'never chased' text when the top item has chasedCount 0", () => {
    const item: OverdueItem = {
      clientName: "Acme",
      daysOverdue: 12,
      invoice: { id: "A-1", amount: 5000, chasedCount: 0 },
    };
    const [alert] = topAlerts([item]);
    expect(alert.text).toBe(`Chase Acme ${inr(5000)}, never chased`);
    expect(alert.severity).toBe("amber");
  });

  it("uses red 'days overdue' text when the top item has been chased", () => {
    const item: OverdueItem = {
      clientName: "Acme",
      daysOverdue: 12,
      invoice: { id: "A-2", amount: 5000, chasedCount: 2 },
    };
    const [alert] = topAlerts([item]);
    expect(alert.text.endsWith(", 12 days overdue")).toBe(true);
    expect(alert.severity).toBe("red");
  });

  it("seed: top alert is Studio Kala INV-1006 (unconditional)", () => {
    const inv1006 = items.find((i) => i.invoice.id === "INV-1006");
    expect(inv1006).toBeDefined();
    expect(inv1006!.clientName).toBe("Studio Kala");
    expect(inv1006!.invoice.amount).toBe(35000);
    expect(inv1006!.invoice.chasedCount).toBe(0);

    const [alert] = topAlerts(items);

    expect(alert.text).toBe("Chase Studio Kala ₹35,000, never chased");
    expect(alert.severity).toBe("amber");
    expect(alert.invoiceId).toBe("INV-1006");
  });
});
