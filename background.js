import { parameterRules } from "./js/rules.js";

const USER_ALLOWLIST_KEY = "userAllowlist";

// --- Rules Management ---
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

// --- Popup Data Management ---
chrome.webNavigation.onCompleted.addListener(async (details) => {
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

// --- Context Menu and Clipboard Logic ---
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

async function copyTextToClipboard(text) {
    // Check if an offscreen document is already available.
    if (await chrome.offscreen.hasDocument()) {
        // Document exists, just send a message.
    } else {
        // Create the offscreen document.
        await chrome.offscreen.createDocument({
            url: "html/offscreen.html",
            reasons: ["CLIPBOARD"],
            justification: "Required to reliably copy text to the clipboard.",
        });
    }

    // Send the text to the offscreen document to be copied.
    chrome.runtime.sendMessage({
        type: "copy-to-clipboard",
        target: "offscreen",
        data: text,
    });
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
        const cleanedUrl = cleanUrlForContextMenu(info.linkUrl);
        copyTextToClipboard(cleanedUrl);
        console.log(
            "Nope Extension: Cleaned link sent to clipboard handler:",
            cleanedUrl
        );
    }
});

// Initial setup
updateUserAllowlistRules();
