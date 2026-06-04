console.log("ZeroTrust Bouncer POC v0.1.4: content.js loaded");

const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);
