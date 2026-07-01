window.Spiimask = window.Spiimask || {};
window.Spiimask.providers = window.Spiimask.providers || [];

window.Spiimask.providers.push({
    name: "Gemini",
    shouldIntercept: (url) => url.includes('batchexecute') || url.includes('StreamGenerate'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        
        if (body.startsWith('f.req=') || (body.includes('=') && body.includes('&'))) {
            try {
                const urlParams = new URLSearchParams(body);
                let modified = false;
                for (const [key, value] of urlParams.entries()) {
                    const maskedValue = window.Spiimask.maskText(value);
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
                console.error(window.Spiimask.logPrefix || "[Spiimask]", "URL decode failed", e);
            }
        }
        
        return window.Spiimask.maskText(body);
    }
});
