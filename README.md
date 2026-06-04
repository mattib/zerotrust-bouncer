# ZeroTrust Bouncer

A zero-trust privacy proxy extension that runs entirely in your browser. It intercepts and masks Personally Identifiable Information (PII) before it ever hits the network, preventing LLM providers (ChatGPT, Claude, Gemini) from receiving your sensitive raw data.

**Built by Matti B.**

## What it does
When you type a prompt containing sensitive data (like an Email, Phone Number, or ID), ZeroTrust Bouncer steps in at the exact moment your browser tries to send the data to the AI server. 

It instantly swaps your real data for anonymous tokens (e.g., `matti@gmail.com` becomes `[EMAIL_1]`). The AI processes the request using only the anonymous tokens. When the AI responds, the extension visually unmasks the tokens back to your real data right on your screen.

**The result:** You get the full AI experience, but the AI companies never see your actual data.

## Features
- **Network Interception:** Deeply hooks `fetch` and `XMLHttpRequest` to catch data before it leaves your laptop.
- **Live Toggles:** Use the floating green shield widget to turn the bouncer on/off for specific providers (ChatGPT, Claude, Gemini) or specific PII types in real-time.
- **Drag & Drop:** Click and hold the shield to move the widget anywhere on your screen.
- **Secure Clipboard:** When you copy text out of the AI platform, the extension unmasks the tokens so you always paste real data.

## Privacy Promise
ZeroTrust Bouncer has no backend, no telemetry, and no tracking. Everything happens 100% locally inside your browser's memory.
