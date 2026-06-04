console.log("ZeroTrust Bouncer POC v0.2.0: content.js loaded");

// Inject the fetch interceptor
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// PHASE 2: DYNAMIC UNMASKING ENGINE (DOM Observer)
let piiMap = {};

// Listen for updates from the Masker (inject.js)
window.addEventListener('ZeroTrustBouncer_MapUpdate', (e) => {
    try {
        piiMap = JSON.parse(e.detail);
        console.log("ZeroTrust Bouncer v0.2.0: Received updated PII map!", piiMap);
        unmaskNode(document.body);
    } catch (err) {
        console.error("ZeroTrust Bouncer v0.2.0: Error parsing map", err);
    }
});

function unmaskNode(node) {
    if (Object.keys(piiMap).length === 0) return;

    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.nodeValue;
        let modified = false;
        
        for (const [token, realValue] of Object.entries(piiMap)) {
            if (text.includes(token)) {
                text = text.replaceAll(token, realValue);
                modified = true;
                console.log(`ZeroTrust Bouncer v0.2.0: Unmasked ${token} on screen!`);
            }
        }
        
        if (modified) {
            node.nodeValue = text;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
            for (let child of node.childNodes) {
                unmaskNode(child);
            }
        }
    }
}

const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.type === 'childList') {
            for (let node of mutation.addedNodes) {
                unmaskNode(node);
            }
        } else if (mutation.type === 'characterData') {
            let text = mutation.target.nodeValue;
            let modified = false;
            
            for (const [token, realValue] of Object.entries(piiMap)) {
                if (text.includes(token)) {
                    text = text.replaceAll(token, realValue);
                    modified = true;
                    console.log(`ZeroTrust Bouncer v0.2.0: Unmasked ${token} on screen (text mutation)!`);
                }
            }
            
            if (modified) {
                mutation.target.nodeValue = text;
            }
        }
    }
});

const startObserver = () => {
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });
        unmaskNode(document.body);
    } else {
        setTimeout(startObserver, 50);
    }
};

startObserver();
