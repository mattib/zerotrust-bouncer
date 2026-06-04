console.log("ZeroTrust Bouncer POC v0.1.2: content.js loaded");

// Inject inject.js into the main page context to override window.fetch and WebSocket
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove(); // Clean up after execution
};
(document.head || document.documentElement).appendChild(script);
