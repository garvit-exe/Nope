/**
 * The Core Rules Engine for the "Nope" URL Sanitizer.
 * This file categorizes URL parameters to allow for intelligent cleaning decisions.
 * Using Sets for blocklist and referral lists provides faster lookups (O(1) average time complexity)
 * compared to arrays (O(n)).
 */
export const parameterRules = {
    /**
     * BLOCKLIST: Unambiguous tracking parameters.
     * These are almost always used for analytics, marketing, or tracking across sites.
     * They provide no direct value to the user and can be safely removed.
     */
    blocklist: new Set([
        // Google Analytics
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "utm_id",
        "utm_source_platform",

        // Facebook Click Identifier
        "fbclid",

        // Google Click Identifier
        "gclid",

        // Microsoft Click Identifier
        "msclkid",

        // Drip CRM
        "__s",

        // HubSpot
        "_hsenc",
        "_hsmi",
        "hsa_acc",
        "hsa_cam",
        "hsa_grp",
        "hsa_ad",
        "hsa_src",
        "hsa_tgt",
        "hsa_ver",
        "hsa_la",
        "hsa_ol",

        // Mailchimp
        "mc_cid",
        "mc_eid",

        // Other common trackers
        "mkt_tok",
        "vero_conv",
        "vero_id",
        "yclid", // Yandex Click ID
    ]),

    /**
     * REFERRAL: Parameters that might be beneficial to the user or a friend.
     * These are often associated with referral programs, affiliate links, or invites.
     * The extension will treat these with more caution, allowing for user overrides.
     */
    referral: new Set([
        "ref",
        "refer",
        "affiliate",
        "aff",
        "invite",
        "referral",
        "referralCode",
        "friend",
        "via",
        "spm", // Alibaba / AliExpress
    ]),

    /**
     * ALLOWLIST: Essential parameters for specific domains.
     * Removing these parameters would break the functionality of the website.
     * The key is the domain name, and the value is a Set of allowed parameter keys.
     */
    allowlist: {
        // YouTube
        "youtube.com": new Set(["v", "t", "list", "index", "si"]),
        "youtu.be": new Set(["t", "si"]),

        // Google
        "google.com": new Set(["q", "tbm", "tbs", "start", "uule"]),

        // Amazon
        "amazon.com": new Set([
            "dp",
            "gp",
            "product",
            "keywords",
            "field-keywords",
        ]),
        "amazon.co.uk": new Set([
            "dp",
            "gp",
            "product",
            "keywords",
            "field-keywords",
        ]),
        "amazon.de": new Set([
            "dp",
            "gp",
            "product",
            "keywords",
            "field-keywords",
        ]),
        "amazon.ca": new Set([
            "dp",
            "gp",
            "product",
            "keywords",
            "field-keywords",
        ]),
        "amazon.jp": new Set([
            "dp",
            "gp",
            "product",
            "keywords",
            "field-keywords",
        ]),

        // Reddit
        "reddit.com": new Set(["t"]),

        // DuckDuckGo
        "duckduckgo.com": new Set(["q", "ia"]),

        // Discord (for invites)
        "discord.gg": new Set(), // No params needed, path is the key
        "discord.com": new Set(["channel", "message"]),
    },
};
