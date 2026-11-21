# canned 3-tone drafts when no API key
from __future__ import annotations


def _first_name(client_name: str, contact: str) -> str:
    """First token of contact, falling back to client_name when contact is empty."""
    source = contact.strip() or client_name.strip()
    parts = source.split()
    return parts[0] if parts else "there"


def mock_drafts(
    client_name: str,
    contact: str,
    invoice_id: str,
    amount_inr: str,
    days_overdue: int,
) -> dict[str, str]:
    """Return deterministic friendly, firm and final WhatsApp drafts."""
    name = _first_name(client_name, contact)
    friendly = (
        f"Hi {name}, hope you are doing well. This is a gentle reminder that "
        f"invoice {invoice_id} for {amount_inr} is pending with us. "
        "Kindly arrange the payment at your earliest convenience. Thank you!"
    )
    firm = (
        f"Hi {name}, invoice {invoice_id} for {amount_inr} is now overdue by "
        f"{days_overdue} days. Please share a firm payment date so we can "
        "close this out. Thank you."
    )
    final = (
        f"Hi {name}, this is our last notice on invoice {invoice_id} for "
        f"{amount_inr}, now {days_overdue} days overdue. Please make the payment "
        "by end of this week, or we will have to escalate this to our team."
    )
    return {"friendly": friendly, "firm": firm, "final": final}
