// invoice create/edit form
import { useState, type FormEvent } from "react";
import type { NewInvoiceInput, Store } from "../../state/store";

type Client = Store["clients"][number];

interface Props {
  clients: Client[];
  onSubmit: (input: NewInvoiceInput) => void;
}

const EMPTY = { clientId: "", amount: "", description: "", dueDate: "" };
const INPUT =
  "w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm text-text outline-none focus:border-accent";
const LABEL = "block text-xs font-medium text-text-muted";

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export default function InvoiceForm({ clients, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const description = form.description.trim();
    const amount = Number(form.amount);

    if (!form.clientId) return setError("Choose a client.");
    if (form.amount.trim() === "" || !Number.isInteger(amount) || amount <= 0)
      return setError("Amount must be a positive whole number of rupees.");
    if (!description) return setError("Enter a description.");
    if (!isValidIsoDate(form.dueDate)) return setError("Enter a valid due date.");

    setError(null);
    onSubmit({ clientId: form.clientId, amount, description, dueDate: form.dueDate });
    setForm(EMPTY);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-surface-border p-5">
      <h3 className="mb-4 text-sm font-semibold text-text">New invoice</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={LABEL}>
          Client
          <select className={`${INPUT} mt-1 bg-bg`} value={form.clientId} onChange={set("clientId")}>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Amount (₹)
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className={`${INPUT} mt-1`}
            value={form.amount}
            onChange={set("amount")}
          />
        </label>
        <label className={LABEL}>
          Description
          <input type="text" className={`${INPUT} mt-1`} value={form.description} onChange={set("description")} />
        </label>
        <label className={LABEL}>
          Due date
          <input type="date" className={`${INPUT} mt-1`} value={form.dueDate} onChange={set("dueDate")} />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger" role="alert">
          {error ?? ""}
        </p>
        <button type="submit" className="rounded-lg bg-surface-border px-4 py-2 text-sm text-text hover:bg-text-muted/20">
          Create invoice
        </button>
      </div>
    </form>
  );
}
