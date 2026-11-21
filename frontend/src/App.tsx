// simple tab routing, no router library
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import BillsClients from "./pages/BillsClients";
import { StoreProvider } from "./state/store";
import AuroraBackground from "./components/ui/AuroraBackground";
import ThemeToggle from "./components/ui/ThemeToggle";

const TABS = ["Dashboard", "Invoices", "Bills & Clients"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Dashboard");

  return (
    <StoreProvider>
      <div className="min-h-screen text-text">
        <AuroraBackground />
        <header className="flex items-center justify-between gap-2 border-b border-surface-border px-4 py-3 md:px-6">
          <nav className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  tab === t ? "bg-surface-border text-text" : "text-text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
          <ThemeToggle />
        </header>
        <main className="p-6">
          {tab === "Dashboard" && <Dashboard />}
          {tab === "Invoices" && <Invoices />}
          {tab === "Bills & Clients" && <BillsClients />}
        </main>
      </div>
    </StoreProvider>
  );
}
