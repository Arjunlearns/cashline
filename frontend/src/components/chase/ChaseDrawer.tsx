// chase reminder drawer
import { useEffect, useState } from "react";
import { draftReminders, type DraftResponse, type ReminderTone } from "../../api/reminders";
import { formatINR } from "../../lib/format";
import ErrorCard from "../ui/ErrorCard";

const TONES: { key: ReminderTone; label: string }[] = [
  { key: "friendly", label: "Friendly" },
  { key: "firm", label: "Firm" },
  { key: "final", label: "Final" },
];

interface ChaseDrawerProps {
  open: boolean;
  onClose: () => void;
  item: { invoiceId: string; clientName: string; amount: number; daysOverdue: number } | null;
  client: { name: string; contact: string; phone: string } | null;
  onMarkChased: (invoiceId: string) => void;
}

export default function ChaseDrawer({ open, onClose, item, client, onMarkChased }: ChaseDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [response, setResponse] = useState<DraftResponse | null>(null);
  const [tone, setTone] = useState<ReminderTone>("friendly");
  const [copied, setCopied] = useState(false);

  const invoiceId = item?.invoiceId;
  const clientName = item?.clientName;
  const amount = item?.amount;
  const daysOverdue = item?.daysOverdue;
  const contact = client?.contact ?? "";

  useEffect(() => {
    if (!open || !invoiceId || clientName === undefined || amount === undefined || daysOverdue === undefined) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResponse(null);
    draftReminders({ clientName, contact, invoiceId, amount, daysOverdue })
      .then((res) => {
        if (!cancelled) setResponse(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-draft only when the invoice or drawer visibility changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, open]);

  useEffect(() => {
    setTone("friendly");
    setCopied(false);
  }, [invoiceId]);

  if (!open || !item) return null;

  const draft = response?.drafts[tone] ?? "";
  const digits = (client?.phone ?? "").replace(/\D/g, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/10 bg-[#0B0D10] text-white md:max-w-md">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            Chase {item.clientName} {formatINR(item.amount)}
          </h2>
          <p className="text-sm text-white/50">Invoice {item.invoiceId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {loading && <p className="text-sm text-white/60">Drafting reminders...</p>}
        {error && <ErrorCard message="Could not load drafts. Is the backend running on port 8000?" />}

        {response && (
          <>
            <div role="tablist" className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tone === t.key}
                  onClick={() => setTone(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    tone === t.key ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {response.mode === "mock" && (
              <p className="text-xs text-white/40">Sample drafts (no API key set)</p>
            )}

            <textarea
              readOnly
              rows={8}
              value={draft}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              {digits ? (
                <a
                  href={`https://wa.me/${digits}?text=${encodeURIComponent(draft)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Open in WhatsApp
                </a>
              ) : (
                <span className="text-sm text-white/40">No phone number on file</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-white/10 p-5">
        <button
          type="button"
          onClick={() => {
            onMarkChased(item.invoiceId);
            onClose();
          }}
          className="w-full rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/20"
        >
          Mark as chased
        </button>
      </div>
    </div>
  );
}
