// ---------------------------------------------------------------------------
// API key definition table — one entry per service
// id      → config key (e.g. config.api_key_aws)
// label   → human-readable service name
// pattern → raw regex string (no /.../literals, no flags)
// ---------------------------------------------------------------------------
const API_KEY_DEFS = [
    { id: 'api_key_anthropic',    label: 'Anthropic',              pattern: 'sk-ant-(?:api03|admin01)-[a-zA-Z0-9_\\-]{93}AA' },
    { id: 'api_key_openai',       label: 'OpenAI',                 pattern: 'sk-(?:proj-|svcacct-|admin-)[A-Za-z0-9_\\-]{58,74}|(?<![\\w])sk-[a-zA-Z0-9]{48}(?![\\w])' },
    { id: 'api_key_aws',          label: 'AWS',                    pattern: '\\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\\b' },
    { id: 'api_key_github_pat',   label: 'GitHub PAT',             pattern: 'ghp_[0-9a-zA-Z]{36}' },
    { id: 'api_key_github_oauth', label: 'GitHub OAuth',           pattern: 'gho_[0-9a-zA-Z]{36}' },
    { id: 'api_key_github_app',   label: 'GitHub App',             pattern: '(?:ghu|ghs)_[0-9a-zA-Z]{36}' },
    { id: 'api_key_github_fine',  label: 'GitHub Fine-grained',    pattern: 'github_pat_[a-zA-Z0-9_]{82}' },
    { id: 'api_key_google',       label: 'Google/GCP',             pattern: 'AIza[0-9A-Za-z_\\-]{35}' },
    { id: 'api_key_slack_bot',    label: 'Slack Bot',              pattern: 'xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}' },
    { id: 'api_key_slack_user',   label: 'Slack User',             pattern: 'xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{32}' },
    { id: 'api_key_stripe',       label: 'Stripe',                 pattern: '(?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99}' },
    { id: 'api_key_sendgrid',     label: 'SendGrid',               pattern: 'SG\\.[a-zA-Z0-9._\\-]{22}\\.[a-zA-Z0-9._\\-]{43}' },
    { id: 'api_key_twilio',       label: 'Twilio API Key',         pattern: 'SK[0-9a-fA-F]{32}' },
    { id: 'api_key_mailgun',      label: 'Mailgun',                pattern: 'key-[a-f0-9]{32}' },
    { id: 'api_key_shopify',      label: 'Shopify',                pattern: 'shpat_[a-fA-F0-9]{32}' },
    { id: 'api_key_square',       label: 'Square',                 pattern: '(?:EAAA|sq0atp-)[a-zA-Z0-9_\\-]{22,60}' },
    { id: 'api_key_digitalocean', label: 'DigitalOcean PAT',       pattern: 'dop_v1_[a-f0-9]{64}' },
    { id: 'api_key_do_spaces',    label: 'DO Spaces',              pattern: 'doo_v1_[a-f0-9]{64}' },
    { id: 'api_key_do_registry',  label: 'DO Registry',            pattern: 'dor_v1_[a-f0-9]{64}' },
    { id: 'api_key_newrelic',     label: 'New Relic',              pattern: 'NRAK-[a-zA-Z0-9]{27}' },
    { id: 'api_key_grafana',      label: 'Grafana',                pattern: 'eyJrIjoi[A-Za-z0-9]{70,400}=' },
    { id: 'api_key_jwt',          label: 'JWT',                    pattern: 'ey[a-zA-Z0-9_\\-]{10,}\\.[a-zA-Z0-9_\\-]{10,}\\.[a-zA-Z0-9_\\-]{10,}' },
    { id: 'api_key_private_key',  label: 'Private Key',            pattern: '-----BEGIN(?:(?: EC| PGP| DSA| RSA| OPENSSH)? PRIVATE KEY)-----' },
    { id: 'api_key_alibaba',      label: 'Alibaba Cloud',          pattern: 'LTAI[a-zA-Z0-9]{20}' },
    { id: 'api_key_artifactory',  label: 'Artifactory',            pattern: '(?:AKCp|cmVmd)[A-Za-z0-9+/]{69}' },
    { id: 'api_key_atlassian',    label: 'Atlassian/Jira',         pattern: 'ATATT3[A-Za-z0-9_\\-=]{186}' },
    { id: 'api_key_atlassian_pat',label: 'Atlassian PAT',          pattern: 'pat[a-zA-Z0-9]{14}\\.[a-f0-9]{64}' },
    { id: 'api_key_datadog',      label: 'Datadog',                pattern: 'dapi[a-f0-9]{32}' },
    { id: 'api_key_dropbox',      label: 'Dropbox',                pattern: 'sl\\.[a-zA-Z0-9\\-=_]{135}' },
    { id: 'api_key_duffel',       label: 'Duffel',                 pattern: 'duffel_(?:test|live)_[a-zA-Z0-9_\\-=]{43}' },
    { id: 'api_key_dynatrace',    label: 'Dynatrace',              pattern: 'dt0c01\\.[a-zA-Z0-9]{24}\\.[a-zA-Z0-9]{64}' },
    { id: 'api_key_easypost',     label: 'EasyPost',               pattern: 'EZ(?:AK|TK)[a-zA-Z0-9]{54}' },
    { id: 'api_key_facebook',     label: 'Facebook/Meta',          pattern: 'EAA[MC][a-zA-Z0-9]{100,}' },
    { id: 'api_key_flutterwave',  label: 'Flutterwave',            pattern: 'FLWSECK(?:_TEST)?-[a-zA-Z0-9]{12,32}(?:-X)?' },
    { id: 'api_key_fio',          label: 'Fio Bank',               pattern: 'fio-u-[a-zA-Z0-9_\\-=]{64}' },
    { id: 'api_key_heroku',       label: 'Heroku',                 pattern: 'hrku-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' },
    { id: 'api_key_hubspot',      label: 'HubSpot',                pattern: 'pat-(?:na|eu)1-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' },
    { id: 'api_key_linear',       label: 'Linear',                 pattern: 'lin_api_[a-zA-Z0-9]{40}' },
    { id: 'api_key_netlify',      label: 'Netlify',                pattern: 'nfp_[a-zA-Z0-9]{40,46}' },
    { id: 'api_key_notion',       label: 'Notion',                 pattern: 'secret_[a-zA-Z0-9]{43}' },
    { id: 'api_key_npm',          label: 'npm',                    pattern: 'npm_[a-zA-Z0-9]{36}' },
    { id: 'api_key_opsgenie',     label: 'Opsgenie',               pattern: '(?<=(?:[Oo]ps[Gg]enie|OPSGENIE)[^\\n]{0,15}?)[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' },
    { id: 'api_key_planetscale',  label: 'PlanetScale',            pattern: 'pscale_tkn_[a-zA-Z0-9_]{32,}' },
    { id: 'api_key_postman',      label: 'Postman',                pattern: 'PMAK-[a-f0-9]{24}-[a-f0-9]{34}' },
    { id: 'api_key_prefect',      label: 'Prefect',                pattern: 'pnu_[a-zA-Z0-9]{36}' },
    { id: 'api_key_pulumi',       label: 'Pulumi',                 pattern: 'pul-[a-f0-9]{40}' },
    { id: 'api_key_rubygems',     label: 'RubyGems',               pattern: 'rubygems_[a-f0-9]{48}' },
    { id: 'api_key_scalingo',     label: 'Scalingo',               pattern: 'tk-us-[a-zA-Z0-9\\-_]{48}' },
    { id: 'api_key_segment',      label: 'Segment',                pattern: 'sgp_[a-zA-Z0-9]{64}' },
    { id: 'api_key_snyk',         label: 'Snyk',                   pattern: '(?<=(?:[Ss]nyk|SNYK)[^\\n]{0,15}?)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' },
    { id: 'api_key_supabase',     label: 'Supabase',               pattern: 'sbp_[a-b0-9]{40}' },
    { id: 'api_key_telegram_bot', label: 'Telegram Bot',           pattern: '[0-9]{10}:[a-zA-Z0-9_\\-]{35}' },
    { id: 'api_key_vercel',       label: 'Vercel',                 pattern: '(?:vercel_|vc_)[a-zA-Z0-9]{24,}' },
    { id: 'api_key_bearer',       label: 'Bearer token',           pattern: 'Bearer\\s+[a-zA-Z0-9._\\-]{20,}' },
];

window.Spiimask = window.Spiimask || {
    logPrefix: window.SpiimaskBrand ? window.SpiimaskBrand.logPrefix : "[Spiimask]", // Default fallback
    DEBUG: false, // OFF by default → quiet console. Set window.Spiimask.DEBUG = true to see intercept logs.
    log: function(...args) {
        if (window.Spiimask.DEBUG) console.log(window.Spiimask.logPrefix, ...args);
    },
    
    config: {
        pii_email: true,
        pii_phone: true,
        pii_id: true,
        pii_phone_il_landline: true,
        pii_phone_intl: true,
        pii_passport_il: true,
        pii_company_il: true,
        pii_vat_il: true,
        pii_health_fund: true,
        pii_password: true,
        pii_cvv: true,
        pii_card_expiry: true,
        pii_btc_wallet: true,
        pii_ssn_us: true,
        pii_ni_uk: true,
        pii_iban: true,
        pii_swift_bic: true,
        pii_eth_wallet: true,
        pii_ipv4: true,
        pii_ipv6: true,
        pii_mac: true,
        // Master toggle — if false, API_KEY entry is skipped entirely regardless of per-service config
        pii_api_key: true,
        pii_plate_il: true,
        pii_url_creds: true,
        provider_chatgpt: true,
        provider_claude: true,
        provider_gemini: true,
        // Per-service API key toggles (all default on)
        api_key_anthropic: true,
        api_key_openai: true,
        api_key_aws: true,
        api_key_github_pat: true,
        api_key_github_oauth: true,
        api_key_github_app: true,
        api_key_github_fine: true,
        api_key_google: true,
        api_key_slack_bot: true,
        api_key_slack_user: true,
        api_key_stripe: true,
        api_key_sendgrid: true,
        api_key_twilio: true,
        api_key_mailgun: true,
        api_key_shopify: true,
        api_key_square: true,
        api_key_digitalocean: true,
        api_key_do_spaces: true,
        api_key_do_registry: true,
        api_key_newrelic: true,
        api_key_grafana: true,
        api_key_jwt: true,
        api_key_private_key: true,
        api_key_alibaba: true,
        api_key_artifactory: true,
        api_key_atlassian: true,
        api_key_atlassian_pat: true,
        api_key_datadog: true,
        api_key_dropbox: true,
        api_key_duffel: true,
        api_key_dynatrace: true,
        api_key_easypost: true,
        api_key_facebook: true,
        api_key_flutterwave: true,
        api_key_fio: true,
        api_key_heroku: true,
        api_key_hubspot: true,
        api_key_linear: true,
        api_key_netlify: true,
        api_key_notion: true,
        api_key_npm: true,
        api_key_opsgenie: true,
        api_key_planetscale: true,
        api_key_postman: true,
        api_key_prefect: true,
        api_key_pulumi: true,
        api_key_rubygems: true,
        api_key_scalingo: true,
        api_key_segment: true,
        api_key_snyk: true,
        api_key_supabase: true,
        api_key_telegram_bot: true,
        api_key_vercel: true,
        api_key_bearer: true,
    },

    PII_REGEXES: [
        // NOTE: Order matters — more-specific patterns must precede broader ones that
        // would otherwise consume their tokens first.

        // URL with embedded credentials — must come before EMAIL (EMAIL would eat "pass@host")
        { type: "URL_CREDS", regex: /https?:\/\/[^:@\s\/]+:[^@\s\/]+@[A-Za-z0-9._~\-:\/?#\[\]@!$&'()*+,;=%]+/g },

        // Israeli VAT / עוסק מורשה — keyword-required; before ID (ID swallows bare 9-digit)
        { type: "VAT_IL", regex: /(?<=(?:עוסק|ח["״'.]?פ|מע["״'.]?מ)[^\d\n]{0,30})\d{8,9}(?!\d)/g },

        // Israeli health-fund (קופת חולים) member number — MEDICAL PII. Keyword-gated so a bare
        // 8-9 digit number never matches; only digits following a health-fund keyword.
        { type: "HEALTH_FUND", regex: /(?<=(?:מספר חבר|קופת חולים|קופ["״]?ח)[^\d\n]{0,30})\d{8,9}(?!\d)/g },
        // Israeli bank account — keyword-gated (חשבון / account). Value is digits+hyphens only
        // (no spaces/quotes) so it can never eat across the JSON payload. Covers 12-345-678901 + raw.
        { type: "BANK_ACCOUNT", regex: /(?<=(?:מספר\s*חשבון|חשבון|account(?:\s*(?:number|no\.?|#))?)[^\d\n"]{0,12})\d[\d-]{4,16}\d/gu },
        // Date of birth — keyword-gated (bare dates never match; only after a DOB keyword).
        { type: "DOB", regex: /(?<=(?:תאריך\s*לידה|ת\.?\s*לידה|date\s*of\s*birth|DOB|born(?:\s*on)?|נולדה?|נולדתי)[^\d\n"]{0,10})\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/gu },
        // Sensitive dates in NON-birth contexts (issue/expiry/hire/hospitalized/contract...). Keyword-gated:
        // an innocent date ("let's meet 03/15") is never masked — only a date next to a sensitive keyword.
        { type: "DATE", regex: /(?<=(?:issue[d]?(?:\s*date)?|date\s*of\s*issue|valid\s*(?:until|through|thru)|expir\w*|hire[d]?(?:\s*date)?|start\s*date|termination|effective(?:\s*date)?|contract\s*date|hospitali[sz]ed|admitted|discharge[d]?|surgery|תאריך\s*הנפקה|הונפק|בתוקף\s*עד|תחילת\s*עבודה|קליטה|פיטורי[ןם]|אשפוז|ניתוח|שחרור|תאריך\s*חוזה)[^\d\n"]{0,12})\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/gu },
        // Driver's license — keyword-gated (רישיון נהיגה / driver's license / DL). Digits-only value -> JSON-safe.
        // Note: an IL license number is often the ת״ז, which the ID rule already catches.
        { type: "DRIVERS_LICENSE", regex: /(?<=(?:רישיון\s*נהיגה|מספר\s*רישיון|driv(?:er'?s?|ing)\s*licen[sc]e|\bDL\b)[^\d\n"]{0,15})\d{7,9}\b/gu },

        // --- Secrets / payment (keyword-gated: the value alone has no safe format to match) ---
        // Password — only the value right after a password label (no label → never matched).
        { type: "PASSWORD", regex: /(?<=(?:[Pp]assword|passwd|PWD|pwd|סיסמה|סיסמא)\s*[:=]\s*)[^\s"]{4,}/g },
        // CVV / CVC — 3-4 digits, only after the CVV label (bare 3-4 digits never match).
        { type: "CVV", regex: /(?<=(?:CVV|CVC|cvv|cvc)\s*[:=]?\s*)\d{3,4}\b/g },
        // Card expiry MM/YY(YY) — keyword-gated + month 01-12 (so a DOB like 15/07/1985 never matches).
        { type: "CARD_EXPIRY", regex: /(?<=(?:תוקף|exp|expiry|valid)\D{0,8})(?:0[1-9]|1[0-2])\/\d{2,4}\b/g },
        // Numeric passport (IL 8-9 digit) — keyword-gated on דרכון/passport (bare digits are ambiguous).
        { type: "PASSPORT_IL", regex: /(?<=(?:דרכון|[Pp]assport)\D{0,12})\d{7,9}\b/g },

        // Israeli company registration (ח"פ) — starts with 5, 9 digits; before ID
        { 
            type: "COMPANY_IL", 
            regex: /\b5\d{8}\b/g,
            validate: function(match) { return window.Spiimask.validateIsraeliId(match); }
        },

        // Credit card — 13-19 digits, grouped or raw; Luhn-validated to kill false positives
        // Covers: Visa/MC/Discover (16-digit 4-4-4-4), Amex (15-digit 4-6-5), raw compact
        {
            type: "CREDIT_CARD",
            regex: /\b\d{4}[ \-]\d{4}[ \-]\d{4}[ \-]\d{4}\b|\b\d{4}[ \-]\d{6}[ \-]\d{5}\b|\b\d{13,19}\b/g,
            validate: function(match) {
                return window.Spiimask.isCreditCardNumber(match);
            }
        },

        // IBAN (International Bank Account Number)
        {
            type: "IBAN",
            regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
            validate: function(match) {
                const iban = match.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const reordered = iban.substring(4) + iban.substring(0, 4);
                const numeric = reordered.split('').map(c => {
                    const code = c.charCodeAt(0);
                    return (code >= 65 && code <= 90) ? (code - 55).toString() : c;
                }).join('');
                let remainder = numeric;
                let block;
                while (remainder.length > 2) {
                    block = remainder.slice(0, 9);
                    remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
                }
                return parseInt(remainder, 10) % 97 === 1;
            }
        },

        // SWIFT/BIC Bank Code — keyword-gated (must follow "SWIFT"/"BIC") so it can't mask normal ALL-CAPS words
        { type: "SWIFT_BIC", regex: /(?<=(?:SWIFT|Swift|swift|BIC|Bic|bic)[^\n]{0,15}?)[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g },

        // Ethereum Wallet Address
        { type: "ETH_WALLET", regex: /\b0x[a-fA-F0-9]{40}\b/g },

        // Bitcoin wallet — bech32 (bc1…) only; distinctive prefix = low false-positive.
        // Legacy 1…/3… base58 deferred until checksum-validated (would over-match without it).
        { type: "BTC_WALLET", regex: /\bbc1[a-z0-9]{25,59}\b/g },


        // Existing broad patterns
        { type: "EMAIL", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
        { type: "PHONE", regex: /(?<!\d)(?:05\d|\+972-?5\d)(?:[-\s]?\d){7}(?!\d)/g },
        {
            type: "ID",
            regex: /\b\d{9}\b/g,
            validate: function(match) { return window.Spiimask.validateIsraeliId(match); }
        },

        // Israeli landline — AFTER ID so a valid ת"ז is typed [ID], not mislabeled [PHONE_IL_LANDLINE].
        // The token TYPE carries meaning to the LLM, so the checksum (in ID) is the arbiter:
        // only 9-digit numbers that FAIL the ID checksum (plus hyphenated forms) land here.
        { type: "PHONE_IL_LANDLINE", regex: /\b0[2-489]-?\d{7}\b/g },

        // International phone E.164 (exclude +972 already handled)
        { type: "PHONE_INTL", regex: /(?<!\d)\+(?!972)[1-9](?:[\s\-]?\d){6,14}(?!\d)/g },
        // Israeli passport (2 uppercase letters + 7 digits)
        { type: "PASSPORT_IL", regex: /\b[A-Z]{2}\d{7}\b/g },
        // US Social Security Number
        { type: "SSN_US", regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g },
        // UK National Insurance number
        { type: "NI_UK", regex: /\b(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]\b/gi },
        // IPv4 address (validates 0-255)
        { type: "IPV4", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
        // IPv6 address (full and compressed forms)
        { type: "IPV6", regex: /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){2,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|::(?:[0-9a-fA-F]{1,4}:){1,5}[0-9a-fA-F]{1,4}/g },
        // MAC address (colon or dash separator)
        { type: "MAC", regex: /\b(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}\b/g },
        // API keys — built dynamically from API_KEY_DEFS; see _refreshApiKeyEntry()
        { type: "API_KEY", regex: null },
        // Israeli vehicle plate (old: NN-NNN-NN, new: NNN-NN-NNN)
        { type: "PLATE_IL", regex: /\b(?:\d{2}-\d{3}-\d{2}|\d{3}-\d{2}-\d{3})\b/g }
    ],
    piiMap: {},
    piiCounters: { EMAIL: 0, PHONE: 0, ID: 0, PHONE_IL_LANDLINE: 0, PHONE_INTL: 0, PASSPORT_IL: 0, COMPANY_IL: 0, VAT_IL: 0, SSN_US: 0, NI_UK: 0, IBAN: 0, SWIFT_BIC: 0, ETH_WALLET: 0, IPV4: 0, IPV6: 0, MAC: 0, API_KEY: 0, PLATE_IL: 0, URL_CREDS: 0, CREDIT_CARD: 0, BANK_ACCOUNT: 0, DOB: 0, DATE: 0, DRIVERS_LICENSE: 0 },
    providers: [],

    // Luhn checksum — strips spaces/dashes, validates credit card digits
    luhn: function(digits) {
        let sum = 0, alt = false;
        for (let i = digits.length - 1; i >= 0; i--) {
            let n = parseInt(digits[i], 10);
            if (isNaN(n)) return false;
            if (alt) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            alt = !alt;
        }
        return sum % 10 === 0;
    },

    // Credit-card gate: require a real card-network IIN prefix + valid length, THEN Luhn.
    // Luhn alone passes ~1 in 10 random numbers (e.g. a 16-digit page id starting 1782),
    // which is why a non-card number was being masked. The prefix+length gate kills that.
    isCreditCardNumber: function(raw) {
        const d = String(raw).replace(/[^0-9]/g, '');
        const len = d.length;
        if (len < 13 || len > 19) return false;
        const networks = [
            { re: /^4/,                                       lens: [13, 16, 19] },        // Visa
            { re: /^5[1-5]/,                                  lens: [16] },                // Mastercard
            { re: /^(222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/, lens: [16] },          // Mastercard 2-series
            { re: /^3[47]/,                                   lens: [15] },                // Amex
            { re: /^(30[0-5]|3095|36|3[89])/,                 lens: [14, 16, 17, 18, 19] },// Diners
            { re: /^(6011|64[4-9]|65)/,                       lens: [16, 17, 18, 19] },    // Discover
            { re: /^35(2[89]|[3-8]\d)/,                       lens: [16, 17, 18, 19] },    // JCB
            { re: /^62/,                                      lens: [16, 17, 18, 19] }     // UnionPay
        ];
        const ok = networks.some(n => n.re.test(d) && n.lens.includes(len));
        if (!ok) return false;
        return window.Spiimask.luhn(d);
    },

    // Israeli Teudat Zehut / Company Registration checksum
    validateIsraeliId: function(id) {
        if (!/^\d{9}$/.test(id)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            let step = parseInt(id.charAt(i), 10) * ((i % 2 === 0) ? 1 : 2);
            if (step > 9) step -= 9;
            sum += step;
        }
        return sum % 10 === 0;
    },

    // Per-send masked-item total (accumulated across multiple maskText calls, e.g. Gemini's multi-part request).
    _maskCountPending: 0,

    // Fire the badge count once per send (summed across all maskText calls this send), then reset.
    flushMaskCount: function() {
        const n = window.Spiimask._maskCountPending || 0;
        window.Spiimask._maskCountPending = 0;
        window.dispatchEvent(new CustomEvent('Spiimask_MaskedCount', { detail: String(n) }));
    },

    // Generate a short random id (6 lowercase alphanumeric chars) for masking tokens.
    _shortId: function() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let s = '';
        for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    },

    // Build a unique token like [TYPE_a3f9c2]; regenerates on the rare collision.
    _makeToken: function(typeBase) {
        let token;
        do { token = `[${typeBase}_${window.Spiimask._shortId()}]`; } while (window.Spiimask.piiMap[token] !== undefined);
        return token;
    },

    maskText: function(text) {
        let newText = text;
        let modified = false;
        let maskedCount = 0;

        for (const rule of window.Spiimask.PII_REGEXES) {
            if (!rule.regex) continue; // Skip entries with null regex (e.g. API_KEY when all disabled)
            const configKey = `pii_${rule.type.toLowerCase()}`;
            if (window.Spiimask.config[configKey] === false) continue; // Skip disabled PII types

            newText = newText.replace(rule.regex, (match) => {
                // Per-rule validation (e.g. Luhn for credit cards) — skip if fails
                if (rule.validate && !rule.validate(match)) return match;

                maskedCount++;
                let existingToken = Object.keys(window.Spiimask.piiMap).find(key => window.Spiimask.piiMap[key] === match);
                if (existingToken) return existingToken;

                const token = window.Spiimask._makeToken(rule.type);
                window.Spiimask.piiMap[token] = match;
                modified = true;
                return token;
            });
        }

        // User-defined custom masks
        const customResult = window.Spiimask._runCustomMasks(newText);
        newText = customResult.text;
        if (customResult.modified) modified = true;
        maskedCount += customResult.count || 0;

        if (modified) {
            // A listener throwing (e.g. an invalidated content-script context) must NEVER break masking.
            try {
                window.dispatchEvent(new CustomEvent('Spiimask_MapUpdate', { detail: JSON.stringify(window.Spiimask.piiMap) }));
            } catch (e) {}
        }

        // Accumulate into the per-send total; the network interceptor flushes it once per send
        // (so multi-part requests like Gemini's sum into one badge number instead of overwriting).
        window.Spiimask._maskCountPending = (window.Spiimask._maskCountPending || 0) + maskedCount;

        return newText;
    },

    // -----------------------------------------------------------------------
    // Custom Masks Feature (Replaces old Custom Patterns)
    // -----------------------------------------------------------------------
    _sanitizeCustomMask: function(input, isAddress) {
        if (!input || typeof input !== 'string') return null;
        let trimmed = input.trim();
        if (trimmed.length < 3) return null;

        const stopWords = ['and', 'the', 'for', 'with', 'that', 'this', 'של', 'את', 'על', 'עם', 'are', 'you', 'was', 'not', 'but', 'all'];
        if (stopWords.includes(trimmed.toLowerCase())) return null;

        if (isAddress) {
            if (!/^[A-Za-z0-9א-ת\s,]+$/.test(trimmed)) return null;
        }

        // Safely escape all regex special characters
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        try {
            return new RegExp('\\b(?:' + escaped + ')\\b', 'gi');
        } catch (e) {
            return null;
        }
    },

    // Runs all user-defined custom masks against text.
    // Returns { text, modified } — caller handles the MapUpdate dispatch.
    _runCustomMasks: function(text) {
        const masks = window.Spiimask.config.custom_masks;
        if (!Array.isArray(masks) || !masks.length) return { text, modified: false, count: 0 };

        let result = text;
        let modified = false;
        let count = 0;

        for (let i = 0; i < masks.length; i++) {
            const val = masks[i];
            if (!val) continue;

            const isAddress = (i === 0);
            const regex = window.Spiimask._sanitizeCustomMask(val, isAddress);
            if (!regex) continue;

            // Provide context to the AI model
            const tokenBase = isAddress ? 'ADDRESS' : 'NAME';

            result = result.replace(regex, (match) => {
                count++;
                const existing = Object.keys(window.Spiimask.piiMap).find(k => window.Spiimask.piiMap[k] === match);
                if (existing) return existing;
                const token = window.Spiimask._makeToken(tokenBase);
                window.Spiimask.piiMap[token] = match;
                modified = true;
                return token;
            });
        }

        return { text: result, modified, count };
    },

    // Builds a combined regex from all currently-enabled API_KEY_DEFS entries.
    // Returns null if no entries are enabled.
    _buildApiKeyRegex: function() {
        const enabled = API_KEY_DEFS.filter(d => window.Spiimask.config[d.id] !== false);
        if (!enabled.length) return null;
        return new RegExp('(?:' + enabled.map(d => d.pattern).join('|') + ')', 'g');
    },

    // Replaces the API_KEY entry in PII_REGEXES with a freshly-built regex.
    // Removes the entry entirely when the master toggle is off or no services enabled.
    _refreshApiKeyEntry: function() {
        // Master toggle check — if pii_api_key is false, remove the entry
        if (window.Spiimask.config.pii_api_key === false) {
            const idx = window.Spiimask.PII_REGEXES.findIndex(r => r.type === 'API_KEY');
            if (idx >= 0) window.Spiimask.PII_REGEXES[idx].regex = null;
            return;
        }
        let regex = null;
        try {
            regex = window.Spiimask._buildApiKeyRegex();
        } catch (e) {
            window.Spiimask.log("Error building API_KEY regex:", e);
        }
        const idx = window.Spiimask.PII_REGEXES.findIndex(r => r.type === 'API_KEY');
        if (regex && idx >= 0) {
            window.Spiimask.PII_REGEXES[idx].regex = regex;
        } else if (!regex && idx >= 0) {
            window.Spiimask.PII_REGEXES[idx].regex = null;
        }
    },

    unmaskString: function(text) {
        let unmaskedText = text;
        if (typeof unmaskedText === 'string') {
            for (const [token, realValue] of Object.entries(window.Spiimask.piiMap)) {
                if (unmaskedText.includes(token)) {
                    unmaskedText = unmaskedText.replaceAll(token, realValue);
                }
            }
        }
        return unmaskedText;
    }
};

// Build the initial API_KEY regex from the default config
window.Spiimask._refreshApiKeyEntry();

window.addEventListener('Spiimask_InitLogger', (e) => {
    try {
        const data = JSON.parse(e.detail);
        if (data.prefix) {
            window.Spiimask.logPrefix = data.prefix;
        }
    } catch (err) {}
});

// Listen for live config updates from the options UI
window.addEventListener('Spiimask_ConfigUpdate', (e) => {
    try {
        const updates = JSON.parse(e.detail);
        Object.assign(window.Spiimask.config, updates);
        window.Spiimask._refreshApiKeyEntry();
        window.Spiimask.log("Engine Config Updated:", window.Spiimask.config);
    } catch (err) {}
});

// Restore persisted piiMap + piiCounters on page load
window.addEventListener('Spiimask_MapRestore', (e) => {
    try {
        const data = JSON.parse(e.detail);
        if (data.piiMap)     Object.assign(window.Spiimask.piiMap, data.piiMap);
        if (data.piiCounters) Object.assign(window.Spiimask.piiCounters, data.piiCounters);
        window.Spiimask.log("Map restored:", Object.keys(window.Spiimask.piiMap).length, "entries");
    } catch (err) {}
});

// Clear the in-memory map (triggered by the Clear button in Settings)
window.addEventListener('Spiimask_MapClear', () => {
    window.Spiimask.piiMap     = {};
    window.Spiimask.piiCounters = {};
    window.Spiimask.log("Map cleared by user.");
});

// Replace the engine's map with an authoritative (trimmed) map from the content script —
// keeps both copies in sync after FIFO eviction, with no page refresh needed.
window.addEventListener('Spiimask_MapSync', (e) => {
    try {
        window.Spiimask.piiMap = JSON.parse(e.detail);
        window.Spiimask.log("Map synced (trimmed):", Object.keys(window.Spiimask.piiMap).length, "entries");
    } catch (err) {}
});

if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        const unmaskedText = window.Spiimask.unmaskString(text);
        window.Spiimask.log("Unmasked text for clipboard.writeText!");
        return Reflect.apply(originalWriteText, navigator.clipboard, [unmaskedText]);
    };
}

if (navigator.clipboard && navigator.clipboard.write) {
    const originalWrite = navigator.clipboard.write;
    navigator.clipboard.write = async function(data) {
        if (Array.isArray(data)) {
            let newItems = [];
            for (let item of data) {
                let newBlobs = {};
                for (let type of item.types) {
                    if (type === 'text/plain' || type === 'text/html') {
                        try {
                            let blob = await item.getType(type);
                            let text = await blob.text();
                            let unmaskedText = window.Spiimask.unmaskString(text);
                            newBlobs[type] = new Blob([unmaskedText], { type: type });
                        } catch (e) {
                            newBlobs[type] = await item.getType(type);
                        }
                    } else {
                        newBlobs[type] = await item.getType(type);
                    }
                }
                newItems.push(new ClipboardItem(newBlobs));
            }
            window.Spiimask.log("Unmasked text for clipboard.write!");
            return Reflect.apply(originalWrite, navigator.clipboard, [newItems]);
        }
        return Reflect.apply(originalWrite, navigator.clipboard, [data]);
    };
}

const originalExecCommand = document.execCommand;
document.execCommand = function(command, showUI, value) {
    if (command.toLowerCase() === 'copy') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            const originalValue = activeElement.value;
            const unmaskedValue = window.Spiimask.unmaskString(originalValue);
            if (unmaskedValue !== originalValue) {
                activeElement.value = unmaskedValue;
                activeElement.select();
                window.Spiimask.log("Unmasked text for execCommand('copy')!");
                const result = Reflect.apply(originalExecCommand, this, [command, showUI, value]);
                activeElement.value = originalValue;
                activeElement.select();
                return result;
            }
        }
    }
    return Reflect.apply(originalExecCommand, this, [command, showUI, value]);
};

document.addEventListener('copy', (e) => {
    if (!e.clipboardData) return;
    const originalSetData = e.clipboardData.setData;
    e.clipboardData.setData = function(format, data) {
        if (format === 'text/plain') {
            const unmaskedData = window.Spiimask.unmaskString(data);
            if (unmaskedData !== data) {
                window.Spiimask.log("Unmasked text for clipboardData.setData!");
            }
            return Reflect.apply(originalSetData, this, [format, unmaskedData]);
        }
        return Reflect.apply(originalSetData, this, [format, data]);
    };
}, true);

// Listen for dynamic brand updates passed from the isolated content script
window.addEventListener('Spiimask_BrandUpdate', (e) => {
    try {
        const brand = JSON.parse(e.detail);
        window.SpiimaskBrand = brand;
        if (brand.logPrefix) {
            window.Spiimask.logPrefix = brand.logPrefix;
        }
    } catch (err) {
        console.error("Failed to parse brand update in core", err);
    }
});
