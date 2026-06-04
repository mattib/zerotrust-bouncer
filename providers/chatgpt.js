window.ZeroTrust = window.ZeroTrust || {};
window.ZeroTrust.providers = window.ZeroTrust.providers || [];

window.ZeroTrust.providers.push({
    name: "ChatGPT",
    shouldIntercept: (url) => url.includes('conversation'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        return window.ZeroTrust.maskText(body);
    }
});
