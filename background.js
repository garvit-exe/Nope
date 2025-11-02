import { parameterRules } from "./js/rules.js";

const USER_ALLOWLIST_KEY = "userAllowlist";

async function updateUserAllowlistRules() {
    const data = await chrome.storage.sync.get(USER_ALLOWLIST_KEY);
    const userAllowlist = new Set(data[USER_ALLOWLIST_KEY] || []);

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
        });
    }

    if (userAllowlist.size > 0) {
        const addRules = [];
        let ruleId = 1000;
        for (const param of userAllowlist) {
            addRules.push({
                id: ruleId++,
                priority: 2,
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

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes[USER_ALLOWLIST_KEY]) {
        updateUserAllowlistRules();
    }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
    // FIX 1: Ignore protected URLs to prevent the TypeError
    if (
        details.frameId === 0 &&
        !details.url.startsWith("chrome://") &&
        !details.url.startsWith("chrome-extension://")
    ) {
        try {
            const matchedRules =
                await chrome.declarativeNetRequest.getMatchedRules({
                    tabId: details.tabId,
                });

            // Defensive check to ensure matchedRules and its properties exist
            if (
                matchedRules &&
                matchedRules.rules &&
                matchedRules.rules.length > 0
            ) {
                chrome.storage.session.set({
                    [details.tabId]: {
                        cleaned: true,
                        ruleId: matchedRules.rules[0].ruleId,
                    },
                });
            }
        } catch (error) {
            console.error("Nope Extension Error (onCompleted):", error);
        }
    }
});

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
        return urlString;
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "nope-clean-link",
        title: "Copy clean link",
        contexts: ["link"],
    });
    updateUserAllowlistRules();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "nope-clean-link" && info.linkUrl) {
        // FIX 2: Check if the tab can be scripted before trying.
        if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("chrome-extension://")
        ) {
            console.warn(
                "Nope Extension: Cannot copy link on a protected page."
            );
            // We can't inject a script, but we can try a different method for newer Chrome versions.
            // This is a more advanced fallback, but for now, we'll just prevent the error.
            return;
        }

        const cleanedUrl = cleanUrlForContextMenu(info.linkUrl);
        chrome.scripting
            .executeScript({
                target: { tabId: tab.id },
                func: (text) => navigator.clipboard.writeText(text),
                args: [cleanedUrl],
            })
            .catch((err) => {
                // Gracefully catch the scripting error instead of letting it be uncaught
                console.error(
                    "Nope Extension Error (onClicked): Could not inject script. This might be a protected page.",
                    err
                );
            });
    }
});

updateUserAllowlistRules();
