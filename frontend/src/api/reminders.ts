// calls POST /api/reminders/draft
import { formatINR } from "../lib/format";

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
  let res: Response;
  try {
    res = await fetch("http://localhost:8000/api/reminders/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { mode: "mock", drafts: cannedDrafts(input) };
  }
  if (!res.ok) return { mode: "mock", drafts: cannedDrafts(input) };
  try {
    const body = (await res.json()) as DraftResponse;
    const d = body?.drafts;
    if (
      typeof d?.friendly !== "string" ||
      typeof d?.firm !== "string" ||
      typeof d?.final !== "string"
    ) {
      return { mode: "mock", drafts: cannedDrafts(input) };
    }
    return body;
  } catch {
    return { mode: "mock", drafts: cannedDrafts(input) };
  }
}

function cannedDrafts(input: {
  clientName: string;
  contact: string;
  invoiceId: string;
  amount: number;
  daysOverdue: number;
}): Record<ReminderTone, string> {
  const name = input.contact.trim().split(/\s+/)[0] || input.clientName;
  const amount = formatINR(input.amount);
  return {
    friendly: `Hi ${name}, a friendly reminder that invoice ${input.invoiceId} for ${amount} is still open. If you have already sent the payment, please ignore this message. Thank you!`,
    firm: `Hi ${name}, invoice ${input.invoiceId} for ${amount} is now ${input.daysOverdue} days overdue. Please arrange payment at the earliest so we can keep our records up to date. Reply here if there is an issue.`,
    final: `Hi ${name}, this is a final notice. Invoice ${input.invoiceId} for ${amount} is ${input.daysOverdue} days overdue. Please pay within 7 days to avoid further action. Contact us today to settle this.`,
  };
}
