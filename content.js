const manifest = chrome.runtime.getManifest();
const ztPrefix = `[${manifest.name} v${manifest.version}]`;
const ztLog = (...args) => console.log(ztPrefix, ...args);

ztLog("Engine Started. Built by Matti B.");

window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_InitLogger', { 
    detail: JSON.stringify({ prefix: ztPrefix }) 
}));

const defaultSettings = {
    pii_email: true, pii_phone: true, pii_id: true,
    provider_chatgpt: true, provider_claude: true, provider_gemini: true
};

chrome.storage.local.get(defaultSettings, (settings) => {
    // Send initial config to core engine
    window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_ConfigUpdate', {
        detail: JSON.stringify(settings)
    }));
    injectFloatingWidget(settings);
});

// Listen for live changes in other tabs or the UI
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        const updates = {};
        for (let [key, { newValue }] of Object.entries(changes)) {
            updates[key] = newValue;
        }
        window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_ConfigUpdate', {
            detail: JSON.stringify(updates)
        }));
    }
});

let piiMap = {};

window.addEventListener('ZeroTrustBouncer_MapUpdate', (e) => {
    try {
        piiMap = JSON.parse(e.detail);
        ztLog("Received updated PII map!", piiMap);
        unmaskNode(document.body);
    } catch (err) {
        console.error(ztPrefix, "Error parsing map", err);
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
                ztLog(`Unmasked ${token} on screen!`);
            } else {
                const bareToken = token.slice(1, -1);
                if (text.includes(bareToken)) {
                    text = text.replaceAll(bareToken, realValue);
                    modified = true;
                    ztLog(`Unmasked bare ${bareToken} on screen!`);
                }
            }
        }
        
        if (modified) {
            node.nodeValue = text;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.shadowRoot) {
            if (!node.shadowRoot.__ztbObserved) {
                try {
                    observer.observe(node.shadowRoot, { childList: true, characterData: true, subtree: true });
                    node.shadowRoot.__ztbObserved = true;
                } catch(e) {}
            }
            unmaskNode(node.shadowRoot);
        }
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
            for (let child of node.childNodes) {
                unmaskNode(child);
            }
        }
    } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        for (let child of node.childNodes) {
            unmaskNode(child);
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
                    ztLog(`Unmasked ${token} on screen (text mutation)!`);
                } else {
                    const bareToken = token.slice(1, -1);
                    if (text.includes(bareToken)) {
                        text = text.replaceAll(bareToken, realValue);
                        modified = true;
                        ztLog(`Unmasked bare ${bareToken} on screen (text mutation)!`);
                    }
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

function injectFloatingWidget(initialSettings) {
    if (document.getElementById('zerotrust-bouncer-widget-container')) return;

    const container = document.createElement('div');
    container.id = 'zerotrust-bouncer-widget-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .widget-wrapper { position: relative; pointer-events: auto; display: flex; flex-direction: column; align-items: flex-end; }
        .shield-button { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease, box-shadow 0.2s ease; z-index: 10; }
        .shield-button:hover { transform: scale(1.05); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .shield-icon { width: 22px; height: 22px; fill: white; }
        .panel { position: absolute; top: 54px; right: 0; width: 220px; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
        .widget-wrapper:hover .panel { opacity: 1; visibility: visible; transform: translateY(0); }
        .panel-header { background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; }
        .panel-title { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
        .panel-version { margin: 0; font-size: 12px; color: #6b7280; margin-top: 2px; }
        .panel-body { padding: 8px; }
        .panel-btn { display: block; width: 100%; text-align: left; padding: 10px 12px; margin: 2px 0; background: none; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
        .panel-btn:hover { background: #f3f4f6; color: #111827; }
        .panel-btn svg { width: 16px; height: 16px; margin-right: 10px; vertical-align: text-bottom; fill: currentColor; opacity: 0.7; }
        
        /* Toggle Switch CSS */
        .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 2px; }
        .toggle-label { font-size: 13px; font-weight: 500; color: #374151; }
        .switch { position: relative; display: inline-block; width: 34px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #d1d5db; transition: .3s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(14px); }
        .section-title { font-size: 11px; text-transform: uppercase; color: #9ca3af; margin: 12px 12px 4px 12px; letter-spacing: 0.5px; font-weight: 600;}
        
        #view-options { display: none; }
        .btn-back { background: none; border: none; cursor: pointer; padding: 0; margin-right: 8px; display: flex; align-items: center; color: #6b7280; }
        .btn-back:hover { color: #111827; }
        .btn-back svg { width: 18px; height: 18px; fill: currentColor; }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';

    const button = document.createElement('div');
    button.className = 'shield-button';
    button.innerHTML = '<svg class="shield-icon" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>';

    const panel = document.createElement('div');
    panel.className = 'panel';
    const m = chrome.runtime.getManifest();
    
    panel.innerHTML = `
        <div id="view-main">
            <div class="panel-header" style="flex-direction: column; align-items: flex-start;">
                <h3 class="panel-title">${m.name}</h3>
                <p class="panel-version">v${m.version}</p>
            </div>
            <div class="panel-body">
                <button class="panel-btn" id="btn-info"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>More Info</button>
                <button class="panel-btn" id="btn-issue"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>Report Issue</button>
                <button class="panel-btn" id="btn-options"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>Options</button>
            </div>
        </div>
        <div id="view-options">
            <div class="panel-header">
                <button class="btn-back" id="btn-back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">Settings</h3>
            </div>
            <div class="panel-body" style="padding: 0 0 8px 0;">
                <div class="section-title">Providers</div>
                <div class="toggle-row"><span class="toggle-label">ChatGPT</span><label class="switch"><input type="checkbox" id="tgl-provider_chatgpt" ${initialSettings.provider_chatgpt ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Claude</span><label class="switch"><input type="checkbox" id="tgl-provider_claude" ${initialSettings.provider_claude ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Gemini</span><label class="switch"><input type="checkbox" id="tgl-provider_gemini" ${initialSettings.provider_gemini ? 'checked' : ''}><span class="slider"></span></label></div>
                
                <div class="section-title">PII Types</div>
                <div class="toggle-row"><span class="toggle-label">Emails</span><label class="switch"><input type="checkbox" id="tgl-pii_email" ${initialSettings.pii_email ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Phone Numbers</span><label class="switch"><input type="checkbox" id="tgl-pii_phone" ${initialSettings.pii_phone ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">ID Numbers</span><label class="switch"><input type="checkbox" id="tgl-pii_id" ${initialSettings.pii_id ? 'checked' : ''}><span class="slider"></span></label></div>
            </div>
        </div>
    `;

    wrapper.appendChild(button);
    wrapper.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    document.body.appendChild(container);

    // Navigation Listeners
    const viewMain = panel.querySelector('#view-main');
    const viewOptions = panel.querySelector('#view-options');
    
    panel.querySelector('#btn-options').addEventListener('click', (e) => {
        console.log("[ZeroTrust] Options clicked");
        viewMain.style.display = 'none';
        viewOptions.style.display = 'block';
    });
    
    panel.querySelector('#btn-back').addEventListener('click', (e) => {
        console.log("[ZeroTrust] Back clicked");
        viewOptions.style.display = 'none';
        viewMain.style.display = 'block';
    });

    panel.querySelector('#btn-issue').addEventListener('click', () => {
        window.open('mailto:mattiba@gmail.com?subject=ZeroTrust%20Bouncer%20Feedback');
    });

    panel.querySelector('#btn-info').addEventListener('click', () => {
        window.open('https://github.com/mattib/zerotrust-bouncer', '_blank');
    });

    // Toggle Listeners
    const toggleIds = ['provider_chatgpt', 'provider_claude', 'provider_gemini', 'pii_email', 'pii_phone', 'pii_id'];
    toggleIds.forEach(id => {
        const tgl = panel.querySelector('#tgl-' + id);
        if (tgl) {
            tgl.addEventListener('change', (e) => {
                const update = {};
                update[id] = e.target.checked;
                chrome.storage.local.set(update);
                console.log(`[ZeroTrust] Toggled ${id}: ${e.target.checked}`);
            });
        }
    });

    // Dragging Logic
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = container.getBoundingClientRect();
        
        // Convert fixed 'right' positioning to 'left' so dragging logic is strictly localized
        if (!container.style.left || container.style.left === 'auto') {
            container.style.left = rect.left + 'px';
            container.style.right = 'auto';
        }
        
        initialLeft = parseInt(container.style.left || 0, 10);
        initialTop = parseInt(container.style.top || 0, 10);
        
        button.style.cursor = 'grabbing';
        e.preventDefault(); // Prevent text selection while dragging
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        
        container.style.left = `${initialLeft + dx}px`;
        container.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            button.style.cursor = 'pointer';
        }
    });
}

startObserver();
