chrome.runtime.onMessage.addListener(handleMessages);

function handleMessages(message) {
    if (message.target !== "offscreen") {
        return;
    }

    if (message.type === "copy-to-clipboard") {
        handleCopyToClipboard(message.data);
    }
}

// Use a textarea element to perform the copy operation.
function handleCopyToClipboard(data) {
    const textarea = document.createElement("textarea");
    textarea.value = data;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}
