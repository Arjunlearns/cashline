// one small store (Zustand or useReducer)
import { createContext, createElement, useContext, useReducer, useState, type ReactNode } from "react";
import { materialize } from "../data/seed";

export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid";

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  description: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  lastChasedDate: string | null;
  chasedCount: number;
  status: InvoiceStatus;
}

export interface NewInvoiceInput {
  clientId: string;
  amount: number;
  description: string;
  dueDate: string;
}

type Materialized = ReturnType<typeof materialize>;

/** "sent" past its due date is effectively "overdue". PURE. */
export function effectiveStatus(inv: Invoice, today: string): InvoiceStatus {
  if (inv.status === "sent" && inv.dueDate < today) return "overdue";
  return inv.status;
}

/** "INV-" plus (max numeric suffix + 1). PURE. */
export function nextInvoiceId(invoices: Invoice[]): string {
  const max = invoices.reduce((m, i) => {
    const n = parseInt(i.id.replace(/^\D+/, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `INV-${max + 1}`;
}

/** Appends a new "sent" invoice issued today. PURE. */
export function addInvoice(invoices: Invoice[], input: NewInvoiceInput, today: string): Invoice[] {
  const invoice: Invoice = {
    id: nextInvoiceId(invoices),
    clientId: input.clientId,
    amount: input.amount,
    description: input.description,
    issuedDate: today,
    dueDate: input.dueDate,
    paidDate: null,
    lastChasedDate: null,
    chasedCount: 0,
    status: "sent",
  };
  return [...invoices, invoice];
}

/** Draft becomes sent; anything else is unchanged. PURE. */
export function markSent(invoices: Invoice[], id: string): Invoice[] {
  return invoices.map((i) => (i.id === id && i.status === "draft" ? { ...i, status: "sent" } : i));
}

/** Sent or overdue becomes paid on `today`; draft and paid are unchanged. PURE. */
export function markPaid(invoices: Invoice[], id: string, today: string): Invoice[] {
  return invoices.map((i) =>
    i.id === id && (i.status === "sent" || i.status === "overdue")
      ? { ...i, status: "paid", paidDate: today }
      : i,
  );
}

/** Sent or overdue invoice gets chasedCount + 1 and lastChasedDate = today; draft and paid are unchanged. PURE. */
export function markChased(invoices: Invoice[], id: string, today: string): Invoice[] {
  return invoices.map((i) =>
    i.id === id && (i.status === "sent" || i.status === "overdue")
      ? { ...i, chasedCount: i.chasedCount + 1, lastChasedDate: today }
      : i,
  );
}

type Action =
  | { type: "add"; input: NewInvoiceInput; today: string }
  | { type: "markSent"; id: string }
  | { type: "markPaid"; id: string; today: string }
  | { type: "MARK_CHASED"; id: string; today: string };

function reducer(state: Invoice[], action: Action): Invoice[] {
  switch (action.type) {
    case "add":
      return addInvoice(state, action.input, action.today);
    case "markSent":
      return markSent(state, action.id);
    case "markPaid":
      return markPaid(state, action.id, action.today);
    case "MARK_CHASED":
      return markChased(state, action.id, action.today);
  }
}

export interface Store {
  invoices: Invoice[];
  clients: Materialized["clients"];
  bills: Materialized["bills"];
  owner: Materialized["owner"];
  scenarios: Materialized["scenarios"];
  today: string;
  addInvoice: (input: NewInvoiceInput) => void;
  markSent: (id: string) => void;
  markPaid: (id: string) => void;
  markChased: (id: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Seed data and "today" are computed once per provider mount.
  const [base] = useState(() => ({
    data: materialize(),
    today: new Date().toISOString().slice(0, 10),
  }));
  const [invoices, dispatch] = useReducer(reducer, base.data.invoices as Invoice[]);

  const value: Store = {
    invoices,
    clients: base.data.clients,
    bills: base.data.bills,
    owner: base.data.owner,
    scenarios: base.data.scenarios,
    today: base.today,
    addInvoice: (input) => dispatch({ type: "add", input, today: base.today }),
    markSent: (id) => dispatch({ type: "markSent", id }),
    markPaid: (id) => dispatch({ type: "markPaid", id, today: base.today }),
    markChased: (id) => dispatch({ type: "MARK_CHASED", id, today: base.today }),
  };

  return createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

