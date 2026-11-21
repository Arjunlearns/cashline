# Reminder drafts via any OpenAI-compatible endpoint, with mock fallback.
from __future__ import annotations

import json
import logging
import os

from services.mock_drafts import mock_drafts

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = (
    "You are helping a small Indian business chase an overdue invoice over WhatsApp.\n"
    "Facts:\n"
    "- Client name: {client_name}\n"
    "- Contact person: {contact}\n"
    "- Invoice ID: {invoice_id}\n"
    "- Amount due: {amount_inr}\n"
    "- Days overdue: {days_overdue}\n"
    "\n"
    "Write three WhatsApp messages in plain English with an Indian business tone, "
    "addressing the contact by first name and using the facts above:\n"
    "1. friendly: a polite reminder.\n"
    "2. firm: say the payment is overdue and ask for a payment date.\n"
    "3. final: the last notice before escalating, and ask for payment by end of this week.\n"
    "Keep each message under 400 characters.\n"
    "\n"
    "Respond with exactly one JSON object and nothing else, with string keys "
    "\"friendly\", \"firm\" and \"final\"."
)

DRAFT_KEYS = ("friendly", "firm", "final")


def draft_reminders(
    client_name: str,
    contact: str,
    invoice_id: str,
    amount_inr: str,
    days_overdue: int,
) -> tuple[str, dict[str, str]]:
    """Return (mode, drafts). mode is "live" when the LLM produced valid drafts, else "mock".

    Never raises and never returns an error message: any failure falls back to the mock drafts.
    """
    def _mock() -> tuple[str, dict[str, str]]:
        return "mock", mock_drafts(client_name, contact, invoice_id, amount_inr, days_overdue)

    key = os.environ.get("LLM_API_KEY", "").strip()
    base_url = os.environ.get("LLM_BASE_URL", "").strip()
    model = os.environ.get("LLM_MODEL", "").strip()
    if not key or not model:
        return _mock()

    try:
        from openai import OpenAI

        client = OpenAI(api_key=key, base_url=base_url or None, timeout=20.0, max_retries=0)
        prompt = PROMPT_TEMPLATE.format(
            client_name=client_name,
            contact=contact,
            invoice_id=invoice_id,
            amount_inr=amount_inr,
            days_overdue=days_overdue,
        )
        response = client.chat.completions.create(
            model=model,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content
        parsed = json.loads(text)
        if not isinstance(parsed, dict) or not all(
            isinstance(parsed.get(k), str) for k in DRAFT_KEYS
        ):
            raise ValueError("LLM reply is not a JSON object with string drafts")
        drafts = {k: parsed[k] for k in DRAFT_KEYS}
        return "live", drafts
    except Exception as exc:
        logger.warning("Live reminder draft failed, using mock drafts: %s", type(exc).__name__)
        return _mock()
