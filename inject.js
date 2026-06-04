console.log("ZeroTrust Bouncer POC v0.1.3: inject.js loaded (Main World)");

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

    const options = args[1];

    if (urlString.includes('conversation')) {
        console.log("ZeroTrust Bouncer v0.1.3: Intercepted FETCH conversation request!");
        try {
            let bodyData = null;
            if (options && options.body) {
                bodyData = options.body;
            } else if (args[0] instanceof Request) {
                console.log("ZeroTrust Bouncer v0.1.3: Payload is inside Request object");
            }

            if (typeof bodyData === 'string') {
                console.log("ZeroTrust Bouncer v0.1.3: Fetch Payload:", JSON.parse(bodyData));
            }
        } catch(e) {
            console.error("ZeroTrust Bouncer v0.1.3: Error parsing payload", e);
        }
    }
    
    // Use Reflect.apply for maximum safety
    return Reflect.apply(originalFetch, window, args);
};
