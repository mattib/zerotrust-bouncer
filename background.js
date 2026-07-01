const BRAND_JSON_URL = "https://spiimask.com/api/brand.json"; // Placeholder URL for dynamic config

async function fetchBranding() {
    try {
        // Enforce GET request strictly.
        const response = await fetch(BRAND_JSON_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const brandData = await response.json();
        
        // Push the fetched config into isolated local storage.
        // Content scripts will read from here, preventing them from needing network access.
        await chrome.storage.local.set({ spiimask_brand: brandData });
        console.log("Spiimask branding updated from remote:", brandData.name);
    } catch (e) {
        console.error("Failed to fetch Spiimask branding:", e);
    }
}

// Fetch on install/update
chrome.runtime.onInstalled.addListener((details) => {
    fetchBranding();
    
    // Open onboarding page on fresh install
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'https://spiimask.com/onboarding' });
    }
});

// Fetch when the browser starts
chrome.runtime.onStartup.addListener(() => {
    fetchBranding();
});

// ---------------------------------------------------------------------------
// Toolbar Shield State (Green/Red)
// ---------------------------------------------------------------------------
importScripts('config.js');
const supportedDomains = SpiimaskConfig.supportedDomains;

function updateIconState(tabId, url) {
    if (!url) return;
    const isSupported = supportedDomains.some(domain => url.includes(domain));
    
    if (isSupported) {
        chrome.action.setIcon({ path: { 16: "assets/icon-active-16.png", 32: "assets/icon-active-32.png", 48: "assets/icon-active-48.png", 128: "assets/icon-active-128.png" }, tabId: tabId });
        chrome.action.setBadgeText({ text: "ON", tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId: tabId });
        chrome.action.setTitle({ title: "Spiimask is Active", tabId: tabId });
    } else {
        chrome.action.setIcon({ path: { 16: "assets/icon-inactive-16.png", 32: "assets/icon-inactive-32.png", 48: "assets/icon-inactive-48.png", 128: "assets/icon-inactive-128.png" }, tabId: tabId });
        chrome.action.setBadgeText({ text: "", tabId: tabId });
        chrome.action.setTitle({ title: "Spiimask is Inactive", tabId: tabId });
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url) updateIconState(tabId, tab.url);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) return;
        if (tab && tab.url) updateIconState(tab.id, tab.url);
    });
});
