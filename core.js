window.ZeroTrust = window.ZeroTrust || {
    logPrefix: "[ZeroTrust Bouncer POC]", // Default fallback
    log: function(...args) {
        console.log(window.ZeroTrust.logPrefix, ...args);
    },
    
    config: {
        pii_email: true,
        pii_phone: true,
        pii_id: true,
        provider_chatgpt: true,
        provider_claude: true,
        provider_gemini: true
    },
    
    PII_REGEXES: [
        { type: "EMAIL", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
        { type: "PHONE", regex: /(?:05\d-?\d{7})|(?:\+972-?5\d-?\d{7})/g },
        { type: "ID", regex: /\b\d{9}\b/g }
    ],
    piiMap: {},
    piiCounters: { EMAIL: 0, PHONE: 0, ID: 0 },
    providers: [],
    
    maskText: function(text) {
        let newText = text;
        let modified = false;

        for (const rule of window.ZeroTrust.PII_REGEXES) {
            const configKey = `pii_${rule.type.toLowerCase()}`;
            if (window.ZeroTrust.config[configKey] === false) continue; // Skip disabled PII types

            newText = newText.replace(rule.regex, (match) => {
                let existingToken = Object.keys(window.ZeroTrust.piiMap).find(key => window.ZeroTrust.piiMap[key] === match);
                if (existingToken) return existingToken;

                window.ZeroTrust.piiCounters[rule.type]++;
                const token = `[${rule.type}_${window.ZeroTrust.piiCounters[rule.type]}]`;
                window.ZeroTrust.piiMap[token] = match;
                modified = true;
                return token;
            });
        }

        if (modified) {
            window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapUpdate', { detail: JSON.stringify(window.ZeroTrust.piiMap) }));
        }

        return newText;
    },

    unmaskString: function(text) {
        let unmaskedText = text;
        if (typeof unmaskedText === 'string') {
            for (const [token, realValue] of Object.entries(window.ZeroTrust.piiMap)) {
                if (unmaskedText.includes(token)) {
                    unmaskedText = unmaskedText.replaceAll(token, realValue);
                }
            }
        }
        return unmaskedText;
    }
};

window.addEventListener('ZeroTrustBouncer_InitLogger', (e) => {
    try {
        const data = JSON.parse(e.detail);
        if (data.prefix) {
            window.ZeroTrust.logPrefix = data.prefix;
        }
    } catch (err) {}
});

// Listen for live config updates from the options UI
window.addEventListener('ZeroTrustBouncer_ConfigUpdate', (e) => {
    try {
        const updates = JSON.parse(e.detail);
        Object.assign(window.ZeroTrust.config, updates);
        window.ZeroTrust.log("Engine Config Updated:", window.ZeroTrust.config);
    } catch (err) {}
});

if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        const unmaskedText = window.ZeroTrust.unmaskString(text);
        window.ZeroTrust.log("Unmasked text for clipboard.writeText!");
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
                            let unmaskedText = window.ZeroTrust.unmaskString(text);
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
            window.ZeroTrust.log("Unmasked text for clipboard.write!");
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
            const unmaskedValue = window.ZeroTrust.unmaskString(originalValue);
            if (unmaskedValue !== originalValue) {
                activeElement.value = unmaskedValue;
                activeElement.select();
                window.ZeroTrust.log("Unmasked text for execCommand('copy')!");
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
            const unmaskedData = window.ZeroTrust.unmaskString(data);
            if (unmaskedData !== data) {
                window.ZeroTrust.log("Unmasked text for clipboardData.setData!");
            }
            return Reflect.apply(originalSetData, this, [format, unmaskedData]);
        }
        return Reflect.apply(originalSetData, this, [format, data]);
    };
}, true);
