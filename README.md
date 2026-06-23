# ZeroTrust Bouncer

A zero-trust privacy extension that runs entirely in your browser. It intercepts and masks Personally Identifiable Information (PII) **before it ever leaves your machine**, so AI providers (ChatGPT, Claude, Gemini) only ever receive anonymized tokens — never your real data.

**Built by Matti B.**

## How it works
The moment your browser tries to send a prompt to the AI server, ZeroTrust Bouncer steps in and swaps your sensitive data for anonymous, typed tokens:

> `matti@gmail.com` → `[EMAIL_a3f9c2]`

The AI processes the request using only those tokens. When it responds, the extension **unmasks** the tokens back to your real values, right on your screen. Each token keeps its *type* (`[EMAIL_…]`, `[ID_…]`, `[PASSWORD_…]`) so the AI still understands the meaning of your text — it just never sees the actual values.

**The result:** the full AI experience, with the AI company never seeing your real data.

## What it protects
- **Contact** — email, Israeli mobile / landline, international phone
- **Identity** — Israeli ID (ת"ז, check-digit validated), passport, US SSN, UK NI
- **Financial** — credit cards (Luhn-validated), IBAN (mod-97 validated), SWIFT/BIC, Israeli company no. (ח"פ), VAT (עוסק מורשה), CVV, card expiry
- **Secrets** — passwords, API keys for **55+ services** (AWS, OpenAI, GitHub, Stripe, JWTs, private keys…), URLs containing credentials
- **Crypto** — Ethereum and Bitcoin (bech32) wallet addresses
- **Network** — IPv4, IPv6, MAC addresses
- **Medical** — health-fund (קופת חולים) member numbers
- **Israeli** — vehicle plates
- **Your own** — define custom patterns in Settings → Custom

## Why it (almost) never masks the wrong thing
Accuracy comes from two disciplines, never from blind matching:
- **Checksum validation** — credit cards (Luhn), IBAN (mod-97), Israeli ID & company numbers (check digit). A number that fails its checksum is left alone.
- **Keyword-gating** — ambiguous values (passwords, CVV, VAT, health-fund numbers) are masked **only when their label is next to them**, so a random number or word is never touched.

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
ZeroTrust Bouncer masks **structured and labeled** data. It does **not yet** detect free-text **personal names** or **street addresses** — those require a Hebrew-aware NER model (on the roadmap). Treat it as strong protection for structured/sensitive data, not a replacement for reviewing free prose.

## Install (unpacked)
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select this folder
4. Open `chatgpt.com`, `claude.ai`, or `gemini.google.com` — the shield appears, and you're protected.

---

## שומר סף לפרטיות (ZeroTrust Bouncer)

תוסף פרטיות "אפס-אמון" שרץ לחלוטין בתוך הדפדפן שלך. הוא מיירט ומסווה מידע מזהה אישי (PII) **לפני שהוא עוזב את המחשב שלך**, כך שספקיות ה-AI (ChatGPT, Claude, Gemini) מקבלות רק אסימונים אנונימיים — לעולם לא את המידע האמיתי.

**פותח על ידי מתי ב.**

### איך זה עובד
ברגע שהדפדפן מנסה לשלוח הנחיה לשרת ה-AI, התוסף נכנס לפעולה ומחליף את המידע הרגיש באסימונים אנונימיים מסוג מוגדר:

> `matti@gmail.com` ← `[EMAIL_a3f9c2]`

ה-AI מעבד את הבקשה בעזרת האסימונים בלבד. כשהוא עונה, התוסף מבטל את ההסוואה ומחזיר את הערכים האמיתיים על המסך שלך. כל אסימון שומר על **סוגו** (`[EMAIL_…]`, `[ID_…]`, `[PASSWORD_…]`) כך שה-AI עדיין מבין את משמעות הטקסט — הוא פשוט לא רואה את הערכים עצמם.

**התוצאה:** החוויה המלאה של ה-AI, בלי שחברת ה-AI רואה את המידע האמיתי שלך.

### מה הוא מגן עליו
- **פרטי קשר** — אימייל, נייד וקווי ישראלי, טלפון בינלאומי
- **זהות** — תעודת זהות (עם ולידציית ספרת ביקורת), דרכון, SSN אמריקאי, NI בריטי
- **פיננסי** — כרטיסי אשראי (ולידציית Luhn), IBAN (ולידציית mod-97), SWIFT/BIC, ח"פ, עוסק מורשה, CVV, תוקף כרטיס
- **סודות** — סיסמאות, מפתחות API ל-55+ שירותים (AWS, OpenAI, GitHub, Stripe, JWT, מפתחות פרטיים…), כתובות URL עם פרטי גישה
- **קריפטו** — ארנקי Ethereum ו-Bitcoin (bech32)
- **רשת** — IPv4, IPv6, כתובות MAC
- **רפואי** — מספרי חבר בקופת חולים
- **ישראלי** — לוחיות רישוי
- **משלך** — הגדרת תבניות מותאמות אישית

### למה הוא כמעט אף פעם לא מסווה את הדבר הלא נכון
- **ולידציה מתמטית** — כרטיסי אשראי (Luhn), IBAN (mod-97), ת"ז וח"פ (ספרת ביקורת). מספר שנכשל בבדיקה — נשאר חשוף.
- **עיגון למילות-הקשר** — ערכים מעורפלים (סיסמאות, CVV, עוסק מורשה, מספר חבר) מוסווים **רק כשהתווית שלהם צמודה אליהם**, כך שמספר או מילה אקראיים לעולם לא ייתפסו.

### תכונות
- **יירוט רשת** — חיבור ל-`fetch` ול-`XMLHttpRequest` לתפיסת מידע לפני שהוא עוזב את הדפדפן.
- **מגן מרחף** — לחיצה פותחת את הפאנל; גרירה מזיזה אותו. מתגים לכל ספק או לכל סוג מידע בזמן אמת.
- **מציג פריטים מוסווים** — כל אסימון מול הערך המקורי שלו.
- **מונה** — כמה פריטים מוסווים כרגע.
- **שמירה מתמשכת** — מפת האסימונים שורדת רענון של הדף.
- **לוח גזירים מאובטח** — העתקת טקסט מהדף מחזירה את הערכים האמיתיים.

### הבטחת פרטיות
אין שרת. אין איסוף נתונים. אין מעקב. הכל קורה **100% מקומית** בזיכרון הדפדפן.

### מגבלה נוכחית
התוסף מסווה מידע **מובנה ומתויג**. הוא **עדיין לא** מזהה **שמות פרטיים** או **כתובות רחוב** בטקסט חופשי — אלה דורשים מודל NER עברי (במפת הדרכים).

### התקנה
1. גש ל-`chrome://extensions`
2. הפעל **מצב מפתח** (Developer mode)
3. **Load unpacked** → בחר את התיקייה הזו
4. פתח את `chatgpt.com`, `claude.ai` או `gemini.google.com` — המגן מופיע, ואתה מוגן.
