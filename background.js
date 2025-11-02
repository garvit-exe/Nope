// Import the ruleset from our separate module.
import { parameterRules } from "./js/rules.js";

/**
 * The core URL cleaning logic.
 * @param {string} urlString The original URL to be cleaned.
 * @returns {object} An object containing the cleaned URL, the original URL, and a list of removed parameters.
 */
function cleanUrl(urlString) {
    try {
        const url = new URL(urlString);
        const originalParams = new URLSearchParams(url.search);
        const cleanedParams = new URLSearchParams();
        const removedParams = [];

        // Get the domain-specific allowlist, or an empty Set if none exists.
        // This handles both "www.domain.com" and "domain.com".
        const domain = url.hostname.replace(/^www\./, "");
        const domainAllowlist = parameterRules.allowlist[domain] || new Set();

        for (const [key, value] of originalParams.entries()) {
            // 1. Check Allowlist: Always keep parameters essential for a site's function.
            if (domainAllowlist.has(key)) {
                cleanedParams.append(key, value);
                continue;
            }

            // 2. Check Blocklist: Remove known tracking parameters.
            if (parameterRules.blocklist.has(key)) {
                removedParams.push({ key, value });
                continue;
            }

            // 3. Check Referral list: For now, we remove these by default.
            // In a later step, we will add user controls to manage these.
            if (parameterRules.referral.has(key)) {
                removedParams.push({ key, value });
                continue;
            }

            // 4. Default Action: If a parameter is not in any list, keep it.
            // This is a safe default to avoid breaking unknown but necessary parameters.
            cleanedParams.append(key, value);
        }

        url.search = cleanedParams.toString();
        return {
            cleanedUrl: url.toString(),
            originalUrl: urlString,
            removedParams,
        };
    } catch (error) {
        // If the URL is invalid, return the original without changes.
        console.error("Nope Extension: Could not parse URL", urlString, error);
        return {
            cleanedUrl: urlString,
            originalUrl: urlString,
            removedParams: [],
        };
    }
}

// Listen for web requests before they are sent.
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Only act on main page loads, not on images, scripts, etc.
        if (details.type !== "main_frame" || !details.url) {
            return;
        }

        const result = cleanUrl(details.url);

        // If the URL was changed, redirect to the clean version.
        if (result.cleanedUrl !== result.originalUrl) {
            // Store the cleaning result so the popup can display it.
            // We use session storage which is cleared when the browser closes.
            chrome.storage.session.set({ [details.tabId]: result });

            return { redirectUrl: result.cleanedUrl };
        }
    },
    { urls: ["<all_urls>"] }, // This applies the listener to all URLs.
    ["blocking"] // "blocking" allows us to modify the request and redirect.
);

// Clean up storage when a tab is closed to prevent memory leaks.
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(tabId.toString());
});
