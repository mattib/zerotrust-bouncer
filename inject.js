console.log("ZeroTrust Bouncer POC v0.1.5: inject.js loaded (Main World)");

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

    if (urlString.includes('conversation')) {
        console.log("ZeroTrust Bouncer v0.1.5: Intercepted FETCH conversation request!");
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
                if (bodyText.includes("test@test.com")) {
                    console.log("ZeroTrust Bouncer v0.1.5: PII DETECTED (test@test.com)! Masking...");
                    const maskedText = bodyText.replace(/test@test\.com/g, "[EMAIL_1]");
                    
                    if (isRequestObj) {
                        args[0] = new Request(args[0], { body: maskedText });
                    } else {
                        args[1].body = maskedText;
                    }
                    console.log("ZeroTrust Bouncer v0.1.5: Payload Masked Successfully! Forwarding to OpenAI...");
                }
            }
        } catch(e) {
            console.error("ZeroTrust Bouncer v0.1.5: Error during masking", e);
        }
    }
    
    return Reflect.apply(originalFetch, window, args);
};
