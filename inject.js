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

    const provider = window.ZeroTrust.providers.find(p => p.shouldIntercept(urlString));

    if (provider) {
        window.ZeroTrust.log(`Intercepted FETCH request for ${provider.name} -> ${urlString}`);
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
                const maskedText = provider.processPayload(bodyText);
                
                if (maskedText !== bodyText) {
                    window.ZeroTrust.log(`PII DETECTED! Masking payload for ${provider.name}...`);
                    if (isRequestObj) {
                        args[0] = new Request(args[0], { body: maskedText });
                    } else {
                        args[1].body = maskedText;
                    }
                    window.ZeroTrust.log(`Payload Masked Successfully! Forwarding...`);
                }
            }
        } catch(e) {
            console.error(window.ZeroTrust.logPrefix, "Error during masking", e);
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
            const provider = window.ZeroTrust.providers.find(p => p.shouldIntercept(urlString));
            if (provider) {
                window.ZeroTrust.log(`Intercepted XHR request for ${provider.name} -> ${urlString}`);
                const maskedText = provider.processPayload(body);
                if (maskedText !== body) {
                    window.ZeroTrust.log(`PII DETECTED in XHR! Masking payload for ${provider.name}...`);
                    body = maskedText;
                }
            }
        }
    } catch(e) {
        console.error(window.ZeroTrust.logPrefix, "Error during XHR masking", e);
    }
    return Reflect.apply(originalXHRSend, this, [body]);
};
