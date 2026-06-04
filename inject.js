console.log("ZeroTrust Bouncer POC: inject.js loaded (Main World)");

const originalFetch = window.fetch;

window.fetch = async function(...args) {
    let url = "";
    try {
        // Handle both string URLs and Request objects
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

    try {
        // This is what we did before. We expect this to throw a synchronous 
        // TypeError: Illegal invocation because the 'this' context is lost.
        return originalFetch.apply(this, args);
    } catch (e) {
        // PROVE IT: We catch the exact error and print it so you can see it in red.
        console.error("ZeroTrust Bouncer CAUGHT the exact error that broke the page:", e.message);
        console.warn("ZeroTrust Bouncer applying the fix (re-binding fetch to window)...");
        
        // THE FIX: explicitly bind the fetch call back to the 'window' object
        return originalFetch.apply(window, args);
    }
};
