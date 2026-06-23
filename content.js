const manifest = chrome.runtime.getManifest();
const ztPrefix = `[${manifest.name} v${manifest.version}]`;
const ztLog = (...args) => console.log(ztPrefix, ...args);

ztLog("Engine Started. Built by Matti B.");

window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_InitLogger', { 
    detail: JSON.stringify({ prefix: ztPrefix }) 
}));

const defaultSettings = {
    // Providers
    provider_chatgpt: true, provider_claude: true, provider_gemini: true,
    // PII types
    pii_email: true, pii_phone: true, pii_id: true,
    pii_phone_il_landline: true, pii_phone_intl: true,
    pii_passport_il: true, pii_company_il: true, pii_vat_il: true,
    pii_ssn_us: true, pii_ni_uk: true, pii_plate_il: true, pii_credit_card: true,
    pii_iban: true, pii_swift_bic: true, pii_eth_wallet: true,
    pii_ipv4: true, pii_ipv6: true, pii_mac: true, pii_url_creds: true,
    // Custom user-defined patterns
    custom_patterns: [],
    // API Keys — master toggle + per-service
    pii_api_key: true,
    api_key_anthropic: true, api_key_openai: true, api_key_aws: true,
    api_key_github_pat: true, api_key_github_oauth: true, api_key_github_app: true, api_key_github_fine: true,
    api_key_google: true, api_key_slack_bot: true, api_key_slack_user: true,
    api_key_stripe: true, api_key_sendgrid: true, api_key_twilio: true, api_key_mailgun: true,
    api_key_shopify: true, api_key_square: true,
    api_key_digitalocean: true, api_key_do_spaces: true, api_key_do_registry: true,
    api_key_newrelic: true, api_key_grafana: true, api_key_jwt: true, api_key_private_key: true,
    api_key_alibaba: true, api_key_artifactory: true, api_key_atlassian: true, api_key_atlassian_pat: true,
    api_key_datadog: true, api_key_dropbox: true, api_key_duffel: true, api_key_dynatrace: true,
    api_key_easypost: true, api_key_facebook: true, api_key_flutterwave: true, api_key_fio: true,
    api_key_heroku: true, api_key_hubspot: true, api_key_linear: true, api_key_netlify: true,
    api_key_notion: true, api_key_npm: true, api_key_opsgenie: true, api_key_planetscale: true,
    api_key_postman: true, api_key_prefect: true, api_key_pulumi: true, api_key_rubygems: true,
    api_key_scalingo: true, api_key_segment: true, api_key_snyk: true, api_key_supabase: true,
    api_key_telegram_bot: true, api_key_vercel: true, api_key_bearer: true
};

// ---------------------------------------------------------------------------
// Map persistence state (module-level — populated before widget creation)
// ---------------------------------------------------------------------------
let currentMapOrder = [];   // insertion-order array of token keys (for FIFO eviction)
let currentMapMax   = 1000; // max entries; oldest evicted when exceeded
let _updateMapCount = () => {}; // set by injectFloatingWidget once panel exists

// Derive piiCounters from a map — parse [TYPE_N] tokens to find max N per type
function derivedCounters(map) {
    const counters = {};
    for (const token of Object.keys(map)) {
        const m = token.match(/^\[(.+)_(\d+)\]$/);
        if (m) {
            const type = m[1], n = parseInt(m[2]);
            if (!counters[type] || n > counters[type]) counters[type] = n;
        }
    }
    return counters;
}

chrome.storage.local.get(defaultSettings, (settings) => {
    // Send initial config to core engine
    window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_ConfigUpdate', {
        detail: JSON.stringify(settings)
    }));

    // Load persisted PII map before creating widget (so count display is correct)
    chrome.storage.local.get({ pii_map: {}, pii_counters: {}, pii_map_order: [], pii_map_max: 1000 }, (stored) => {
        piiMap          = stored.pii_map       || {};
        currentMapOrder = stored.pii_map_order || [];
        currentMapMax   = stored.pii_map_max   || 1000;

        if (Object.keys(piiMap).length > 0) {
            window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapRestore', {
                detail: JSON.stringify({ piiMap: stored.pii_map, piiCounters: stored.pii_counters || {} })
            }));
        }

        injectFloatingWidget(settings);
    });
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
        const newMap = JSON.parse(e.detail);
        piiMap = newMap;
        unmaskNode(document.body);

        // Track new entries (keys not yet in order array)
        const known = new Set(currentMapOrder);
        Object.keys(newMap).forEach(k => { if (!known.has(k)) currentMapOrder.push(k); });

        // FIFO eviction — remove oldest entries until under limit
        let evicted = false;
        while (currentMapOrder.length > currentMapMax) {
            delete newMap[currentMapOrder.shift()];
            evicted = true;
        }
        // If we trimmed, hand the trimmed map back to the engine so both copies match (no refresh).
        if (evicted) {
            window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapSync', { detail: JSON.stringify(newMap) }));
        }

        // Persist
        const counters = derivedCounters(newMap);
        chrome.storage.local.set({ pii_map: newMap, pii_map_order: currentMapOrder, pii_counters: counters });
        _updateMapCount();
        
        // Trigger pulse animation on the shield widget
        const container = document.getElementById('zerotrust-bouncer-widget-container');
        if (container && container.shadowRoot) {
            const btn = container.shadowRoot.querySelector('.shield-button');
            if (btn) {
                btn.classList.add('active');
                if (btn._pulseTimeout) clearTimeout(btn._pulseTimeout);
                btn._pulseTimeout = setTimeout(() => btn.classList.remove('active'), 1500);
            }
        }
    } catch (err) {
        console.error(ztPrefix, "Error handling MapUpdate", err);
    }
});

// Update the shield badge with the number of items masked in the last sent message.
window.addEventListener('ZeroTrustBouncer_MaskedCount', (e) => {
    try {
        const count = parseInt(e.detail) || 0;
        const container = document.getElementById('zerotrust-bouncer-widget-container');
        if (!container || !container.shadowRoot) return;
        const badge = container.shadowRoot.querySelector('#zt-mask-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (err) {}
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
    container.style.top = '90px';
    container.style.right = '20px';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .widget-wrapper { position: relative; pointer-events: auto; display: flex; flex-direction: column; align-items: flex-end; }
        
        @keyframes shield-pulse {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        .shield-button { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease; z-index: 10; border: 1px solid rgba(255,255,255,0.1); position: relative; }
        .shield-button:hover { transform: scale(1.08); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .shield-button.active { animation: shield-pulse 1.5s infinite; }
        .shield-badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 9px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); display: none; pointer-events: none; }
        .shield-icon { width: 22px; height: 22px; fill: white; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2)); }
        
        .panel { position: absolute; top: 54px; right: 0; width: 220px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 12px; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.4) inset; border: 1px solid rgba(229, 231, 235, 0.5); opacity: 0; visibility: hidden; transform: translateY(-10px) scale(0.98); transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); overflow: hidden; transform-origin: top right; }
        .widget-wrapper.open .panel { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
        
        .panel-header { background: rgba(249, 250, 251, 0.5); padding: 12px 16px; border-bottom: 1px solid rgba(229, 231, 235, 0.5); display: flex; align-items: center; }
        .panel-title { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
        .panel-version { margin: 0; font-size: 12px; color: #6b7280; margin-top: 2px; }
        .panel-body { padding: 8px; }
        .panel-btn { display: block; width: 100%; text-align: left; padding: 10px 12px; margin: 2px 0; background: none; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.2s ease; }
        .panel-btn:hover { background: rgba(0, 0, 0, 0.04); color: #111827; transform: translateX(2px); }
        .panel-btn svg { width: 16px; height: 16px; margin-right: 10px; vertical-align: text-bottom; fill: currentColor; opacity: 0.7; }
        
        /* Toggle Switch CSS */
        .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 2px; border-radius: 8px; transition: background 0.2s ease; }
        .toggle-row:hover { background: rgba(0, 0, 0, 0.02); }
        .toggle-label { font-size: 13px; font-weight: 500; color: #374151; }
        .switch { position: relative; display: inline-block; width: 34px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #d1d5db; transition: .3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 20px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(14px); }
        .section-title { font-size: 11px; text-transform: uppercase; color: #9ca3af; margin: 12px 12px 4px 12px; letter-spacing: 0.8px; font-weight: 700;}
        
        #view-options { display: none; }
        #view-pii { display: none; }
        #view-api-keys { display: none; }
        #view-providers { display: none; }
        .btn-back { background: none; border: none; cursor: pointer; padding: 0; margin-right: 8px; display: flex; align-items: center; color: #6b7280; transition: color 0.2s; }
        .btn-back:hover { color: #111827; }
        .btn-back svg { width: 18px; height: 18px; fill: currentColor; }
        .sub-panel-body { max-height: 320px; overflow-y: auto; padding: 0 0 8px 0; }
        /* Scrollbar styles */
        .sub-panel-body::-webkit-scrollbar { width: 4px; }
        .sub-panel-body::-webkit-scrollbar-track { background: transparent; }
        .sub-panel-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .sub-panel-body::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
        
        .customize-row { text-align: right; padding: 0 12px 6px 12px; }
        .customize-link { font-size: 11px; color: #10b981; cursor: pointer; background: none; border: none; font-family: inherit; padding: 0; font-weight: 600; transition: color 0.2s; }
        .customize-link:hover { text-decoration: underline; color: #059669; }
        #view-custom-patterns { display: none; }
        .custom-form { padding: 8px 12px 10px; border-bottom: 1px solid rgba(229, 231, 235, 0.5); }
        .custom-input { width: 100%; padding: 6px 10px; border: 1px solid rgba(209, 213, 219, 0.8); border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; font-family: inherit; margin-top: 4px; transition: border-color 0.2s, box-shadow 0.2s; background: rgba(255,255,255,0.8); }
        .custom-input:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.1); }
        .custom-input-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        .custom-error { font-size: 11px; color: #ef4444; min-height: 14px; margin-top: 2px; }
        .regex-help { font-size: 11px; color: #9ca3af; text-decoration: none; width: 18px; height: 18px; border: 1px solid rgba(209, 213, 219, 0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .regex-help:hover { color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.05); }
        .custom-add-btn { margin-top: 8px; width: 100%; padding: 8px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s; }
        .custom-add-btn:hover { background: #059669; }
        .custom-empty { padding: 14px 12px; text-align: center; font-size: 12px; color: #9ca3af; }
        .custom-item { padding: 8px 12px; border-top: 1px solid rgba(243, 244, 246, 0.5); }
        .custom-item-header { display: flex; justify-content: space-between; align-items: center; }
        .custom-item-pattern { font-size: 11px; color: #6b7280; font-family: monospace; margin-top: 2px; word-break: break-all; background: rgba(0,0,0,0.03); padding: 2px 4px; border-radius: 4px; }
        .custom-delete { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 13px; padding: 0 4px; line-height: 1; transition: color 0.2s; }
        .custom-delete:hover { color: #ef4444; }
        .map-max-input { width: 58px; padding: 4px 8px; border: 1px solid rgba(209, 213, 219, 0.8); border-radius: 6px; font-size: 12px; text-align: right; font-family: inherit; outline: none; transition: border-color 0.2s; background: rgba(255,255,255,0.8); }
        .map-max-input:focus { border-color: #10b981; }
        .map-warn-box { margin: 4px 12px 6px; padding: 8px 10px; background: rgba(254, 242, 242, 0.8); border: 1px solid rgba(254, 202, 202, 0.8); border-radius: 8px; }
        .map-warn-text { font-size: 11px; color: #dc2626; line-height: 1.4; }
        .map-warn-btns { display: flex; gap: 6px; margin-top: 8px; }
        .btn-warn-cancel  { flex: 1; padding: 6px; background: white; border: 1px solid rgba(209, 213, 219, 0.8); border-radius: 6px; font-size: 11px; cursor: pointer; font-family: inherit; font-weight: 500; transition: background 0.2s; }
        .btn-warn-cancel:hover  { background: #f9fafb; }
        .btn-warn-confirm { flex: 1; padding: 6px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s; }
        .btn-warn-confirm:hover { background: #dc2626; }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .panel { background: rgba(30, 41, 59, 0.85); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset; }
            .panel-header { background: rgba(15, 23, 42, 0.5); border-color: rgba(255, 255, 255, 0.1); }
            .panel-title { color: #f8fafc; }
            .panel-version { color: #94a3b8; }
            .panel-btn { color: #e2e8f0; }
            .panel-btn:hover { background: rgba(255, 255, 255, 0.05); color: #f8fafc; }
            .toggle-row:hover { background: rgba(255, 255, 255, 0.03); }
            .toggle-label { color: #e2e8f0; }
            .slider { background-color: #475569; }
            .btn-back { color: #94a3b8; }
            .btn-back:hover { color: #f8fafc; }
            .custom-form { border-color: rgba(255, 255, 255, 0.1); }
            .custom-input { background: rgba(15, 23, 42, 0.5); border-color: rgba(255, 255, 255, 0.2); color: #f8fafc; }
            .custom-item { border-color: rgba(255, 255, 255, 0.05); }
            .custom-item-pattern { background: rgba(255, 255, 255, 0.1); color: #cbd5e1; }
            .map-max-input { background: rgba(15, 23, 42, 0.5); border-color: rgba(255, 255, 255, 0.2); color: #f8fafc; }
            .map-warn-box { background: rgba(127, 29, 29, 0.2); border-color: rgba(185, 28, 28, 0.5); }
            .map-warn-text { color: #fca5a5; }
            .btn-warn-cancel { background: rgba(30, 41, 59, 0.8); border-color: rgba(255, 255, 255, 0.2); color: #f8fafc; }
            .btn-warn-cancel:hover { background: rgba(51, 65, 85, 0.8); }
            .sub-panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
            .sub-panel-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'widget-wrapper';

    const button = document.createElement('div');
    button.className = 'shield-button';
    button.innerHTML = '<svg class="shield-icon" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg><span class="shield-badge" id="zt-mask-badge"></span>';

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
                <button class="btn-back" id="btn-back-options"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">Settings</h3>
            </div>
            <div class="panel-body" style="padding: 0 0 8px 0;">
                <div class="section-title">PII Types</div>
                <div class="toggle-row"><span class="toggle-label">All PII</span><label class="switch"><input type="checkbox" id="tgl-pii_master" ${['pii_email','pii_phone','pii_id','pii_phone_il_landline','pii_phone_intl','pii_passport_il','pii_company_il','pii_vat_il','pii_ssn_us','pii_ni_uk','pii_plate_il','pii_ipv4','pii_ipv6','pii_mac','pii_url_creds'].every(k => initialSettings[k]) ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="customize-row"><button class="customize-link" id="btn-pii-customize">customize ›</button></div>

                <div class="section-title">API Keys</div>
                <div class="toggle-row"><span class="toggle-label">All API Keys</span><label class="switch"><input type="checkbox" id="tgl-pii_api_key" ${initialSettings.pii_api_key ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="customize-row"><button class="customize-link" id="btn-apikeys-customize">customize ›</button></div>

                <div class="section-title">Providers</div>
                <div class="customize-row"><button class="customize-link" id="btn-providers-customize">customize ›</button></div>

                <div class="section-title">Custom</div>
                <div class="customize-row"><button class="customize-link" id="btn-custom-customize">manage ›</button></div>

                <div class="section-title">Map</div>
                <div class="toggle-row">
                    <span class="toggle-label" id="map-count-label">${currentMapOrder.length} / ${currentMapMax} entries</span>
                    <button class="customize-link" id="btn-clear-map">Clear</button>
                </div>
                <div class="toggle-row" style="margin-top:0; padding-top:4px;">
                    <span class="toggle-label">Max entries</span>
                    <input type="number" class="map-max-input" id="map-max-input" value="${currentMapMax}" min="100">
                </div>
                <div id="map-warn-box" class="map-warn-box" style="display:none;">
                    <div class="map-warn-text">⚠ Tokens already in chat will show as [TOKEN_1] and can't be unmasked.</div>
                    <div class="map-warn-btns">
                        <button class="btn-warn-cancel" id="btn-clear-cancel">Cancel</button>
                        <button class="btn-warn-confirm" id="btn-clear-confirm">Clear anyway</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="view-providers">
            <div class="panel-header">
                <button class="btn-back" id="btn-back-providers"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">Providers</h3>
            </div>
            <div class="sub-panel-body">
                <div class="toggle-row"><span class="toggle-label">ChatGPT</span><label class="switch"><input type="checkbox" id="tgl-provider_chatgpt" ${initialSettings.provider_chatgpt ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Claude</span><label class="switch"><input type="checkbox" id="tgl-provider_claude" ${initialSettings.provider_claude ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Gemini</span><label class="switch"><input type="checkbox" id="tgl-provider_gemini" ${initialSettings.provider_gemini ? 'checked' : ''}><span class="slider"></span></label></div>
            </div>
        </div>

        <div id="view-pii">
            <div class="panel-header">
                <button class="btn-back" id="btn-back-pii"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">PII Types</h3>
            </div>
            <div class="sub-panel-body">
                <div class="section-title">Phones</div>
                <div class="toggle-row"><span class="toggle-label">Israeli Mobile (05X)</span><label class="switch"><input type="checkbox" id="tgl-pii_phone" ${initialSettings.pii_phone ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">IL Landline (0X-XXXXXXX)</span><label class="switch"><input type="checkbox" id="tgl-pii_phone_il_landline" ${initialSettings.pii_phone_il_landline ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">International (+CC…)</span><label class="switch"><input type="checkbox" id="tgl-pii_phone_intl" ${initialSettings.pii_phone_intl ? 'checked' : ''}><span class="slider"></span></label></div>

                <div class="section-title">Identity</div>
                <div class="toggle-row"><span class="toggle-label">Emails</span><label class="switch"><input type="checkbox" id="tgl-pii_email" ${initialSettings.pii_email ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Israeli ID (ת"ז)</span><label class="switch"><input type="checkbox" id="tgl-pii_id" ${initialSettings.pii_id ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Israeli Passport</span><label class="switch"><input type="checkbox" id="tgl-pii_passport_il" ${initialSettings.pii_passport_il ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Company Reg. (ח"פ)</span><label class="switch"><input type="checkbox" id="tgl-pii_company_il" ${initialSettings.pii_company_il ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">VAT / עוסק מורשה</span><label class="switch"><input type="checkbox" id="tgl-pii_vat_il" ${initialSettings.pii_vat_il ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">US SSN</span><label class="switch"><input type="checkbox" id="tgl-pii_ssn_us" ${initialSettings.pii_ssn_us ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">UK NI Number</span><label class="switch"><input type="checkbox" id="tgl-pii_ni_uk" ${initialSettings.pii_ni_uk ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">IL Vehicle Plate</span><label class="switch"><input type="checkbox" id="tgl-pii_plate_il" ${initialSettings.pii_plate_il ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Credit Card</span><label class="switch"><input type="checkbox" id="tgl-pii_credit_card" ${initialSettings.pii_credit_card ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">IBAN</span><label class="switch"><input type="checkbox" id="tgl-pii_iban" ${initialSettings.pii_iban ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">SWIFT / BIC</span><label class="switch"><input type="checkbox" id="tgl-pii_swift_bic" ${initialSettings.pii_swift_bic ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Ethereum Wallet</span><label class="switch"><input type="checkbox" id="tgl-pii_eth_wallet" ${initialSettings.pii_eth_wallet ? 'checked' : ''}><span class="slider"></span></label></div>

                <div class="section-title">Network</div>
                <div class="toggle-row"><span class="toggle-label">IPv4 Address</span><label class="switch"><input type="checkbox" id="tgl-pii_ipv4" ${initialSettings.pii_ipv4 ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">IPv6 Address</span><label class="switch"><input type="checkbox" id="tgl-pii_ipv6" ${initialSettings.pii_ipv6 ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">MAC Address</span><label class="switch"><input type="checkbox" id="tgl-pii_mac" ${initialSettings.pii_mac ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">URL with Credentials</span><label class="switch"><input type="checkbox" id="tgl-pii_url_creds" ${initialSettings.pii_url_creds ? 'checked' : ''}><span class="slider"></span></label></div>
            </div>
        </div>

        <div id="view-api-keys">
            <div class="panel-header">
                <button class="btn-back" id="btn-back-apikeys"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">API Keys</h3>
            </div>
            <div class="sub-panel-body">
                <div class="toggle-row"><span class="toggle-label" style="font-weight:600">All API Keys</span><label class="switch"><input type="checkbox" id="tgl2-pii_api_key" ${initialSettings.pii_api_key ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Anthropic</span><label class="switch"><input type="checkbox" id="tgl-api_key_anthropic" ${initialSettings.api_key_anthropic ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">OpenAI</span><label class="switch"><input type="checkbox" id="tgl-api_key_openai" ${initialSettings.api_key_openai ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">AWS</span><label class="switch"><input type="checkbox" id="tgl-api_key_aws" ${initialSettings.api_key_aws ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">GitHub PAT</span><label class="switch"><input type="checkbox" id="tgl-api_key_github_pat" ${initialSettings.api_key_github_pat ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">GitHub OAuth</span><label class="switch"><input type="checkbox" id="tgl-api_key_github_oauth" ${initialSettings.api_key_github_oauth ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">GitHub App</span><label class="switch"><input type="checkbox" id="tgl-api_key_github_app" ${initialSettings.api_key_github_app ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">GitHub Fine-grained</span><label class="switch"><input type="checkbox" id="tgl-api_key_github_fine" ${initialSettings.api_key_github_fine ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Google</span><label class="switch"><input type="checkbox" id="tgl-api_key_google" ${initialSettings.api_key_google ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Slack Bot</span><label class="switch"><input type="checkbox" id="tgl-api_key_slack_bot" ${initialSettings.api_key_slack_bot ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Slack User</span><label class="switch"><input type="checkbox" id="tgl-api_key_slack_user" ${initialSettings.api_key_slack_user ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Stripe</span><label class="switch"><input type="checkbox" id="tgl-api_key_stripe" ${initialSettings.api_key_stripe ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">SendGrid</span><label class="switch"><input type="checkbox" id="tgl-api_key_sendgrid" ${initialSettings.api_key_sendgrid ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Twilio</span><label class="switch"><input type="checkbox" id="tgl-api_key_twilio" ${initialSettings.api_key_twilio ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Mailgun</span><label class="switch"><input type="checkbox" id="tgl-api_key_mailgun" ${initialSettings.api_key_mailgun ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Shopify</span><label class="switch"><input type="checkbox" id="tgl-api_key_shopify" ${initialSettings.api_key_shopify ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Square</span><label class="switch"><input type="checkbox" id="tgl-api_key_square" ${initialSettings.api_key_square ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">DigitalOcean</span><label class="switch"><input type="checkbox" id="tgl-api_key_digitalocean" ${initialSettings.api_key_digitalocean ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">DO Spaces</span><label class="switch"><input type="checkbox" id="tgl-api_key_do_spaces" ${initialSettings.api_key_do_spaces ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">DO Registry</span><label class="switch"><input type="checkbox" id="tgl-api_key_do_registry" ${initialSettings.api_key_do_registry ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">New Relic</span><label class="switch"><input type="checkbox" id="tgl-api_key_newrelic" ${initialSettings.api_key_newrelic ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Grafana</span><label class="switch"><input type="checkbox" id="tgl-api_key_grafana" ${initialSettings.api_key_grafana ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">JWT</span><label class="switch"><input type="checkbox" id="tgl-api_key_jwt" ${initialSettings.api_key_jwt ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Private Key (PEM)</span><label class="switch"><input type="checkbox" id="tgl-api_key_private_key" ${initialSettings.api_key_private_key ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Alibaba Cloud</span><label class="switch"><input type="checkbox" id="tgl-api_key_alibaba" ${initialSettings.api_key_alibaba ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Artifactory</span><label class="switch"><input type="checkbox" id="tgl-api_key_artifactory" ${initialSettings.api_key_artifactory ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Atlassian API</span><label class="switch"><input type="checkbox" id="tgl-api_key_atlassian" ${initialSettings.api_key_atlassian ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Atlassian PAT</span><label class="switch"><input type="checkbox" id="tgl-api_key_atlassian_pat" ${initialSettings.api_key_atlassian_pat ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Datadog</span><label class="switch"><input type="checkbox" id="tgl-api_key_datadog" ${initialSettings.api_key_datadog ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Dropbox</span><label class="switch"><input type="checkbox" id="tgl-api_key_dropbox" ${initialSettings.api_key_dropbox ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Duffel</span><label class="switch"><input type="checkbox" id="tgl-api_key_duffel" ${initialSettings.api_key_duffel ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Dynatrace</span><label class="switch"><input type="checkbox" id="tgl-api_key_dynatrace" ${initialSettings.api_key_dynatrace ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">EasyPost</span><label class="switch"><input type="checkbox" id="tgl-api_key_easypost" ${initialSettings.api_key_easypost ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Facebook</span><label class="switch"><input type="checkbox" id="tgl-api_key_facebook" ${initialSettings.api_key_facebook ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Flutterwave</span><label class="switch"><input type="checkbox" id="tgl-api_key_flutterwave" ${initialSettings.api_key_flutterwave ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Fio Bank</span><label class="switch"><input type="checkbox" id="tgl-api_key_fio" ${initialSettings.api_key_fio ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Heroku</span><label class="switch"><input type="checkbox" id="tgl-api_key_heroku" ${initialSettings.api_key_heroku ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">HubSpot</span><label class="switch"><input type="checkbox" id="tgl-api_key_hubspot" ${initialSettings.api_key_hubspot ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Linear</span><label class="switch"><input type="checkbox" id="tgl-api_key_linear" ${initialSettings.api_key_linear ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Netlify</span><label class="switch"><input type="checkbox" id="tgl-api_key_netlify" ${initialSettings.api_key_netlify ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Notion</span><label class="switch"><input type="checkbox" id="tgl-api_key_notion" ${initialSettings.api_key_notion ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">npm</span><label class="switch"><input type="checkbox" id="tgl-api_key_npm" ${initialSettings.api_key_npm ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">OpsGenie</span><label class="switch"><input type="checkbox" id="tgl-api_key_opsgenie" ${initialSettings.api_key_opsgenie ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">PlanetScale</span><label class="switch"><input type="checkbox" id="tgl-api_key_planetscale" ${initialSettings.api_key_planetscale ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Postman</span><label class="switch"><input type="checkbox" id="tgl-api_key_postman" ${initialSettings.api_key_postman ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Prefect</span><label class="switch"><input type="checkbox" id="tgl-api_key_prefect" ${initialSettings.api_key_prefect ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Pulumi</span><label class="switch"><input type="checkbox" id="tgl-api_key_pulumi" ${initialSettings.api_key_pulumi ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">RubyGems</span><label class="switch"><input type="checkbox" id="tgl-api_key_rubygems" ${initialSettings.api_key_rubygems ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Scalingo</span><label class="switch"><input type="checkbox" id="tgl-api_key_scalingo" ${initialSettings.api_key_scalingo ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Segment</span><label class="switch"><input type="checkbox" id="tgl-api_key_segment" ${initialSettings.api_key_segment ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Snyk</span><label class="switch"><input type="checkbox" id="tgl-api_key_snyk" ${initialSettings.api_key_snyk ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Supabase</span><label class="switch"><input type="checkbox" id="tgl-api_key_supabase" ${initialSettings.api_key_supabase ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Telegram Bot</span><label class="switch"><input type="checkbox" id="tgl-api_key_telegram_bot" ${initialSettings.api_key_telegram_bot ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Vercel</span><label class="switch"><input type="checkbox" id="tgl-api_key_vercel" ${initialSettings.api_key_vercel ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="toggle-row"><span class="toggle-label">Bearer Token</span><label class="switch"><input type="checkbox" id="tgl-api_key_bearer" ${initialSettings.api_key_bearer ? 'checked' : ''}><span class="slider"></span></label></div>
            </div>
        </div>

        <div id="view-custom-patterns">
            <div class="panel-header">
                <button class="btn-back" id="btn-back-custom"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
                <h3 class="panel-title">Custom Patterns</h3>
            </div>
            <div class="sub-panel-body">
                <div class="custom-form">
                    <input type="text" class="custom-input" id="custom-name" placeholder="Name (e.g. Employee ID)" autocomplete="off">
                    <div class="custom-input-row">
                        <input type="text" class="custom-input" id="custom-regex" placeholder="Regex (e.g. EMP-\\d{5})" autocomplete="off" style="margin-top:0; flex:1;">
                        <a href="https://regex101.com" target="_blank" class="regex-help" title="Build your regex at regex101.com">?</a>
                    </div>
                    <div id="custom-error" class="custom-error"></div>
                    <button class="custom-add-btn" id="btn-custom-save">+ Add Pattern</button>
                </div>
                <div id="custom-list"></div>
            </div>
        </div>
    `;

    wrapper.appendChild(button);
    wrapper.appendChild(panel);
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    document.documentElement.appendChild(container);

    // Ensure it stays alive (SPA navigations can sometimes be aggressive)
    setInterval(() => {
        if (!document.getElementById('zerotrust-bouncer-widget-container')) {
            document.documentElement.appendChild(container);
        }
    }, 2000);

    // Navigation Listeners
    const viewMain = panel.querySelector('#view-main');
    const viewOptions = panel.querySelector('#view-options');
    const viewPii = panel.querySelector('#view-pii');
    const viewApiKeys = panel.querySelector('#view-api-keys');
    const viewProviders = panel.querySelector('#view-providers');
    const viewCustom = panel.querySelector('#view-custom-patterns');

    const showOnly = (view) => {
        [viewMain, viewOptions, viewPii, viewApiKeys, viewProviders, viewCustom].forEach(v => v.style.display = 'none');
        view.style.display = 'block';
    };

    panel.querySelector('#btn-options').addEventListener('click', () => showOnly(viewOptions));
    panel.querySelector('#btn-back-options').addEventListener('click', () => showOnly(viewMain));
    panel.querySelector('#btn-pii-customize').addEventListener('click', () => showOnly(viewPii));
    panel.querySelector('#btn-back-pii').addEventListener('click', () => showOnly(viewOptions));
    panel.querySelector('#btn-apikeys-customize').addEventListener('click', () => showOnly(viewApiKeys));
    panel.querySelector('#btn-back-apikeys').addEventListener('click', () => showOnly(viewOptions));
    panel.querySelector('#btn-providers-customize').addEventListener('click', () => showOnly(viewProviders));
    panel.querySelector('#btn-back-providers').addEventListener('click', () => showOnly(viewOptions));
    panel.querySelector('#btn-custom-customize').addEventListener('click', () => { renderCustomPatterns(); showOnly(viewCustom); });
    panel.querySelector('#btn-back-custom').addEventListener('click', () => showOnly(viewOptions));

    panel.querySelector('#btn-issue').addEventListener('click', () => {
        window.open('mailto:mattiba@gmail.com?subject=ZeroTrust%20Bouncer%20Feedback');
    });

    panel.querySelector('#btn-info').addEventListener('click', () => {
        window.open('https://github.com/mattib/zerotrust-bouncer', '_blank');
    });

    // PII master keys list (all individual pii_* types, no api keys)
    const PII_KEYS = [
        'pii_email', 'pii_phone', 'pii_id', 'pii_phone_il_landline', 'pii_phone_intl',
        'pii_passport_il', 'pii_company_il', 'pii_vat_il', 'pii_ssn_us', 'pii_ni_uk',
        'pii_plate_il', 'pii_credit_card', 'pii_iban', 'pii_swift_bic', 'pii_eth_wallet',
        'pii_ipv4', 'pii_ipv6', 'pii_mac', 'pii_url_creds'
    ];

    // Toggle Listeners — standard per-key toggles
    const toggleIds = [
        'provider_chatgpt', 'provider_claude', 'provider_gemini',
        'pii_api_key',
        ...PII_KEYS,
        'api_key_anthropic', 'api_key_openai', 'api_key_aws',
        'api_key_github_pat', 'api_key_github_oauth', 'api_key_github_app', 'api_key_github_fine',
        'api_key_google', 'api_key_slack_bot', 'api_key_slack_user',
        'api_key_stripe', 'api_key_sendgrid', 'api_key_twilio', 'api_key_mailgun',
        'api_key_shopify', 'api_key_square',
        'api_key_digitalocean', 'api_key_do_spaces', 'api_key_do_registry',
        'api_key_newrelic', 'api_key_grafana', 'api_key_jwt', 'api_key_private_key',
        'api_key_alibaba', 'api_key_artifactory', 'api_key_atlassian', 'api_key_atlassian_pat',
        'api_key_datadog', 'api_key_dropbox', 'api_key_duffel', 'api_key_dynatrace',
        'api_key_easypost', 'api_key_facebook', 'api_key_flutterwave', 'api_key_fio',
        'api_key_heroku', 'api_key_hubspot', 'api_key_linear', 'api_key_netlify',
        'api_key_notion', 'api_key_npm', 'api_key_opsgenie', 'api_key_planetscale',
        'api_key_postman', 'api_key_prefect', 'api_key_pulumi', 'api_key_rubygems',
        'api_key_scalingo', 'api_key_segment', 'api_key_snyk', 'api_key_supabase',
        'api_key_telegram_bot', 'api_key_vercel', 'api_key_bearer'
    ];
    toggleIds.forEach(id => {
        // pii_api_key appears in two places (options page + api-keys sub-page header)
        ['tgl-' + id, 'tgl2-' + id].forEach(tglId => {
            const tgl = panel.querySelector('#' + tglId);
            if (tgl) {
                tgl.addEventListener('change', (e) => {
                    const update = {};
                    update[id] = e.target.checked;
                    chrome.storage.local.set(update);
                    // keep both copies in sync
                    ['tgl-' + id, 'tgl2-' + id].forEach(otherId => {
                        const other = panel.querySelector('#' + otherId);
                        if (other && other !== tgl) other.checked = e.target.checked;
                    });
                    console.log(`[ZeroTrust] Toggled ${id}: ${e.target.checked}`);
                });
            }
        });
    });

    // PII master toggle — bulk-sets all individual PII keys
    const piiMasterTgl = panel.querySelector('#tgl-pii_master');
    if (piiMasterTgl) {
        piiMasterTgl.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const bulk = {};
            PII_KEYS.forEach(k => bulk[k] = checked);
            chrome.storage.local.set(bulk);
            PII_KEYS.forEach(k => {
                const t = panel.querySelector('#tgl-' + k);
                if (t) t.checked = checked;
            });
            console.log(`[ZeroTrust] PII master → ${checked}`);
        });
    };

    // -------------------------------------------------------------------------
    // Custom Patterns — CRUD
    // -------------------------------------------------------------------------
    let customPatterns = (initialSettings.custom_patterns || []).slice();

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function saveCustomPatterns() {
        chrome.storage.local.set({ custom_patterns: customPatterns });
        window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_ConfigUpdate', {
            detail: JSON.stringify({ custom_patterns: customPatterns })
        }));
    }

    function renderCustomPatterns() {
        const list = panel.querySelector('#custom-list');
        if (!list) return;
        if (!customPatterns.length) {
            list.innerHTML = '<div class="custom-empty">No patterns yet.<br>Add one above.</div>';
            return;
        }
        list.innerHTML = customPatterns.map((cp, i) => `
            <div class="custom-item">
                <div class="custom-item-header">
                    <span class="toggle-label">${escHtml(cp.name)}</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <label class="switch"><input type="checkbox" class="custom-tgl" data-idx="${i}" ${cp.enabled ? 'checked' : ''}><span class="slider"></span></label>
                        <button class="custom-delete" data-idx="${i}" title="Delete">✕</button>
                    </div>
                </div>
                <div class="custom-item-pattern">${escHtml(cp.pattern)}</div>
            </div>
        `).join('');

        list.querySelectorAll('.custom-tgl').forEach(tgl => {
            tgl.addEventListener('change', (e) => {
                customPatterns[parseInt(e.target.dataset.idx)].enabled = e.target.checked;
                saveCustomPatterns();
            });
        });
        list.querySelectorAll('.custom-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                customPatterns.splice(parseInt(e.target.dataset.idx), 1);
                saveCustomPatterns();
                renderCustomPatterns();
            });
        });
    }

    panel.querySelector('#btn-custom-save').addEventListener('click', () => {
        const nameEl = panel.querySelector('#custom-name');
        const regexEl = panel.querySelector('#custom-regex');
        const errorEl = panel.querySelector('#custom-error');
        const name = nameEl.value.trim();
        const pattern = regexEl.value.trim();

        errorEl.textContent = '';
        if (!name)    { errorEl.textContent = 'Name is required.'; return; }
        if (!pattern) { errorEl.textContent = 'Regex is required.'; return; }
        try { new RegExp(pattern); } catch (e) { errorEl.textContent = 'Invalid regex: ' + e.message; return; }

        customPatterns.push({ id: customPatterns.length + 1, name, pattern, enabled: true });
        saveCustomPatterns();
        renderCustomPatterns();
        nameEl.value = '';
        regexEl.value = '';
    });

    // -------------------------------------------------------------------------
    // Map section — count display, max-entries input, clear button
    // -------------------------------------------------------------------------
    const mapCountLabel = panel.querySelector('#map-count-label');
    const mapWarnBox    = panel.querySelector('#map-warn-box');
    const mapMaxInput   = panel.querySelector('#map-max-input');

    // Wire the module-level updater so MapUpdate events can refresh the label live
    _updateMapCount = () => {
        if (mapCountLabel) mapCountLabel.textContent = `${currentMapOrder.length} / ${currentMapMax} entries`;
    };

    // Max-entries input — save on blur/enter, clamp to ≥100
    mapMaxInput.addEventListener('change', () => {
        const val = Math.max(100, parseInt(mapMaxInput.value) || 1000);
        mapMaxInput.value = val;
        currentMapMax = val;
        chrome.storage.local.set({ pii_map_max: val });

        // Enforce the new cap immediately (so lowering it trims right away).
        let evicted = false;
        while (currentMapOrder.length > currentMapMax) {
            delete piiMap[currentMapOrder.shift()];
            evicted = true;
        }
        if (evicted) {
            chrome.storage.local.set({ pii_map: piiMap, pii_map_order: currentMapOrder });
            window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapSync', { detail: JSON.stringify(piiMap) }));
        }
        _updateMapCount();
    });

    // Clear button → show inline warning
    panel.querySelector('#btn-clear-map').addEventListener('click', () => {
        mapWarnBox.style.display = 'block';
    });

    // Cancel → hide warning
    panel.querySelector('#btn-clear-cancel').addEventListener('click', () => {
        mapWarnBox.style.display = 'none';
    });

    // Confirm clear → wipe map in content + engine + storage
    panel.querySelector('#btn-clear-confirm').addEventListener('click', () => {
        piiMap = {};
        currentMapOrder = [];
        chrome.storage.local.set({ pii_map: {}, pii_map_order: [], pii_counters: {} });
        window.dispatchEvent(new CustomEvent('ZeroTrustBouncer_MapClear', {}));
        mapWarnBox.style.display = 'none';
        _updateMapCount();
    });

    // Dragging Logic
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let dragMoved = false;

    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        
        isDragging = true;
        dragMoved = false;
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
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
        
        container.style.left = `${initialLeft + dx}px`;
        container.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            button.style.cursor = 'pointer';
            if (!dragMoved) {
                // Click (not a drag) → toggle the panel open/closed (sticky; resize-proof)
                const isOpen = wrapper.classList.toggle('open');
                if (isOpen) showOnly(viewMain);
            }
        }
    });

    // Click anywhere outside the widget → close the panel
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) wrapper.classList.remove('open');
    });
}

startObserver();
