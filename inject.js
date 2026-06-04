console.log("ZeroTrust Bouncer POC: inject.js loaded (Main World)");

const originalFetch = window.fetch;

window.fetch = async function(...args) {
    let url = "";
    try {
        url = args[0] instanceof Request ? args[0].url : args[0];
    } catch (e) {}

    const options = args[1];

    if (typeof url === 'string' && url.includes('/backend-api/conversation')) {
        console.log("ZeroTrust Bouncer: Intercepted outgoing conversation request!");
        
        if (options && options.body) {
            try {
                if (typeof options.body === 'string') {
                    const parsedBody = JSON.parse(options.body);
                    console.log("ZeroTrust Bouncer: Outgoing payload intercepted:", parsedBody);
                }
            } catch (e) {
                console.error("ZeroTrust Bouncer: Failed to parse outgoing body", e);
            }
        }
    }

    // Pass everything through normally, MUST be bound to window!
    return originalFetch.apply(window, args);
};
