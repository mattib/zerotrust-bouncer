console.log("ZeroTrust Bouncer POC v0.1.6: inject.js loaded (Main World)");

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

    if (urlString.includes('conversation')) {
        console.log("ZeroTrust Bouncer v0.1.6: Intercepted FETCH conversation request!");
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
                const maskedText = maskText(bodyText);
                
                if (maskedText !== bodyText) {
                    console.log("ZeroTrust Bouncer v0.1.6: PII DETECTED! Masking payload...");
                    if (isRequestObj) {
                        args[0] = new Request(args[0], { body: maskedText });
                    } else {
                        args[1].body = maskedText;
                    }
                    console.log("ZeroTrust Bouncer v0.1.6: Payload Masked Successfully! Forwarding to OpenAI...");
                }
            }
        } catch(e) {
            console.error("ZeroTrust Bouncer v0.1.6: Error during masking", e);
        }
    }
    
    return Reflect.apply(originalFetch, window, args);
};
