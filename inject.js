console.log("ZeroTrust Bouncer POC: inject.js loaded (Main World)");

const originalFetch = window.fetch;

window.fetch = async function(...args) {
    const resource = args[0];
    const options = args[1];

    // Check if this is the ChatGPT conversation endpoint
    if (typeof resource === 'string' && resource.includes('/backend-api/conversation')) {
        console.log("ZeroTrust Bouncer: Intercepted outgoing conversation request!");
        
        if (options && options.body) {
            try {
                // ChatGPT usually sends a JSON string
                if (typeof options.body === 'string') {
                    const parsedBody = JSON.parse(options.body);
                    console.log("ZeroTrust Bouncer: Outgoing payload intercepted:", parsedBody);
                    // For Step 3, we are just observing, not modifying yet.
                }
            } catch (e) {
                console.error("ZeroTrust Bouncer: Failed to parse outgoing body", e);
            }
        }
    }

    // Pass everything through normally
    return originalFetch.apply(this, args);
};
