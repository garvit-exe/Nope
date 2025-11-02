// js/popup.js

const USER_ALLOWLIST_KEY = "userAllowlist";

// Function to safely create and sanitize HTML content.
function sanitize(str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

// Main function to update the popup's UI based on the cleaning result.
async function updatePopup(result) {
    const initialState = document.getElementById("initial-state");
    const cleanState = document.getElementById("clean-state");
    const cleanedState = document.getElementById("cleaned-state");
    const paramCountEl = document.getElementById("param-count");
    const paramsListEl = document.getElementById("removed-params-list");

    // Hide all views initially.
    initialState.style.display = "none";
    cleanState.style.display = "none";
    cleanedState.style.display = "none";
    paramsListEl.innerHTML = ""; // Clear previous list items.

    if (!result || !result.removedParams || result.removedParams.length === 0) {
        cleanState.style.display = "block";
    } else {
        const removedCount = result.removedParams.length;
        paramCountEl.textContent = removedCount;

        // Populate the list of removed parameters.
        result.removedParams.forEach((param) => {
            const listItem = document.createElement("li");
            listItem.className = "param-item";

            const contentDiv = document.createElement("div");
            contentDiv.style.display = "flex";
            contentDiv.style.flexDirection = "column";
            contentDiv.style.flexGrow = "1";
            contentDiv.style.overflow = "hidden";

            const keySpan = document.createElement("span");
            keySpan.className = "param-key";
            keySpan.textContent = sanitize(param.key);

            const valueSpan = document.createElement("span");
            valueSpan.className = "param-value";
            valueSpan.textContent = sanitize(param.value);
            valueSpan.title = sanitize(param.value);

            const allowButton = document.createElement("button");
            allowButton.className = "allow-button";
            allowButton.textContent = "Allow";
            allowButton.dataset.key = param.key; // Store the key on the button

            contentDiv.appendChild(keySpan);
            contentDiv.appendChild(valueSpan);
            listItem.appendChild(contentDiv);
            listItem.appendChild(allowButton);
            paramsListEl.appendChild(listItem);
        });

        cleanedState.style.display = "block";
    }
}

// Event listener for clicks on the "Allow" buttons (uses event delegation).
document
    .getElementById("removed-params-list")
    .addEventListener("click", async (event) => {
        if (event.target.classList.contains("allow-button")) {
            const button = event.target;
            const keyToAllow = button.dataset.key;

            // Get the current list, or initialize a new one.
            const data = await chrome.storage.sync.get(USER_ALLOWLIST_KEY);
            const currentAllowlist = new Set(data[USER_ALLOWLIST_KEY] || []);

            // Add the new key and save it.
            currentAllowlist.add(keyToAllow);
            await chrome.storage.sync.set({
                [USER_ALLOWLIST_KEY]: [...currentAllowlist],
            });

            // Provide user feedback.
            button.textContent = "Allowed";
            button.disabled = true;

            // Inform the user to reload for the change to take effect on the current page.
            const item = button.closest(".param-item");
            let feedback = item.querySelector(".feedback-message");
            if (!feedback) {
                feedback = document.createElement("div");
                feedback.textContent = "Reload page to see effect.";
                feedback.style.fontSize = "11px";
                feedback.style.color = "#586069";
                feedback.style.textAlign = "right";
                feedback.style.paddingTop = "4px";
                item.after(feedback);
            }
        }
    });

// Entry point when the popup is opened.
document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    if (!tab || !tab.id || tab.url.startsWith("chrome://")) {
        updatePopup(null);
        return;
    }

    try {
        const data = await chrome.storage.session.get(tab.id.toString());
        const result = data[tab.id.toString()];
        updatePopup(result);
    } catch (error) {
        console.error("Nope Extension: Error retrieving data for tab.", error);
        updatePopup(null);
    }
});
