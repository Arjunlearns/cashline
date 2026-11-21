// simple tab routing, no router library
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import BillsClients from "./pages/BillsClients";
import { StoreProvider } from "./state/store";

const TABS = ["Dashboard", "Invoices", "Bills & Clients"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Dashboard");

  return (
    <StoreProvider>
      <div className="min-h-screen bg-bg text-[#e6e8eb]">
        <nav className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3 md:px-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                tab === t ? "bg-white/10 text-white" : "text-[#8a909c] hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <main className="p-6">
          {tab === "Dashboard" && <Dashboard />}
          {tab === "Invoices" && <Invoices />}
          {tab === "Bills & Clients" && <BillsClients />}
        </main>
      </div>
    </StoreProvider>
  );
}
