window.Spiimask = window.Spiimask || {};
window.Spiimask.providers = window.Spiimask.providers || [];

window.Spiimask.providers.push({
    name: "Claude",
    shouldIntercept: (url) => url.includes('chat_conversations') || url.includes('completion'),
    processPayload: (body) => {
        if (typeof body !== 'string') return body;
        return window.Spiimask.maskText(body);
    }
});
