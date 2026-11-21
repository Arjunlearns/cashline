# tests for the reminders endpoint
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.reminders import inr_group  # noqa: E402
from services.drafts import draft_reminders  # noqa: E402
from services.mock_drafts import mock_drafts  # noqa: E402

try:
    import httpx
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

LLM_KEYS = ("LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL")
DRAFT_ARGS = ("Studio Kala", "", "INV-1006", "₹35,000", 10)
LIVE_DRAFTS = {
    "friendly": "Hi Asha, a gentle reminder about INV-1006.",
    "firm": "Hi Asha, INV-1006 is overdue. Please share a payment date.",
    "final": "Hi Asha, last notice for INV-1006. Please pay by Friday.",
}


def _env(**extra):
    env = {k: v for k, v in os.environ.items() if k not in LLM_KEYS}
    env.update(extra)
    return env


def _completion(content):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def _rate_limit_error():
    if OPENAI_AVAILABLE:
        request = httpx.Request("POST", "https://example.test/v1/chat/completions")
        return openai.RateLimitError(
            "rate limited", response=httpx.Response(429, request=request), body=None
        )
    return RuntimeError("rate limited")


class MockDraftsTests(unittest.TestCase):
    def test_returns_three_non_empty_drafts_containing_invoice_id(self):
        drafts = mock_drafts("Pixel & Pine", "Asha Rao", "INV-1002", "₹1,80,000", 45)
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})
        for key, text in drafts.items():
            self.assertTrue(text, f"{key} is empty")
            self.assertIn("INV-1002", text, f"{key} lacks invoice id")
            self.assertLess(len(text), 400, f"{key} too long")


class DraftRemindersTests(unittest.TestCase):
    def test_returns_mock_mode_without_llm_config(self):
        env = _env()
        with patch.dict(os.environ, env, clear=True):
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        self.assertEqual(mode, "mock")
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})

    @unittest.skipUnless(OPENAI_AVAILABLE, "openai package not installed")
    def test_returns_mock_mode_without_model_and_no_client_created(self):
        env = _env(LLM_API_KEY="x")
        with patch.dict(os.environ, env, clear=True), patch("openai.OpenAI") as client_cls:
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        client_cls.assert_not_called()
        self.assertEqual(mode, "mock")
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})

    @unittest.skipUnless(OPENAI_AVAILABLE, "openai package not installed")
    def test_falls_back_to_mock_on_rate_limit(self):
        env = _env(LLM_API_KEY="x", LLM_MODEL="m", LLM_BASE_URL="https://example.test/v1")
        with patch.dict(os.environ, env, clear=True), patch("openai.OpenAI") as client_cls:
            client_cls.return_value.chat.completions.create.side_effect = _rate_limit_error()
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        self.assertEqual(mode, "mock")
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})

    @unittest.skipUnless(OPENAI_AVAILABLE, "openai package not installed")
    def test_falls_back_to_mock_on_generic_error(self):
        env = _env(LLM_API_KEY="x", LLM_MODEL="m", LLM_BASE_URL="https://example.test/v1")
        with patch.dict(os.environ, env, clear=True), patch("openai.OpenAI") as client_cls:
            client_cls.return_value.chat.completions.create.side_effect = RuntimeError("boom")
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        self.assertEqual(mode, "mock")
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})

    @unittest.skipUnless(OPENAI_AVAILABLE, "openai package not installed")
    def test_live_success_returns_parsed_drafts(self):
        import json

        env = _env(LLM_API_KEY="x", LLM_MODEL="m", LLM_BASE_URL="https://example.test/v1")
        with patch.dict(os.environ, env, clear=True), patch("openai.OpenAI") as client_cls:
            create = client_cls.return_value.chat.completions.create
            create.return_value = _completion(json.dumps(LIVE_DRAFTS))
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        self.assertEqual(mode, "live")
        self.assertEqual(drafts, LIVE_DRAFTS)

    @unittest.skipUnless(OPENAI_AVAILABLE, "openai package not installed")
    def test_bad_json_content_falls_back_to_mock(self):
        env = _env(LLM_API_KEY="x", LLM_MODEL="m", LLM_BASE_URL="https://example.test/v1")
        with patch.dict(os.environ, env, clear=True), patch("openai.OpenAI") as client_cls:
            client_cls.return_value.chat.completions.create.return_value = _completion(
                "Sorry, I cannot help with that."
            )
            mode, drafts = draft_reminders(*DRAFT_ARGS)
        self.assertEqual(mode, "mock")
        self.assertEqual(set(drafts.keys()), {"friendly", "firm", "final"})


class InrGroupTests(unittest.TestCase):
    def test_indian_grouping(self):
        self.assertEqual(inr_group(180000), "₹1,80,000")
        self.assertEqual(inr_group(35000), "₹35,000")
        self.assertEqual(inr_group(999), "₹999")


if __name__ == "__main__":
    unittest.main()
