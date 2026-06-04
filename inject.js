console.log("ZeroTrust Bouncer POC v0.1.2: inject.js loaded (Main World)");

// 1. Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = function(...args) {
    try {
        const url = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof url === 'string' && url.includes('/backend-api/conversation')) {
            console.log("ZeroTrust Bouncer v0.1.2: Intercepted FETCH conversation request!");
            if (args[1] && typeof args[1].body === 'string') {
                console.log("Fetch Payload:", JSON.parse(args[1].body));
            }
        }
    } catch(e) {}
    
    // Pass to native fetch, ensuring window context
    return originalFetch.apply(window, args);
};

// 2. WebSocket Interceptor
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);
    
    const originalSend = ws.send;
    ws.send = function(data) {
        try {
            if (typeof url === 'string' && url.includes('chatgpt.com')) {
                console.log("ZeroTrust Bouncer v0.1.2: Intercepted WEBSOCKET send!");
                if (typeof data === 'string') {
                    console.log("WS Payload (string):", JSON.parse(data));
                } else {
                    console.log("WS Payload (binary):", data);
                }
            }
        } catch(e) {}
        
        return originalSend.apply(this, arguments);
    };
    
    return ws;
};
window.WebSocket.prototype = OriginalWebSocket.prototype;
