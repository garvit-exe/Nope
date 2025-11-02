// Function to safely create and sanitize HTML content.
function sanitize(str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

// Main function to update the popup's UI based on the cleaning result.
function updatePopup(result) {
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
        // This is the case where the URL was already clean or no data is available.
        cleanState.style.display = "block";
    } else {
        // This is the case where parameters were removed.
        const removedCount = result.removedParams.length;
        paramCountEl.textContent = removedCount;

        // Populate the list of removed parameters.
        result.removedParams.forEach((param) => {
            const listItem = document.createElement("li");
            listItem.className = "param-item";

            const keySpan = document.createElement("span");
            keySpan.className = "param-key";
            keySpan.textContent = sanitize(param.key);

            const valueSpan = document.createElement("span");
            valueSpan.className = "param-value";
            valueSpan.textContent = sanitize(param.value);
            valueSpan.title = sanitize(param.value); // Show full value on hover

            listItem.appendChild(keySpan);
            listItem.appendChild(valueSpan);
            paramsListEl.appendChild(listItem);
        });

        cleanedState.style.display = "block";
    }
}

// This is the entry point, which runs when the popup is opened.
document.addEventListener("DOMContentLoaded", async () => {
    // Get the currently active tab in the user's window.
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    // Handle cases where the tab is not a standard web page.
    if (!tab || !tab.id || tab.url.startsWith("chrome://")) {
        updatePopup(null); // Show the "clean" state for internal pages.
        return;
    }

    // Retrieve the cleaning results that the background script saved for this tab.
    try {
        const data = await chrome.storage.session.get(tab.id.toString());
        const result = data[tab.id.toString()];
        updatePopup(result);
    } catch (error) {
        console.error("Nope Extension: Error retrieving data for tab.", error);
        updatePopup(null); // Show the default state in case of an error.
    }
});
