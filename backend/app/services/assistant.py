"""
KhataAI Assistant Service.
Orchestrates chat conversations using Gemini function calling over allow-listed tools.
Enforces strict number grounding, language matching (English/Hindi/Hinglish),
prompt injection defense, and ai_messages history persistence.
The model never writes SQL.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .gemini_client import GeminiClient
from .tools import (
    ALLOW_LISTED_TOOLS,
    GEMINI_TOOL_DECLARATIONS,
    format_inr,
    get_party_balance,
    list_top_debtors,
    get_period_summary,
    list_overdue_parties,
    get_party_history,
)
from ..db import query_all, query_one, execute

logger = logging.getLogger(__name__)


# "Who owes me the most?", "who owes me money", "most money owed to me" and similar phrasings.
_TOP_DEBTOR_RE = re.compile(r"\bwho\s+owes\b|\bowes?\b.*\bmost\b|\bmost\b.*\bowe[sd]?\b")


def detect_language(text: str) -> str:
    """
    Detect whether text is predominantly English, Hindi (Devanagari), or Hinglish.
    """
    if not text:
        return "english"

    # Check for Devanagari script (U+0900 to U+097F)
    if any("\u0900" <= char <= "\u097f" for char in text):
        return "hindi"

    lower = text.lower()
    hinglish_keywords = [
        "ka", "ki", "ke", "ko", "se", "ne", "par", "me", "mein",
        "hai", "hain", "kiska", "kisko", "kya", "kyu", "kaun",
        "kitna", "kitni", "kitne", "baki", "udhaar", "khata",
        "jama", "dukan", "grahak", "hisaab", "hisab", "batao",
        "dikhao", "sabse", "zyada", "jyada", "kam", "aaj", "kal",
        "namaste", "namaskar", "paisa", "rupaye", "purana", "naye",
        "len-den", "bhaiya", "ji"
    ]
    tokens = set(re.findall(r"\b\w+\b", lower))
    matches = tokens.intersection(set(hinglish_keywords))
    if len(matches) >= 2 or (len(tokens) <= 4 and len(matches) >= 1):
        return "hinglish"

    return "english"


def is_off_topic(text: str) -> bool:
    """
    Check if the user request is completely unrelated to shop accounts,
    transactions, debtors, parties, payments, or ledger management.
    """
    lower = text.lower()
    off_topic_patterns = [
        r"\b(?:weather|mausam|temperature)\b",
        r"\b(?:recipe|cook|khana kaise banaye|cake|paneer recipe)\b",
        r"\b(?:poem|kavita|shayari|joke|chutkula)\b",
        r"\b(?:python code|javascript code|write code|html)\b",
        r"\b(?:cricket match|ipl score|football)\b",
        r"\b(?:movie|film|actor|actress)\b",
        r"\b(?:prime minister|president|election|politics)\b",
    ]
    for pat in off_topic_patterns:
        if re.search(pat, lower):
            return True
    return False


def get_off_topic_reply(lang: str) -> str:
    """Polite refusal in the requested language."""
    if lang == "hindi":
        return (
            "मैं KhataAI हूँ और केवल आपकी दुकान के हिसाब-किताब, ग्राहकों के बकाए, "
            "लेन-देन और वित्तीय रिपोर्ट में मदद कर सकता हूँ। कृपया दुकान से जुड़ा प्रश्न पूछें।"
        )
    elif lang == "hinglish":
        return (
            "Main KhataAI hoon aur sirf aapki dukan ke hisab-kitab, customer balance aur "
            "transactions mein madad kar sakta hoon. Kripya dukan ke khate se juda sawal poochein."
        )
    return (
        "I am KhataAI, your shop assistant. I can only help with customer accounts, balances, "
        "transactions, and store summaries. Please ask an accounting-related question."
    )


class AssistantService:
    def __init__(self, gemini_client: Optional[GeminiClient] = None, timeout: float = 30.0):
        self.gemini_client = gemini_client or GeminiClient(timeout=timeout)
        self.timeout = timeout
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "assistant_system.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return (
            "You are KhataAI, an accounting assistant for Gupta Kirana Store. "
            "Use only provided tools. Numbers must strictly come from tools. "
            "Never write SQL. Answer in the user's language."
        )

    def get_recent_messages(self, limit: int = 10) -> List[Dict[str, str]]:
        """Retrieve the last few messages from ai_messages table."""
        try:
            sql = """
                SELECT role, content
                FROM ai_messages
                ORDER BY created_at DESC
                LIMIT %s;
            """
            rows = query_all(sql, (limit,))
            # Reverse so chronological
            return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
        except Exception as e:
            logger.warning("Could not read ai_messages from db: %s", e)
            return []

    def save_message(self, role: str, content: str) -> None:
        """Persist a message to ai_messages table and prune older messages."""
        try:
            insert_sql = "INSERT INTO ai_messages (role, content) VALUES (%s, %s);"
            execute(insert_sql, (role, content))

            # Prune to keep only the last 50 messages
            prune_sql = """
                DELETE FROM ai_messages
                WHERE id NOT IN (
                    SELECT id FROM ai_messages ORDER BY created_at DESC LIMIT 50
                );
            """
            execute(prune_sql)
        except Exception as e:
            logger.warning("Could not save to ai_messages: %s", e)

    def chat(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Main entrypoint for POST /api/v1/ai/chat.
        Coordinates history, tool calls, Gemini function calling or grounded fallback,
        and database message persistence.
        """
        if not message or not message.strip():
            return {
                "reply": "Please ask a question about your shop accounts or customer balances.",
                "tool_calls": [],
            }

        user_text = message.strip()
        lang = detect_language(user_text)

        # 1. Check for off-topic query
        if is_off_topic(user_text):
            reply = get_off_topic_reply(lang)
            self.save_message("user", user_text)
            self.save_message("assistant", reply)
            return {
                "reply": reply,
                "tool_calls": [],
            }

        # 2. Prepare conversation history
        effective_history = history if history is not None else self.get_recent_messages(limit=6)

        # 3. Save incoming user message
        self.save_message("user", user_text)

        # 4. Attempt Gemini Live with Function Calling if configured
        if self.gemini_client.is_configured() and self.gemini_client._client is not None:
            try:
                gemini_res = self._execute_gemini_turn(user_text, effective_history, lang)
                if gemini_res:
                    self.save_message("assistant", gemini_res["reply"])
                    return gemini_res
            except Exception as e:
                logger.warning("Live Gemini function calling encountered error: %s", e)

        # 5. Deterministic Grounded Fallback
        fallback_res = self._execute_grounded_fallback(user_text, lang)
        self.save_message("assistant", fallback_res["reply"])
        return fallback_res

    def _execute_gemini_turn(
        self,
        user_text: str,
        history: List[Dict[str, str]],
        lang: str,
    ) -> Optional[Dict[str, Any]]:
        """Execute multi-turn tool calling with Google Gemini Client."""
        client = self.gemini_client._client
        if client is None:
            return None

        from google.genai import types

        # Build contents from history + current message
        contents = []
        for h in history:
            role = "user" if h.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.get("content", ""))]))
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_text)]))

        # Define tools from allow-listed functions
        tool_instances = [
            get_party_balance,
            list_top_debtors,
            get_period_summary,
            list_overdue_parties,
            get_party_history,
        ]

        config = types.GenerateContentConfig(
            system_instruction=self.system_prompt,
            tools=tool_instances,
            temperature=0.1,
        )

        response = client.models.generate_content(
            model=self.gemini_client.model,
            contents=contents,
            config=config,
        )

        if not response:
            return None

        # Check for function calls
        executed_tool_calls = []
        if response.function_calls:
            for call in response.function_calls:
                fn_name = call.name
                fn_args = dict(call.args) if call.args else {}

                # Strict allow-list enforcement
                if fn_name not in ALLOW_LISTED_TOOLS:
                    logger.warning("Model requested unapproved function: %s", fn_name)
                    continue

                fn = ALLOW_LISTED_TOOLS[fn_name]
                try:
                    tool_result = fn(**fn_args)
                except Exception as ex:
                    tool_result = {"error": str(ex)}

                executed_tool_calls.append({
                    "name": fn_name,
                    "arguments": fn_args,
                    "result": tool_result,
                })

            # Send function response back to Gemini for final grounded text
            if executed_tool_calls:
                tool_parts = []
                for tc in executed_tool_calls:
                    tool_parts.append(
                        types.Part.from_function_response(
                            name=tc["name"],
                            response={"result": tc["result"]},
                        )
                    )

                # Add model's tool call turn and user's function response turn
                if response.candidates and response.candidates[0].content:
                    contents.append(response.candidates[0].content)
                contents.append(types.Content(role="user", parts=tool_parts))

                final_resp = client.models.generate_content(
                    model=self.gemini_client.model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=self.system_prompt,
                        temperature=0.1,
                    ),
                )
                if final_resp and final_resp.text:
                    return {
                        "reply": final_resp.text.strip(),
                        "tool_calls": executed_tool_calls,
                    }

        if response.text:
            return {
                "reply": response.text.strip(),
                "tool_calls": executed_tool_calls,
            }

        return None

    def _execute_grounded_fallback(self, user_text: str, lang: str) -> Dict[str, Any]:
        """
        Deterministic, robust fallback when live Gemini is unconfigured or offline.
        Maps intents, calls the allow-listed tools, and synthesizes grounded answers
        in English, Hindi, or Hinglish with injection defenses.
        """
        lower = user_text.lower()
        tool_calls = []

        # 1. Intent: Top Debtors
        if (
            "debtor" in lower
            or "debtors" in lower
            or _TOP_DEBTOR_RE.search(lower)
            or any(w in lower for w in [
            "top debtor", "top debtors", "owes the most", "sabse zyada udhaar",
            "sabse jyada udhaar", "highest balance", "max balance", "kiska baki hai",
            "highest outstanding", "sabse bada udhaar",
            "sabse zyada baki", "sabse jyada baki", "sabse zyada baaki", "sabse jyada baaki",
            "सबसे ज्यादा उधार", "सबसे ज़्यादा उधार", "सबसे ज्यादा बकाया",
        ])
        ):
            limit = 5
            # Extract requested limit if mentioned (e.g., top 3)
            num_match = re.search(r"\b(?:top\s+)?(\d+)\s+debtors?\b", lower) or re.search(r"\btop\s+(\d+)\b", lower)
            if num_match:
                limit = int(num_match.group(1))

            debtors = list_top_debtors(limit=limit)
            tool_calls.append({
                "name": "list_top_debtors",
                "arguments": {"limit": limit},
                "result": debtors,
            })

            if not debtors:
                if lang == "hindi":
                    reply = "दुकान में इस समय किसी भी ग्राहक का बकाया उधार नहीं है।"
                elif lang == "hinglish":
                    reply = "Dukan mein abhi kisi bhi customer ka udhaar baki nahi hai."
                else:
                    reply = "Currently, there are no customers with outstanding balances."
                return {"reply": reply, "tool_calls": tool_calls}

            top1 = debtors[0]
            if lang == "hindi":
                reply = f"{top1['name']} का सबसे अधिक बकाया {top1['formatted_balance']} है।"
                if len(debtors) > 1:
                    other_str = ", ".join(f"{d['name']} ({d['formatted_balance']})" for d in debtors[1:])
                    reply += f" अन्य देनदार: {other_str}।"
            elif lang == "hinglish":
                reply = f"{top1['name']} ka sabse zyada udhaar baki hai jinka total balance {top1['formatted_balance']} hai."
                if len(debtors) > 1:
                    other_str = ", ".join(f"{d['name']} ({d['formatted_balance']})" for d in debtors[1:])
                    reply += f" Baaki top debtors: {other_str}."
            else:
                reply = f"{top1['name']} currently has the highest outstanding balance of {top1['formatted_balance']}."
                if len(debtors) > 1:
                    other_str = ", ".join(f"{d['name']} ({d['formatted_balance']})" for d in debtors[1:])
                    reply += f" Other top debtors include: {other_str}."

            return {"reply": reply, "tool_calls": tool_calls}

        # 2. Intent: Overdue Accounts
        if any(w in lower for w in [
            "overdue", "late payment", "due date nikal", "overdue parties",
            "kin grahako ka payment overdue", "overdue baki"
        ]):
            overdue = list_overdue_parties()
            tool_calls.append({
                "name": "list_overdue_parties",
                "arguments": {"min_days_overdue": 0},
                "result": overdue,
            })

            if not overdue:
                if lang == "hindi":
                    reply = "इस समय किसी भी ग्राहक का भुगतान overdue नहीं है।"
                elif lang == "hinglish":
                    reply = "Abhi kisi bhi customer ka payment overdue nahi hai."
                else:
                    reply = "There are currently no parties with overdue payments."
                return {"reply": reply, "tool_calls": tool_calls}

            details = [f"{o['party_name']} ({o['formatted_balance']}, {o['overdue_days']} days overdue)" for o in overdue]
            joined = "; ".join(details)
            if lang == "hindi":
                reply = f"निम्नलिखित ग्राहकों का भुगतान overdue है: {joined}।"
            elif lang == "hinglish":
                reply = f"In customers ka payment overdue ho chuka hai: {joined}."
            else:
                reply = f"The following parties have overdue balances: {joined}."

            return {"reply": reply, "tool_calls": tool_calls}

        # 3. Intent: Period Summary / Today's Sales & Collection
        if any(w in lower for w in [
            "today's sales", "aaj ka collection", "aaj ki bikri", "period summary",
            "daily summary", "aaj kitna hua", "store summary", "sales summary"
        ]):
            summary = get_period_summary(period="today")
            tool_calls.append({
                "name": "get_period_summary",
                "arguments": {"period": "today"},
                "result": summary,
            })

            if lang == "hindi":
                reply = (
                    f"आज की कुल बिक्री (DR) {summary['formatted_today_dr']} है और कुल वसूली (CR) "
                    f"{summary['formatted_today_cr']} है। कुल बकाया देनदारी {summary['formatted_receivable']} है।"
                )
            elif lang == "hinglish":
                reply = (
                    f"Aaj ki credit sales (DR) {summary['formatted_today_dr']} hui hain aur collection (CR) "
                    f"{summary['formatted_today_cr']} jama hua hai. Dukan ka total receivable udhaar {summary['formatted_receivable']} hai."
                )
            else:
                reply = (
                    f"Today's sales (DR) stand at {summary['formatted_today_dr']} with collections (CR) of "
                    f"{summary['formatted_today_cr']}. Total store receivables are {summary['formatted_receivable']}."
                )

            return {"reply": reply, "tool_calls": tool_calls}

        # 4. Intent: Party History / Transactions
        if any(w in lower for w in [
            "history", "recent transactions", "purana hisab", "purana hisaab",
            "transactions dikhao", "recent transaction"
        ]):
            party_name = self._extract_party_name(user_text)
            history_res = get_party_history(party_name=party_name)
            tool_calls.append({
                "name": "get_party_history",
                "arguments": {"party_name": party_name},
                "result": history_res,
            })

            if history_res.get("status") == "needs_clarification":
                candidates_str = ", ".join(history_res.get("candidates", []))
                if lang == "hindi":
                    reply = f"रिकॉर्ड में कई नाम मिले ({candidates_str})। आप किसका हिसाब देखना चाहते हैं?"
                elif lang == "hinglish":
                    reply = f"Aapke records mein kai milte-julte naam hain: {candidates_str}. Kiska history dekhna hai?"
                else:
                    reply = f"Multiple parties matched '{party_name}': {candidates_str}. Could you please clarify?"
                return {"reply": reply, "tool_calls": tool_calls}

            if history_res.get("status") != "success":
                if lang == "hindi":
                    reply = f"'{party_name}' नाम का कोई ग्राहक या सप्लायर रिकॉर्ड में नहीं मिला।"
                elif lang == "hinglish":
                    reply = f"'{party_name}' dukan ke records mein nahi mila. Kripya naam check karein."
                else:
                    reply = f"Could not find transaction history for party '{party_name}'."
                return {"reply": reply, "tool_calls": tool_calls}

            txns = history_res.get("transactions", [])
            # Defend against injection by safely extracting only kind, amount, date
            safe_txns = []
            for t in txns[:3]:
                # Sanitize particulars: strip any prompt injection instructions
                safe_part = self._sanitize_text(t.get("particulars", ""))
                safe_txns.append(f"{t['txn_date']}: {t['kind']} {t['formatted_amount']} ({safe_part})")
            txn_summary = "; ".join(safe_txns) if safe_txns else "No transactions"

            p_name = history_res["party_name"]
            f_bal = history_res["formatted_balance"]
            if lang == "hindi":
                reply = f"{p_name} के हालिया लेन-देन: {txn_summary}। वर्तमान शेष: {f_bal}।"
            elif lang == "hinglish":
                reply = f"{p_name} ke recent transactions: {txn_summary}. Current balance: {f_bal}."
            else:
                reply = f"Recent transactions for {p_name}: {txn_summary}. Current balance is {f_bal}."

            return {"reply": reply, "tool_calls": tool_calls}

        # 5. Intent: Specific Party Balance lookup (or fallback party query)
        party_name = self._extract_party_name(user_text)
        balance_res = get_party_balance(party_name=party_name)
        tool_calls.append({
            "name": "get_party_balance",
            "arguments": {"party_name": party_name},
            "result": balance_res,
        })

        if balance_res.get("status") == "needs_clarification":
            candidates_str = ", ".join(balance_res.get("candidates", []))
            if lang == "hindi":
                reply = f"कई ग्राहकों के नाम मिले हैं ({candidates_str})। कृपया स्पष्ट करें कि आप किसका बैलेंस देखना चाहते हैं?"
            elif lang == "hinglish":
                reply = f"'{party_name}' se milte-julte kai naam hain: {candidates_str}. Kripya clarify karein ki aap kiska balance dekhna chahte hain?"
            else:
                reply = f"Multiple parties matched '{party_name}': {candidates_str}. Could you please clarify which party you meant?"
            return {"reply": reply, "tool_calls": tool_calls}

        if balance_res.get("status") != "success":
            if lang == "hindi":
                reply = f"माफ़ कीजिए, '{party_name}' हमारे रिकॉर्ड में नहीं मिले। कृपया सही नाम बताएं।"
            elif lang == "hinglish":
                reply = f"Maaf kijiye, '{party_name}' dukan ke records mein nahi mile. Kripya sahi naam batayein."
            else:
                reply = f"Party '{party_name}' was not found in your records. Could you please clarify the name?"
            return {"reply": reply, "tool_calls": tool_calls}

        # Found exact party balance
        name = balance_res["name"]
        f_bal = balance_res["formatted_balance"]
        bal_type = balance_res["balance_type"]
        p_type = balance_res.get("type", "customer")

        # Specific check if asking about payments made (credit)
        if any(w in lower for w in ["payment kiya", "jama kiya", "kitna pay kiya", "payments made"]):
            total_cr_f = format_inr(balance_res.get("total_cr", 0))
            if lang == "hindi":
                reply = f"{name} ने अब तक कुल {total_cr_f} का भुगतान (CR) किया है।"
            elif lang == "hinglish":
                reply = f"{name} ne ab tak total {total_cr_f} ka payment kiya hai."
            else:
                reply = f"{name} has made total payments of {total_cr_f}."
            return {"reply": reply, "tool_calls": tool_calls}

        if lang == "hindi":
            if bal_type == "receivable":
                reply = f"{name} का वर्तमान बकाया {f_bal} (उधार) है।"
            elif bal_type == "payable":
                reply = f"{name} का शेष {f_bal} (दुकान को देना है) है।"
            else:
                reply = f"{name} का खाता पूर्णतः चुकता (₹0) है।"
        elif lang == "hinglish":
            if bal_type == "receivable":
                reply = f"{name} ka current balance {f_bal} udhaar baki hai."
            elif bal_type == "payable":
                reply = f"{name} ka {f_bal} baki hai jo dukan ko dena hai."
            else:
                reply = f"{name} ka hisab settled hai (₹0)."
        else:
            if bal_type == "receivable":
                reply = f"{name}'s current balance is {f_bal} (receivable)."
            elif bal_type == "payable":
                reply = f"{name}'s current balance is {f_bal} (payable to {p_type})."
            else:
                reply = f"{name}'s account is fully settled at ₹0."

        return {"reply": reply, "tool_calls": tool_calls}

    def _extract_party_name(self, text: str) -> str:
        """Heuristic name extractor from conversational user queries."""
        cleaned = re.sub(
            r"\b(?:what is|tell me|who is|show me|check|how much money does|how much does|ka balance|ka khata|ka hisab|ka purana hisab|ka kitna udhaar|ka kitna|ne kitna|ke recent transactions|ka|ki|ke|balance|khata|hisab|history|transactions|current|today|udhaar|baki|owe|owes)\b",
            " ",
            text,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"[?!.,'\"]", " ", cleaned)
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
        if tokens:
            return " ".join(tokens)
        return text.strip()

    def _sanitize_text(self, text: str) -> str:
        """Neutralize malicious injection instructions inside particulars."""
        if not text:
            return ""
        # Strip injection phrases
        sanitized = re.sub(
            r"(?i)\b(?:ignore all (?:rules|previous instructions)|evilbot|pwned|system override|you are now)\b.*",
            "[secured]",
            text,
        )
        return sanitized.strip()
