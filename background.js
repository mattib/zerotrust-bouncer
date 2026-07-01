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
chrome.runtime.onInstalled.addListener(() => {
    fetchBranding();
});

// Fetch when the browser starts
chrome.runtime.onStartup.addListener(() => {
    fetchBranding();
});
