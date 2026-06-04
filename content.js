console.log("ZeroTrust Bouncer POC: content.js loaded");

// Inject inject.js into the main page context to override window.fetch
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove(); // Clean up after execution
};
(document.head || document.documentElement).appendChild(script);
