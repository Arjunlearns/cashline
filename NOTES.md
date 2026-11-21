# Cashline — NOTES

## Product
One-person back office and 30–90 day cash forecast for freelance designers in India (first user: Rahul, 28, freelance brand designer, Bengaluru). Pain: unpaid invoices, lumpy income, fixed monthly bills (rent, Figma/Adobe, EMI, part-time assistant). Core question the app answers: who owes me how much, since when, and will I have enough cash for the next 90 days.

Scope boundaries: no auth, no payments, no multi-currency, no GST filing, no mobile app.

## Stack
- Frontend: Vite + React + TypeScript + Tailwind, Recharts (charts), Framer Motion (animation), Zustand or useReducer (one small store), Vitest (unit tests).
- Backend: FastAPI + SQLite, thin and stateless. Its only AI job is drafting WhatsApp reminders (POST /api/reminders/draft).
- Claude API is used only for reminder drafts. Mock mode returns canned 3-tone drafts when no API key is set.

## Folder structure
cashline/
  README.md, NOTES.md, LICENSE, .gitignore
  docs/            demo.gif, screenshots/, architecture.png, codebenders-prompts.md
  design-refs/     5–6 reference screenshots
  frontend/        package.json, vite.config.ts, tailwind.config.ts, index.html
    src/
      main.tsx, App.tsx          (App: simple tab routing, no router library)
      data/          seed.json (do not edit), seed.ts (materialize())
      lib/           forecast.ts (PURE), forecast.test.ts, format.ts, alerts.ts
      state/         store.ts
      api/           reminders.ts
      components/
        dashboard/   RunwayCard, ForecastChart, WhatIfControls, WhoOwesMe, AlertStrip
        invoices/    InvoiceTable, InvoiceForm
        chase/       ChaseDrawer
        ui/          Button, Card, StatusPill, EmptyState, Skeleton
      pages/         Dashboard, Invoices, BillsClients
      styles/        index.css (Tailwind layers, design tokens)
  backend/
    requirements.txt, main.py (app, CORS, router include)
    routers/reminders.py
    services/drafts.py (Claude call + prompt templates), mock_drafts.py
    tests/test_reminders.py

## Screens (only these four)
1. Dashboard: hero runway card ("You're safe for N days", colour emerald/amber/red), 90-day forecast area chart with red zone below zero and invoice/bill markers, what-if controls (scenario chips + per-client delay slider, original line ghosted), "Who owes me" list with ageing buckets, alert strip with one clear next action ("Chase X ₹45,000 today").
2. Invoices: table with status pills, plus a 4-field create form.
3. Chase drawer: AI-drafted reminder in friendly / firm / final tones, Copy, Open in WhatsApp (wa.me link), Mark as chased.
4. Bills & Clients: recurring bills, client list with average days-to-pay.

## Data model (draft, confirm against seed.json)
- Client: id, name, avg_days_to_pay (derived from paid-invoice history)
- Invoice: id, client_id, amount_inr, issued, due, status (draft | sent | paid; "overdue" is derived from due date < today and not paid), paid_on
- Bill: id, name, amount_inr, next_due, recurrence (monthly)
- Scenario: id (e.g. s1), label, client_id, delay_days
- Opening balance (₹)
Dates are day offsets from today in seed.json; materialize() converts them to dates.

## Forecast rules (PURE function, src/lib/forecast.ts)
Signature: forecast(invoices, bills, openingBalance, scenarios, days) -> { series: daily balance[], runwayDays, firstNegativeDate }
- Runs in the browser; no AI in the money math.
- Draft invoices are excluded.
- Paid invoices count as cash in on paid_on.
- Sent and overdue invoices count as cash in on expected date = due + client's average delay (from history).
- Bills go out on each due date and recur monthly within the horizon.
- Balance(day) = opening + cumulative inflows − cumulative outflows.
- runwayDays = days until balance first goes below zero; if it never does within the horizon, runwayDays = horizon. firstNegativeDate = that date or null.
- A scenario delays one client's expected payments by delay_days.
- Default horizon: 90 days.

## Test targets
- forecast() on seed data: runwayDays = 49 by default.
- forecast() with scenario s1 (Studio Kala pays 15 days late): runwayDays = 19.
Both asserted in forecast.test.ts with Vitest.

## Conventions
- Indian number grouping (₹1,80,000) via format.ts; tabular numerals in the UI.
- Dark theme, background #0B0D10, one accent colour per status, Inter or Geist, 12–16px rounded cards, thin borders.
- Every screen has empty, loading and error states.
- Use realistic Indian names and amounts; do not alter seed.json numbers.
- Build in small vertical slices, one commit each. Prefer diffs over regenerating whole files. Ask before any large rewrite.

## Open items
- seed.json is not present in the repo yet. Forecast numbers and the 49/19 test targets cannot be verified until it is added.
- The forecast rules above are reconstructed from the project brief. If a NOTES rule from the original file differs, the original wins.
