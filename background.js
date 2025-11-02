// background.js

import { parameterRules } from "./js/rules.js";

const USER_ALLOWLIST_KEY = "userAllowlist";
let userAllowlist = new Set();

// Function to load user preferences from storage into memory.
async function loadUserAllowlist() {
    const data = await chrome.storage.sync.get(USER_ALLOWLIST_KEY);
    if (data[USER_ALLOWLIST_KEY]) {
        userAllowlist = new Set(data[USER_ALLOWLIST_KEY]);
        console.log("Nope Extension: User allowlist loaded:", userAllowlist);
    }
}

// Listen for changes in storage and reload the allowlist if it changes.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes[USER_ALLOWLIST_KEY]) {
        console.log("Nope Extension: User allowlist has changed. Reloading...");
        loadUserAllowlist();
    }
});

function cleanUrl(urlString) {
    try {
        const url = new URL(urlString);
        const originalParams = new URLSearchParams(url.search);
        const cleanedParams = new URLSearchParams();
        const removedParams = [];

        const domain = url.hostname.replace(/^www\./, "");
        const domainAllowlist = parameterRules.allowlist[domain] || new Set();

        for (const [key, value] of originalParams.entries()) {
            // 0. NEW: Check User's Personal Allowlist First
            if (userAllowlist.has(key)) {
                cleanedParams.append(key, value);
                continue;
            }

            // 1. Check Domain Allowlist
            if (domainAllowlist.has(key)) {
                cleanedParams.append(key, value);
                continue;
            }

            // 2. Check Blocklist
            if (parameterRules.blocklist.has(key)) {
                removedParams.push({ key, value });
                continue;
            }

            // 3. Check Referral list
            if (parameterRules.referral.has(key)) {
                removedParams.push({ key, value });
                continue;
            }

            // 4. Default Action: Keep parameter
            cleanedParams.append(key, value);
        }

        url.search = cleanedParams.toString();
        return {
            cleanedUrl: url.toString(),
            originalUrl: urlString,
            removedParams,
        };
    } catch (error) {
        console.error("Nope Extension: Could not parse URL", urlString, error);
        return {
            cleanedUrl: urlString,
            originalUrl: urlString,
            removedParams: [],
        };
    }
}

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.type !== "main_frame" || !details.url) {
            return;
        }
        const result = cleanUrl(details.url);
        if (result.cleanedUrl !== result.originalUrl) {
            chrome.storage.session.set({ [details.tabId]: result });
            return { redirectUrl: result.cleanedUrl };
        }
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(tabId.toString());
});

// Load the user's preferences when the extension first starts up.
loadUserAllowlist();
