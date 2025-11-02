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

// --- Context Menu for Cleaning Links ---

// Create the context menu item when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "nope-clean-link",
        title: "Copy clean link",
        contexts: ["link"], // This makes it appear only when right-clicking a link.
    });
});

// Listen for a click on our context menu item.
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Check if our menu item was clicked and that there's a link URL.
    if (info.menuItemId === "nope-clean-link" && info.linkUrl) {
        // Use our existing cleanUrl function to sanitize the link.
        const result = cleanUrl(info.linkUrl);
        const cleanedUrl = result.cleanedUrl;

        // The clipboard API is only available in the context of a tab,
        // so we execute a small script in the active tab to perform the copy action.
        chrome.scripting
            .executeScript({
                target: { tabId: tab.id },
                func: copyToClipboard,
                args: [cleanedUrl],
            })
            .then(() => {
                // Optional: Show a brief notification that the link was copied.
                // This requires the "notifications" permission if you want to add it.
                // For now, we'll log to the service worker console.
                console.log(
                    "Nope Extension: Cleaned link copied to clipboard:",
                    cleanedUrl
                );
            })
            .catch((err) => {
                console.error(
                    "Nope Extension: Could not copy link to clipboard.",
                    err
                );
            });
    }
});

// This function will be injected into the active tab to perform the copy action.
// It cannot interact with the background script directly, so all data must be passed as arguments.
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch((err) => {
        console.error("Could not copy text: ", err);
    });
}
