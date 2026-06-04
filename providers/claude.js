window.ZeroTrust = window.ZeroTrust || {};
window.ZeroTrust.providers = window.ZeroTrust.providers || [];

window.ZeroTrust.providers.push({
    name: "Claude",
    shouldIntercept: (url) => url.includes('chat_conversations') || url.includes('completion'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        return window.ZeroTrust.maskText(body);
    }
});
