window.Spiimask = window.Spiimask || {};
window.Spiimask.providers = window.Spiimask.providers || [];

window.Spiimask.providers.push({
    name: "ChatGPT",
    shouldIntercept: (url) => url.includes('conversation'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        return window.Spiimask.maskText(body);
    }
});
