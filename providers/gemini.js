window.ZeroTrust = window.ZeroTrust || {};
window.ZeroTrust.providers = window.ZeroTrust.providers || [];

window.ZeroTrust.providers.push({
    name: "Gemini",
    shouldIntercept: (url) => url.includes('batchexecute') || url.includes('StreamGenerate'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        
        if (body.startsWith('f.req=') || (body.includes('=') && body.includes('&'))) {
            try {
                const urlParams = new URLSearchParams(body);
                let modified = false;
                for (const [key, value] of urlParams.entries()) {
                    const maskedValue = window.ZeroTrust.maskText(value);
                    if (maskedValue !== value) {
                        urlParams.set(key, maskedValue);
                        modified = true;
                    }
                }
                if (modified) {
                    return urlParams.toString().replace(/\+/g, '%20');
                }
                return body;
            } catch (e) {
                console.error(window.ZeroTrust.logPrefix || "[ZeroTrust Bouncer]", "URL decode failed", e);
            }
        }
        
        return window.ZeroTrust.maskText(body);
    }
});
