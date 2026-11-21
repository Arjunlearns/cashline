// calls POST /api/reminders/draft

export type ReminderTone = "friendly" | "firm" | "final";

export interface DraftResponse {
  mode: "mock" | "live";
  drafts: Record<ReminderTone, string>;
}

export async function draftReminders(input: {
  clientName: string;
  contact: string;
  invoiceId: string;
  amount: number;
  daysOverdue: number;
}): Promise<DraftResponse> {
  const res = await fetch("http://localhost:8000/api/reminders/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Reminder service returned ${res.status}`);
  return (await res.json()) as DraftResponse;
}
