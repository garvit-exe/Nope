# Nope :: A Modern, Manifest V3 URL Sanitizer

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![Version](https://img.shields.io/badge/version-1.2.0-blue)](https://github.com/)

Nope is a privacy-focused, Manifest V3 compliant Chrome extension designed to automatically sanitize URLs by removing tracking parameters, advertising identifiers, and other superfluous query components before they are processed by the browser.

This extension is built from the ground up to leverage the modern, privacy-preserving Chrome Extension APIs, prioritizing performance and user security over legacy methods.

## Core Features

-   **Automatic URL Cleaning**: Sanitizes URLs in real-time as you navigate, without any user interaction required.
-   **Comprehensive Ruleset**: Blocks a wide array of common tracking parameters (e.g., `utm_*`, `fbclid`, `gclid`) and ambiguous referral tags (`ref`, `affiliate`).
-   **Intelligent Allowlisting**: Preserves essential query parameters for specific domains (e.g., `v` for YouTube, `dp` for Amazon) to prevent site breakage.
-   **User-Defined Allowlist**: Allows users to dynamically override the default blocking rules for specific parameters they wish to preserve.
-   **"Copy Clean Link" Context Menu**: A convenient right-click option to copy a sanitized version of any link to the clipboard before opening it.
-   **Privacy-First Architecture**: Built on the `declarativeNetRequest` API, meaning the extension does not read or process the content of your web traffic. All transformations are handled securely by the browser engine itself.
-   **Robust Clipboard Functionality**: Utilizes the modern Offscreen Document API for reliable and secure clipboard access across all websites, regardless of their security policies.

## Architectural Philosophy: Privacy and Performance First

This project serves as a case study in building a modern, performant, and privacy-respecting Chrome extension under the new Manifest V3 paradigm. The architectural choices were deliberate:

#### 1. Manifest V3 & `declarativeNetRequest` API

The deprecated `webRequestBlocking` API, while powerful, required extensions to have persistent background processes that would intercept and read every network request, posing a significant privacy and performance risk.

Nope is built entirely on the **`declarativeNetRequest` API**.
-   **How it works**: We provide a static `rules.json` file to the Chrome browser. The browser's highly-optimized, native engine evaluates and acts on these rules.
-   **The Benefit**: The extension's JavaScript never sees or blocks the URL in real-time. This is fundamentally more private and orders of magnitude more performant, as it eliminates all JavaScript overhead from the critical request path.

#### 2. Dynamic Rules for Customization

To allow for a user-defined allowlist without compromising the static ruleset, Nope leverages **Dynamic Rules**.
-   **How it works**: When a user chooses to "Allow" a parameter, the background service worker uses `chrome.declarativeNetRequest.updateDynamicRules` to add a new rule with a higher priority and an `allow` action.
-   **The Benefit**: This creates a powerful, layered rules system where user intent can override the extension's defaults without ever needing to modify the core, static ruleset.

#### 3. Robust Clipboard Access with the Offscreen API

A common failure point for extensions is clipboard interaction, which is often blocked by a website's Content Security Policy (CSP).
-   **The Problem**: Using `chrome.scripting.executeScript` to inject a copy command into a webpage is unreliable and fails on secure or restricted pages.
-   **The Solution**: Nope implements the **Offscreen Document API**. When the user clicks "Copy clean link," a temporary, hidden extension-owned HTML page (`offscreen.html`) is created. This document has guaranteed permission to use the `document.execCommand('copy')` API. The background script sends the clean URL to this document, which securely places it on the clipboard and then terminates. This method is robust, secure, and works on any page.

## Installation from Source

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/garvit-exe/Nope.git
    ```
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" using the toggle in the top-right corner.
4.  Click the "Load unpacked" button.
5.  Select the `nope` folder from your local machine.

The "Nope" extension icon should now appear in your toolbar.

## Project File Structure
```bash
nope/
├── manifest.json # Core configuration, permissions, and API declarations.
├── rules.json # The static ruleset for declarativeNetRequest.
├── background.js # Service worker: manages dynamic rules, context menu, and state.
├── css/
│ └── popup.css # Styling for the popup interface.
├── html/
│ ├── popup.html # The HTML structure for the extension's popup.
│ └── offscreen.html # The hidden HTML document for clipboard operations.
├── js/
│ ├── popup.js # Logic for the popup UI and user interaction.
│ ├── rules.js # A JS module defining parameter categories (used for context menu).
│ └── offscreen.js # The script that runs in the offscreen document.
└── icons/
  ├── icon16.png
  ├── icon48.png
  └── icon128.png
```

## How It Works: A Detailed Flow

1.  **Static Cleaning**: A user navigates to a URL. The browser's `declarativeNetRequest` engine matches the URL against `rules.json`. If tracking parameters are found, the engine internally redirects to a sanitized version of the URL.
2.  **Popup Display**: The `webNavigation.onCompleted` event fires. The `background.js` script calls `getMatchedRules` to check if a rule was applied to the current tab. If so, it saves a `{cleaned: true}` flag to `chrome.storage.session`. When the popup is opened, `popup.js` reads this flag and displays the appropriate status message.
3.  **Allowlisting**: The user allows a parameter via the UI (a feature to be enhanced in the popup). This action saves the parameter key to `chrome.storage.sync`. The `background.js` storage listener fires, calling `updateUserAllowlistRules`. This function removes all previous dynamic rules and adds a new, high-priority `allow` rule for the specified parameter, overriding the static block rule.

## Contributing

Contributions are welcome. Please feel free to fork the repository, make changes, and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.