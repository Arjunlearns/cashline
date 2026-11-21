// invoices page
import InvoiceForm from "../components/invoices/InvoiceForm";
import InvoiceTable from "../components/invoices/InvoiceTable";
import { useStore } from "../state/store";

export default function Invoices() {
  const { invoices, clients, today, addInvoice, markSent, markPaid } = useStore();

  return (
    <section className="fade-in-up mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold text-white">Invoices</h1>
      <InvoiceForm clients={clients} onSubmit={addInvoice} />
      <InvoiceTable
        invoices={invoices}
        clients={clients}
        today={today}
        onMarkSent={markSent}
        onMarkPaid={(id) => markPaid(id)}
      />
    </section>
  );
}
