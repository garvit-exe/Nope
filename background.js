import { parameterRules } from "./js/rules.js";

// --- User Allowlist Management using Dynamic Rules ---
const USER_ALLOWLIST_KEY = "userAllowlist";

// This function adds dynamic rules to ALLOW specific parameters, overriding the static rules.
async function updateUserAllowlistRules() {
    const data = await chrome.storage.sync.get(USER_ALLOWLIST_KEY);
    const userAllowlist = new Set(data[USER_ALLOWLIST_KEY] || []);

    // First, remove all existing dynamic rules to start fresh.
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
        });
    }

    if (userAllowlist.size > 0) {
        const addRules = [];
        let ruleId = 1000; // Start dynamic rule IDs high to avoid conflicts.
        for (const param of userAllowlist) {
            addRules.push({
                id: ruleId++,
                priority: 2, // Higher priority than the static rule
                action: { type: "allow" },
                condition: {
                    urlFilter: `*?*${param}=*`,
                    resourceTypes: ["main_frame"],
                },
            });
        }
        await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
    }
    console.log("Nope Extension: User allowlist rules updated.");
}

// Listen for storage changes to update rules on the fly.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes[USER_ALLOWLIST_KEY]) {
        updateUserAllowlistRules();
    }
});

// --- Popup Data Management ---
// Listen for page navigation completion.
chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId === 0) {
        // Ensure it's the main frame.
        try {
            const matchedRules =
                await chrome.declarativeNetRequest.getMatchedRules({
                    tabId: details.tabId,
                });
            if (matchedRules.rules.length > 0) {
                const url = new URL(details.url);
                const originalParams = new URLSearchParams(url.search);

                // This is a simulation, as we don't know the *original* URL.
                // We show the user which of their current params *would* have been blocked.
                const removedParams = [];
                const allBlocked = new Set([
                    ...parameterRules.blocklist,
                    ...parameterRules.referral,
                ]);

                for (const [key, value] of originalParams.entries()) {
                    // This part is imperfect because the browser has already removed the params.
                    // We are just showing a confirmation that the rule was applied.
                    // A more advanced version might store the original URL before redirection.
                }

                // Since we can't reconstruct the removed params perfectly, we simplify.
                // We'll just confirm that *a* rule was matched.
                // The popup will be simplified to reflect this.
                chrome.storage.session.set({
                    [details.tabId]: {
                        cleaned: true,
                        // We can't know the exact params, so we'll pass the rule id.
                        ruleId: matchedRules.rules[0].ruleId,
                    },
                });
            }
        } catch (error) {
            console.error("Nope Extension:", error);
        }
    }
});

// --- Context Menu (This part needs its own cleaning logic) ---
// Since the old cleanUrl was for webRequest, we need a standalone version.
function cleanUrlForContextMenu(urlString) {
    try {
        const url = new URL(urlString);
        const cleanedParams = new URLSearchParams();
        const allBlocked = new Set([
            ...parameterRules.blocklist,
            ...parameterRules.referral,
        ]);
        const domain = url.hostname.replace(/^www\./, "");
        const domainAllowlist = parameterRules.allowlist[domain] || new Set();

        for (const [key, value] of url.searchParams.entries()) {
            if (domainAllowlist.has(key) || !allBlocked.has(key)) {
                cleanedParams.append(key, value);
            }
        }
        url.search = cleanedParams.toString();
        return url.toString();
    } catch (e) {
        return urlString; // Return original on error
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "nope-clean-link",
        title: "Copy clean link",
        contexts: ["link"],
    });
    updateUserAllowlistRules(); // Initial setup of user rules
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "nope-clean-link" && info.linkUrl) {
        const cleanedUrl = cleanUrlForContextMenu(info.linkUrl);
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => navigator.clipboard.writeText(text),
            args: [cleanedUrl],
        });
    }
});

// Initial load of user rules when the extension starts.
updateUserAllowlistRules();
