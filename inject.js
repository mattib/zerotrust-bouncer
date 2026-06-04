console.log("ZeroTrust Bouncer POC v0.2.5: inject.js loaded (Main World)");

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
            console.error("ZeroTrust Bouncer v0.2.5: URL decode failed", e);
        }
    }
    
    // Fallback for JSON (ChatGPT)
    return maskText(body);
}

// Intercept programmatic copy to unmask before it hits clipboard
function unmaskString(text) {
    let unmaskedText = text;
    if (typeof unmaskedText === 'string') {
        for (const [token, realValue] of Object.entries(piiMap)) {
            if (unmaskedText.includes(token)) {
                unmaskedText = unmaskedText.replaceAll(token, realValue);
            }
        }
    }
    return unmaskedText;
}

if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        const unmaskedText = unmaskString(text);
        console.log("ZeroTrust Bouncer v0.2.5: Unmasked text for clipboard.writeText!");
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
                            let unmaskedText = unmaskString(text);
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
            console.log("ZeroTrust Bouncer v0.2.5: Unmasked text for clipboard.write!");
            return Reflect.apply(originalWrite, navigator.clipboard, [newItems]);
        }
        return Reflect.apply(originalWrite, navigator.clipboard, [data]);
    };
}

// Hook document.execCommand for older copy implementations
const originalExecCommand = document.execCommand;
document.execCommand = function(command, showUI, value) {
    if (command.toLowerCase() === 'copy') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            const originalValue = activeElement.value;
            const unmaskedValue = unmaskString(originalValue);
            if (unmaskedValue !== originalValue) {
                activeElement.value = unmaskedValue;
                activeElement.select();
                console.log("ZeroTrust Bouncer v0.2.5: Unmasked text for execCommand('copy') on input!");
                const result = Reflect.apply(originalExecCommand, this, [command, showUI, value]);
                activeElement.value = originalValue; // Restore it immediately after copy
                activeElement.select();
                return result;
            }
        }
    }
    return Reflect.apply(originalExecCommand, this, [command, showUI, value]);
};

// Hook the 'copy' event to intercept setData calls
document.addEventListener('copy', (e) => {
    if (!e.clipboardData) return;
    const originalSetData = e.clipboardData.setData;
    e.clipboardData.setData = function(format, data) {
        if (format === 'text/plain') {
            const unmaskedData = unmaskString(data);
            if (unmaskedData !== data) {
                console.log("ZeroTrust Bouncer v0.2.5: Unmasked text for clipboardData.setData!");
            }
            return Reflect.apply(originalSetData, this, [format, unmaskedData]);
        }
        return Reflect.apply(originalSetData, this, [format, data]);
    };
}, true);

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
        console.log("ZeroTrust Bouncer v0.2.5: Intercepted FETCH request to " + urlString);
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
                    console.log("ZeroTrust Bouncer v0.2.5: PII DETECTED! Masking payload...");
                    if (isRequestObj) {
                        args[0] = new Request(args[0], { body: maskedText });
                    } else {
                        args[1].body = maskedText;
                    }
                    console.log("ZeroTrust Bouncer v0.2.5: Payload Masked Successfully! Forwarding to OpenAI...");
                }
            }
        } catch(e) {
            console.error("ZeroTrust Bouncer v0.2.5: Error during masking", e);
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
                console.log("ZeroTrust Bouncer v0.2.5: Intercepted XHR request to " + urlString);
                const maskedText = processPayload(body);
                if (maskedText !== body) {
                    console.log("ZeroTrust Bouncer v0.2.5: PII DETECTED in XHR! Masking payload...");
                    body = maskedText;
                }
            }
        }
    } catch(e) {
        console.error("ZeroTrust Bouncer v0.2.5: Error during XHR masking", e);
    }
    return Reflect.apply(originalXHRSend, this, [body]);
};
