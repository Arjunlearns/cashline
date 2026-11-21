// what-if scenario controls
import { formatINR } from "../../lib/format";
import type { Delay } from "../../lib/cashMetrics";

export interface WhatIfPendingClient {
  clientId: string;
  name: string;
  pendingAmount: number;
  sharePct: number;
}

export interface WhatIfPreset {
  id: string;
  label: string;
  delays: Record<string, Delay>;
}

/** Days late given to a client when they are first selected. */
const DEFAULT_DELAY = 15;

/** One wording for a delay, used by the client rows so the label always matches the live value. */
export function delayLabel(name: string, delay: Delay): string {
  if (delay === "never") return `${name} never pays`;
  if (delay === 0) return `${name} pays on time`;
  return `${name} pays ${delay} days late`;
}

/** True when both delay maps have the same clients with the same values. */
function sameDelays(a: Record<string, Delay>, b: Record<string, Delay>): boolean {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((k) => k in b && a[k] === b[k]);
}

const chipBase = "rounded-full border px-3 py-1.5 text-sm transition-colors duration-300";
const chipOn = "border-accent bg-accent/10 text-text";
const chipOff = "border-surface-border text-text-muted hover:text-text";

export default function WhatIfControls({
  clients,
  pendingByClient,
  delays,
  onChange,
  presets,
}: {
  clients: { id: string; name: string }[];
  pendingByClient: WhatIfPendingClient[];
  delays: Record<string, Delay>;
  onChange: (next: Record<string, Delay>) => void;
  presets: WhatIfPreset[];
}) {
  const selectedIds = Object.keys(delays);
  const nameOf = (id: string) => clients.find((c) => c.id === id)?.name ?? id;

  const removeClient = (clientId: string) => {
    const next = { ...delays };
    delete next[clientId];
    onChange(next);
  };
  const toggleClient = (clientId: string) => {
    if (clientId in delays) removeClient(clientId);
    else onChange({ ...delays, [clientId]: DEFAULT_DELAY });
  };
  const setDelay = (clientId: string, delay: Delay) => onChange({ ...delays, [clientId]: delay });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-text-muted">What if</div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="rounded-md border border-surface-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
          >
            Reset all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {pendingByClient.map((p) => {
          const on = p.clientId in delays;
          return (
            <button
              key={p.clientId}
              type="button"
              aria-pressed={on}
              onClick={() => toggleClient(p.clientId)}
              className={`${chipBase} ${on ? chipOn : chipOff}`}
            >
              {`${p.name} ${formatINR(p.pendingAmount)}, ${p.sharePct}%`}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Quick presets</span>
        {presets.map((p) => {
          const on = sameDelays(p.delays, delays);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(p.delays)}
              className={`${chipBase} ${on ? chipOn : chipOff}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <ul className="space-y-3">
          {selectedIds.map((clientId) => {
            const delay = delays[clientId];
            const name = nameOf(clientId);
            const never = delay === "never";
            const value = typeof delay === "number" ? delay : DEFAULT_DELAY;
            const label = delayLabel(name, delay);
            return (
              <li
                key={clientId}
                className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-surface-border p-3"
              >
                <div className="min-w-0 basis-full text-sm text-text">{label}</div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={value}
                  disabled={never}
                  aria-label={label}
                  onChange={(e) => setDelay(clientId, Number(e.target.value))}
                  className="min-w-0 flex-1 basis-40 accent-accent disabled:opacity-40"
                />
                <span className="min-w-[3rem] text-right text-2xl font-semibold tabular-nums text-text">
                  {never ? "Never" : value}
                </span>
                <button
                  type="button"
                  aria-pressed={never}
                  onClick={() => setDelay(clientId, never ? DEFAULT_DELAY : "never")}
                  className={`${chipBase} py-1 text-xs ${never ? chipOn : chipOff}`}
                >
                  Never pays
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => removeClient(clientId)}
                  className="rounded-md border border-surface-border px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-text"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
