import seed from "./seed.json";

const DAY = 86_400_000;
const addDays = (base: Date, n: number) => new Date(base.getTime() + n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Turn day offsets into real ISO dates relative to `today`. */
export function materialize(today: Date = new Date()) {
  const t = new Date(today.toISOString().slice(0, 10));
  return {
    owner: seed.owner,
    clients: seed.clients,
    scenarios: seed.scenarios,
    invoices: seed.invoices.map((i: any) => ({
      ...i,
      issuedDate: iso(addDays(t, i.issuedOffset)),
      dueDate: iso(addDays(t, i.dueOffset)),
      paidDate: i.paidOffset !== undefined ? iso(addDays(t, i.paidOffset)) : null,
      lastChasedDate: i.lastChasedOffset !== undefined ? iso(addDays(t, i.lastChasedOffset)) : null,
    })),
    bills: seed.bills.map((b) => ({
      ...b,
      firstDueDate: iso(addDays(t, b.firstDueOffset)),
    })),
  };
}
