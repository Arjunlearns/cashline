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

// Settings kept across a demo reset.
const KEEP_KEYS = ["cashline-theme", "cashline-calm"];

/** Clears saved demo state (every "cashline-" key except theme and calm), then reloads the seed. */
function resetDemoData() {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cashline-") && !KEEP_KEYS.includes(key)) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: a reload still resets the in-memory state.
  }
  window.location.reload();
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Dashboard");

  return (
    <StoreProvider>
      <div className="min-h-screen text-text">
        <AuroraBackground />
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-bg/80 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-bg"
              >
                <polyline points="4,17 9.5,11.5 13,15 20,7.5" />
                <polyline points="15,7.5 20,7.5 20,12.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight">Cashline</div>
              <div className="hidden truncate text-xs leading-tight text-text-muted sm:block">
                Know if you can pay rent. Know who to chase.
              </div>
            </div>
          </div>
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDemoData}
              className="rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Reset demo data
            </button>
            <ThemeToggle />
          </div>
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
