console.log("ZeroTrust Bouncer POC v0.1.5: content.js loaded");

// Inject the fetch interceptor (Phase 1: Masking)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// PHASE 2: UNMASKING ENGINE (DOM Observer)
const unmaskTarget = "[EMAIL_1]";
const unmaskValue = "test@test.com";

function unmaskNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.includes(unmaskTarget)) {
            node.nodeValue = node.nodeValue.replaceAll(unmaskTarget, unmaskValue);
            console.log("ZeroTrust Bouncer v0.1.5: Unmasked PII on screen!");
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
            if (mutation.target.nodeValue.includes(unmaskTarget)) {
                mutation.target.nodeValue = mutation.target.nodeValue.replaceAll(unmaskTarget, unmaskValue);
                console.log("ZeroTrust Bouncer v0.1.5: Unmasked PII on screen (text mutation)!");
            }
        }
    }
});

// We need to wait for the body to exist before observing
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
