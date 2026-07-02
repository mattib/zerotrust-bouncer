# Spiimask

A local-first privacy extension that runs entirely in your browser. It intercepts and masks Personally Identifiable Information (PII) **before it ever leaves your machine**, so AI providers (ChatGPT, Claude, Gemini) only ever receive anonymized tokens — never your real data.

**Built by Matti B.**

## How it works
The moment your browser tries to send a prompt to the AI server, Spiimask steps in and swaps your sensitive data for anonymous, typed tokens:

> `matti@gmail.com` → `[EMAIL_a3f9c2]`

The AI processes the request using only those tokens. When it responds, the extension **unmasks** the tokens back to your real values, right on your screen. Each token keeps its *type* (`[EMAIL_…]`, `[ID_…]`, `[PASSWORD_…]`) so the AI still understands the meaning of your text — it just never sees the actual values.

**The result:** the full AI experience, with the AI company never seeing your real data.

## What it protects
- **Contact** — email, Israeli mobile / landline, international phone
- **Identity** — Israeli ID (ת"ז, check-digit validated), passport, US SSN, UK NI
- **Financial** — credit cards (Luhn-validated), IBAN (mod-97 validated), SWIFT/BIC, Israeli company no. (ח"פ), VAT (עוסק מורשה), CVV, card expiry, **domestic bank account** (keyword-gated)
- **Secrets** — passwords, API keys for **55+ services** (AWS, OpenAI, GitHub, Stripe, JWTs, private keys…), URLs containing credentials
- **Crypto** — Ethereum and Bitcoin (bech32) wallet addresses
- **Network** — IPv4, IPv6, MAC addresses
- **Medical** — health-fund (קופת חולים) member numbers
- **Dates** — date of birth, plus sensitive dates (issue / expiry / hire / contract / medical) — keyword-gated, so everyday dates are never touched
- **Israeli** — vehicle plates, driver's license
- **Your own** — define custom masks (address + terms) in the shield panel

## Why it (almost) never masks the wrong thing
Accuracy comes from two disciplines, never from blind matching:
- **Checksum validation** — credit cards (Luhn), IBAN (mod-97), Israeli ID & company numbers (check digit). A number that fails its checksum is left alone.
- **Keyword-gating** — ambiguous values (passwords, CVV, health-fund numbers, bank accounts, dates, driver's license) are masked **only when a matching keyword is next to them**, so a random number, word, or everyday date is never touched.
- **JSON-safe matching** — masked values are bounded so they can never spill across the request payload and corrupt it.

## Features
- **Network interception** — hooks `fetch` and `XMLHttpRequest` to catch data before it leaves the browser.
- **Floating shield** — click to open the panel; drag to reposition. Toggle per provider (ChatGPT / Claude / Gemini) or per PII type in real time.
- **Masked-items viewer** — see every masked token mapped to its original value.
- **Count badge** — shows how many items are currently masked.
- **Persistent mapping** — your token map survives page reloads.
- **Secure clipboard** — copying text out of the AI page restores the real values.

## Privacy promise
No backend. No telemetry. No tracking. Everything happens **100% locally**, in your browser's memory.

## Current limitation
Spiimask masks **structured and labeled** data. It does **not yet** detect free-text **personal names** or **street addresses** — those require a Hebrew-aware NER model (on the roadmap). Treat it as strong protection for structured/sensitive data, not a replacement for reviewing free prose.

## Testing
A full masking test suite runs the real engine and checks **every** PII type — positive (must mask), negative (must **not** mask), and edge/regression cases for every bug we've fixed — plus JSON-payload safety:

```
node test/masking.test.js
```

56 assertions; exits non-zero on any failure. Add a case here whenever a new pattern or bug fix lands.

## Install (unpacked)
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select this folder
4. Open `chatgpt.com`, `claude.ai`, or `gemini.google.com` — the shield appears, and you're protected.
