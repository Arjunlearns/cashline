# POST /api/reminders/draft
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.drafts import draft_reminders

router = APIRouter(prefix="/api/reminders")


class ReminderRequest(BaseModel):
    clientName: str
    contact: str = ""
    invoiceId: str
    amount: int = Field(gt=0)
    daysOverdue: int = 0


def inr_group(n: int) -> str:
    """Format an integer as Indian-grouped rupees, e.g. 180000 -> "₹1,80,000"."""
    sign = "-" if n < 0 else ""
    digits = str(abs(n))
    if len(digits) <= 3:
        return f"₹{sign}{digits}"
    head, tail = digits[:-3], digits[-3:]
    groups: list[str] = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return f"₹{sign}{','.join(groups)},{tail}"


class ReminderDrafts(BaseModel):
    friendly: str
    firm: str
    final: str


class ReminderDraftResponse(BaseModel):
    mode: str
    drafts: ReminderDrafts


@router.post("/draft", response_model=ReminderDraftResponse)
def create_reminder_draft(payload: ReminderRequest) -> dict:
    mode, drafts = draft_reminders(
        payload.clientName,
        payload.contact,
        payload.invoiceId,
        inr_group(payload.amount),
        payload.daysOverdue,
    )
    return {"mode": mode, "drafts": drafts}
