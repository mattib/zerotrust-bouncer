# ZeroTrust Bouncer (POC)

A zero-trust privacy proxy extension that runs entirely in your browser. It intercepts and masks Personally Identifiable Information (PII) before it ever hits the network layer, preventing LLM providers (ChatGPT, Claude, Gemini) from receiving your raw data.

**Built by Matti B.**

### How it works
1. **Network Hooking:** Intercepts `fetch` and `XMLHttpRequest` directly in the browser's Main World.
2. **Dynamic Masking:** Replaces real IDs, phone numbers, and emails with anonymized tokens (e.g., `[EMAIL_1]`) on the fly.
3. **Visual Unmasking:** Seamlessly unmasks tokens visually on the screen and actively hooks the Clipboard API so you can copy and paste real text back out of the AI platform securely.

### Architecture
* `manifest.json`: Configuration and Permissions.
* `core.js`: The central token engine and dictionary mapping.
* `content.js`: The Isolated World UI bridge for Shadow DOM injection.
* `inject.js`: The Main World network interceptor.
* `providers/`: Tiny adapter functions for handling different LLM API payloads (JSON, URL-encoded, etc).
