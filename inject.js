console.log("ZeroTrust Bouncer POC v0.2.2: inject.js loaded (Main World)");

const PII_REGEXES = [
    { type: "EMAIL", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: "PHONE", regex: /(?:05\d-?\d{7})|(?:\+972-?5\d-?\d{7})/g },
    { type: "ID", regex: /\b\d{9}\b/g }
];

let piiMap = {};
let piiCounters = { EMAIL: 0, PHONE: 0, ID: 0 };

function maskText(text) {
    let newText = text;
    let modified = false;

    for (const rule of PII_REGEXES) {
        newText = newText.replace(rule.regex, (match) => {
            // Check if we already mapped this exact string
            let existingToken = Object.keys(piiMap).find(key => piiMap[key] === match);
            if (existingToken) return existingToken;

            piiCounters[rule.type]++;
            const token = `[${rule.type}_${piiCounters[rule.type]}]`;
            piiMap[token] = match;
            modified = true;
            return token;
        });
    }

    if (modified) {
        // Send the updated map to content.js
        window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapUpdate', { detail: JSON.stringify(piiMap) }));
    }

    return newText;
}

function processPayload(body) {
    if (typeof body !== 'string') return body;
    
    // If it's URL-encoded form data (like Gemini's batchexecute)
    if (body.startsWith('f.req=') || (body.includes('=') && body.includes('&'))) {
        try {
            const urlParams = new URLSearchParams(body);
            let modified = false;
            for (const [key, value] of urlParams.entries()) {
                const maskedValue = maskText(value);
                if (maskedValue !== value) {
                    urlParams.set(key, maskedValue);
                    modified = true;
                }
            }
            if (modified) {
                // URLSearchParams uses '+' for space, Gemini prefers '%20'.
                // Literal '+' are already safely encoded as '%2B'.
                return urlParams.toString().replace(/\+/g, '%20');
            }
            return body;
        } catch (e) {
            console.error("ZeroTrust Bouncer v0.2.2: URL decode failed", e);
        }
    }
    
    // Fallback for JSON (ChatGPT)
    return maskText(body);
}

// Intercept programmatic copy to unmask before it hits clipboard
if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        let unmaskedText = text;
        if (typeof unmaskedText === 'string') {
            for (const [token, realValue] of Object.entries(piiMap)) {
                if (unmaskedText.includes(token)) {
                    unmaskedText = unmaskedText.replaceAll(token, realValue);
                }
            }
        }
        console.log("ZeroTrust Bouncer v0.2.2: Unmasked text for clipboard copy!");
        return Reflect.apply(originalWriteText, navigator.clipboard, [unmaskedText]);
    };
}

const originalFetch = window.fetch;
window.fetch = async function(...args) {
    let urlString = "";
    try {
        if (args[0] instanceof Request) {
            urlString = args[0].url;
        } else if (args[0] instanceof URL) {
            urlString = args[0].href;
        } else {
            urlString = String(args[0]);
        }
    } catch (e) {}

    if (urlString.includes('conversation') || urlString.includes('batchexecute') || urlString.includes('StreamGenerate')) {
        console.log("ZeroTrust Bouncer v0.2.2: Intercepted FETCH request to " + urlString);
        try {
            let bodyText = null;
            let isRequestObj = false;

            if (args[0] instanceof Request) {
                isRequestObj = true;
                bodyText = await args[0].clone().text();
            } else if (args[1] && typeof args[1].body === 'string') {
                bodyText = args[1].body;
            }

            if (bodyText) {
                const maskedText = processPayload(bodyText);
                
                if (maskedText !== bodyText) {
                    console.log("ZeroTrust Bouncer v0.2.2: PII DETECTED! Masking payload...");
                    if (isRequestObj) {
                        args[0] = new Request(args[0], { body: maskedText });
                    } else {
                        args[1].body = maskedText;
                    }
                    console.log("ZeroTrust Bouncer v0.2.2: Payload Masked Successfully! Forwarding to OpenAI...");
                }
            }
        } catch(e) {
            console.error("ZeroTrust Bouncer v0.2.2: Error during masking", e);
        }
    }
    
    return Reflect.apply(originalFetch, window, args);
};

const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return Reflect.apply(originalXHROpen, this, arguments);
};

const originalXHRSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(body) {
    try {
        if (typeof body === 'string' && this._url) {
            let urlString = String(this._url);
            if (urlString.includes('conversation') || urlString.includes('batchexecute') || urlString.includes('StreamGenerate')) {
                console.log("ZeroTrust Bouncer v0.2.2: Intercepted XHR request to " + urlString);
                const maskedText = processPayload(body);
                if (maskedText !== body) {
                    console.log("ZeroTrust Bouncer v0.2.2: PII DETECTED in XHR! Masking payload...");
                    body = maskedText;
                }
            }
        }
    } catch(e) {
        console.error("ZeroTrust Bouncer v0.2.2: Error during XHR masking", e);
    }
    return Reflect.apply(originalXHRSend, this, [body]);
};
