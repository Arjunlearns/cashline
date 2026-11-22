# How Cashline was built in Codebenders


Prompt #1:

You are helping me build "Cashline", a one-person back office and cash
forecast tool for freelance designers in India. This is a hackathon project
judged on: Working Product 30%, Business Viability 25%, Problem/User Clarity
20%, Build Quality 15%, Presentation 10%. The repo will be reviewed on GitHub,
so it must run with a short README quick start and use seeded sample data.

USER: Rahul, 28, freelance brand designer in Bengaluru. Unpaid invoices,
lumpy income, fixed monthly bills (rent, Figma/Adobe, EMI, part-time assistant).

STACK: Vite + React + TypeScript + Tailwind (frontend), FastAPI + SQLite
(backend, thin), Recharts for charts, Framer Motion for animation.

CORE RULES:
1. The forecast engine is a PURE function in src/lib/forecast.ts:
   forecast(invoices, bills, openingBalance, scenarios, days) -> daily balance
   series + runwayDays + firstNegativeDate. No AI in the money math. It runs
   in the browser so the what-if slider is instant. Add unit tests (vitest).
2. Invoice states: draft -> sent -> overdue (derived from due date) -> paid.
   Expected payment date = due date + client's average delay (from history).
3. AI (Claude API via FastAPI endpoint) is used ONLY to draft WhatsApp reminders
   in 3 tones. Add a mock mode with canned drafts when no API key is set.
4. Use Indian number formatting (₹1,80,000) and realistic Indian names/amounts.

SCREENS (only these 4):
- Dashboard: hero runway card ("You're safe for 47 days", colour shifts
  emerald/amber/red), 90-day forecast area chart with red zone below zero and
  invoice/bill markers, what-if controls (scenario chips + delay slider per
  client, original line ghosted), "Who owes me" list with ageing buckets, alert
  strip with a clear next action ("Chase X ₹45,000 today").
- Invoices: table with status pills + a 4-field create form.
- Chase drawer: AI-drafted reminder (friendly/firm/final), Copy, Open in
  WhatsApp (wa.me link), Mark as chased.
- Bills & Clients: recurring bills, client list with average days-to-pay.

DESIGN: dark theme (#0B0D10), one accent per status, Inter/Geist, tabular
numbers, 12-16px rounded cards, thin borders, smooth chart easing, count-up
numbers. Tone: Linear + Stripe + Mercury. Include empty, loading and error states.

SEED DATA: 6 clients, 10 invoices (mix of paid, sent, 3 overdue), 5 recurring
bills, opening balance such that the default runway is ~47 days and the demo
scenario "Studio Kala pays 15 days late" drops it to ~19 days and shows a
shortfall before rent.

DO NOT build: auth, payments, multi-currency, GST filing, a mobile app.

PROCESS: First, write NOTES.md (stack, folder structure, data model,
conventions) and the folder structure, and wait for my approval. Then we build in small
vertical slices, and I'll commit after each. Ask me before any large rewrite.
Prefer diffs over regenerating whole files.

Prompt #2

SEED DATA: Already provided in src/data/seed.json with a loader in
src/data/seed.ts (dates are day offsets from today; call materialize()).
Do NOT regenerate or alter the numbers. Read the files and use them as
the source of truth. Read NOTES.md for the forecast rules.
Acceptance test: forecast() on this data gives runwayDays = 49 by default and
19 with scenario s1 (Studio Kala pays 15 days late). Write a vitest test that
asserts both.

Follow-up Prompts:
#1 Scaffold: "Scaffold Vite + React + TS + Tailwind and FastAPI. Load seed.ts. Show the Dashboard shell with static numbers from the seed (opening balance, total outstanding, overdue)."
#2 Forecast engine: "Implement src/lib/forecast.ts as a pure function per NOTES.md, with vitest tests asserting runway 49 and 19. Don't touch the UI yet." Run the tests yourself before moving on.
#3 Chart: "Wire forecast output into a Recharts area chart with a red zone below zero and invoice and bill markers."
#4 What-if: "Add scenario chips from seed.json, a delay slider for the selected client, the ghosted original line, and the runway card colour logic (emerald, amber, red)."
#5 Who owes me and alerts: "Build the ageing list (0-30, 31-60, 60+) and the alert strip. The top alert should be 'Chase Studio Kala ₹35,000, never chased'."
#6 Invoices: "Invoice table with status pills, the 4-field create form, state transitions, and Mark as paid. New invoices must flow into the forecast."
#7 Chase drawer: "FastAPI endpoint for 3-tone WhatsApp drafts, mock mode when no API key, Copy, wa.me link, and Mark as chased (updates chasedCount)."
#8 Bills and clients page: "Recurring bills list and a client table showing average days-to-pay."
#9 Polish: "Motion, count-up numbers, empty, loading and error states, responsive layout. Don't change forecast logic."
#10 Docs: "Write the README from my skeleton, and add a .env.example."

## What went wrong, and what it taught me

### 1. The agent's edits were refused
- **Symptom:** writes to `alerts.ts`, the chart and the dashboard files were refused by the editor, even after access was granted.
- **Cause:** a permission gate in the IDE, not a code problem.
- **Fix:** granted access and retried. For one slice I wrote the files outside the IDE and dropped them in.
- **Lesson:** keep slices small and files separate, so a blocked write costs one file, not a feature.

### 2. The dashboard did not match the seed
- **Symptom:** the dashboard showed ₹2,22,000 outstanding and an invoice (INV-1013) that was not in `seed.json`, while Bills & Clients showed ₹1,31,000.
- **Cause:** [fill in what the data-source audit found]
- **Fix:** audited where each page reads its data, added a "Reset demo data" control and a test asserting the seed totals.
- **Lesson:** one store, one source of truth, and a test that fails when the numbers drift.

### 3. A spec number was off by one
- **Symptom:** the agent counted "days in the red" as 15, 31 and 28 where my spec said 16, 32 and 29.
- **Cause:** my numbers counted 91 days (0 to 90). The engine uses a 90-day window.
- **Fix:** kept the engine and corrected the expected values.
- **Lesson:** the test caught a wrong requirement, not a wrong implementation. A failing test is a question to answer, not an expectation to edit away.

### 4. Two rules in the spec disagreed
- **Symptom:** the "cash after next rent" card spec said "day after rent", but the expected values were the rent-day balance.
- **Fix:** chose the rent-day balance, because the day-after figure hid the shortfall the card exists to show.
- **Lesson:** reword vague specs as rules, then write the expected values from the rule.

### 5. The chase plan recommended the wrong invoice
- **Symptom:** step 1 was an invoice that was not yet due, labelled "Chase", while the alert named a different, overdue invoice.
- **Cause:** a gain-only ranking gives overdue invoices zero runway gain when the shortfall is weeks away.
- **Fix:** overdue invoices first, then the rest, and anything not yet due is labelled "Ask for early payment".
- **Lesson:** a ranking can be mathematically right and still tell the user the wrong thing to do.

### 6. The what-if seemed to do nothing for most clients
- **Symptom:** changing most clients' delay left the runway at 49 days.
- **Cause:** only Studio Kala's payment is large enough to move the first shortfall.
- **Fix:** added metrics that do respond (days in the red, worst cash gap, cash after rent) and a "who can hurt you most" ranking.
- **Lesson:** a metric can be correct and still hide an effect. Show the number the user will feel.

### 7. A scenario flag was ambiguous
- **Symptom:** the agent asked whether the dashboard should open on 49 days or on the Kala scenario (19), because the seed flagged a scenario as `isDemoDefault`.
- **Fix:** the dashboard opens on the baseline, and the scenario is chosen by the user.
- **Lesson:** name data fields for what they mean ("demo scenario", not "default").

### 8. The chart was hard to read
- **Symptom:** every invoice and bill had a permanent text label, and they overlapped. Later, the y-axis ticks (67,050 and -3,050) had no label at 0.
- **Fix:** replaced labels with dots, a legend and hover cards, and anchored the axis at 0 with even steps.
- **Lesson:** on a money chart, 0 must be labelled and the axis stable.

### 9. The chart line coloured positive money red
- **Symptom:** the line turned red a few weeks before the balance reached zero, and the zero line looked like a second data line.
- **Cause:** the colour gradient switched at the midpoint of the line's height, not at the value 0.
- **Status:** [confirm: fixed, or left with the hatched shortfall area carrying the message]

### 10. The Chase drawer said it couldn't reach the backend
- **Symptom:** "Could not load drafts. Is the backend running on port 8000?"
- **Causes, in order:** `npm run dev` started only the frontend; `uvicorn` was not on the PATH on Windows; and Vite moved to port 5175 while CORS only allowed 5173.
- **Fix:** one `dev` script that runs both servers, `python -m uvicorn`, CORS allowing any local port, and a template fallback so the drawer never shows an error.
- **Lesson:** test the quick start on a clean machine, and never let a missing backend break the demo.

### 11. The "AI" drafts were not AI
- **Symptom:** the drawer said "Sample drafts (no API key set)".
- **Cause:** the backend had been started without the key, or from a different terminal than the one where the variables were set.
- **Fix:** restarted with the variables set in the same terminal. The API's `mode` field changed from `mock` to `live`.
- **Lesson:** return the mode in the response so "is the AI actually on?" is one request, not a guess. Keys belong in the environment, never in a file or a chat.

### 12. A model I planned to use was gone
- **Symptom:** the model name I had in mind was no longer on the provider's list.
- **Fix:** chose a current small model from the provider's own list and verified it through the provider's `/models` endpoint.
- **Lesson:** model names change, so check them against the live list.

### 13. The date moved under the demo
- **Symptom:** the first shortfall read 9 Jan on one day and 10 Jan on the next, and rent moved from 10 Dec to 11 Dec.
- **Cause:** the seed uses day offsets from today, by design.
- **Lesson:** record the demo and take screenshots on the same day, and say in the README that dates are relative.

### 14. Windows is not bash
- **Symptom:** `printf`, `ls -la` and `uvicorn` failed in PowerShell.
- **Fix:** PowerShell versions of the commands, and both PowerShell and bash examples in the README.

## Prompt patterns that worked

- **Guardrail line:** "Do not change `forecast.ts`, `seed.json` or any test expectation. If you think one needs to change, stop and ask."
- **Report first:** "Audit and list the defects, do not fix anything yet," then fix one at a time.
- **Verification line:** "Run `npm test` and the build and show the full output."
- **Scope line:** "Change only the chart styling."

Verbatim examples (add 2 or 3 of your real prompts here, with a line on what each produced):
