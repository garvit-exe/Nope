const USER_ALLOWLIST_KEY = "userAllowlist";

function sanitize(str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

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

    if (!result || !result.cleaned) {
        // This is the case where the URL was already clean or no data is available.
        cleanState.style.display = "block";
    } else {
        // This is the case where parameters were removed by a rule.
        // We can't show specifics, so we show a generic success message.
        cleanedState.style.display = "block";
        document.querySelector("#cleaned-state .status-message").innerHTML =
            "Tracking parameters removed.";
        document.querySelector(".param-list-container").style.display = "none"; // Hide the list
    }
}

document
    .getElementById("removed-params-list")
    .addEventListener("click", async (event) => {
        if (event.target.classList.contains("allow-button")) {
            const button = event.target;
            const keyToAllow = button.dataset.key;

            const data = await chrome.storage.sync.get(USER_ALLOWLIST_KEY);
            const currentAllowlist = new Set(data[USER_ALLOWLIST_KEY] || []);

            currentAllowlist.add(keyToAllow);
            await chrome.storage.sync.set({
                [USER_ALLOWLIST_KEY]: [...currentAllowlist],
            });

            button.textContent = "Allowed";
            button.disabled = true;

            const item = button.closest(".param-item");
            let feedback = item.querySelector(".feedback-message");
            if (!feedback) {
                feedback = document.createElement("div");
                feedback.textContent = "Reload page to see effect.";
                Object.assign(feedback.style, {
                    fontSize: "11px",
                    color: "#586069",
                    textAlign: "right",
                    paddingTop: "4px",
                });
                item.after(feedback);
            }
        }
    });

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
