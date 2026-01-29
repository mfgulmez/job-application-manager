// popup.js
import { API_BASE } from './config.js'; // <--- Import shared config

document.getElementById("saveBtn").addEventListener("click", async () => {
    const statusDiv = document.getElementById("status");
    const selectedStatus = document.getElementById("statusSelect").value;
    
    statusDiv.textContent = "Extracting...";
    statusDiv.className = "";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapeJobDetails,
    }, async (results) => {
        if (!results || !results[0] || !results[0].result) {
            statusDiv.textContent = "Failed to scrape page.";
            statusDiv.className = "error";
            return;
        }

        const jobData = results[0].result;
        statusDiv.textContent = `Found: ${jobData.jobTitle}`;

        try {
            // Use the imported variable instead of hardcoding
            const response = await fetch(API_BASE, { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: jobData.companyName,
                    jobTitle: jobData.jobTitle,
                    jobUrl: jobData.jobUrl,
                    platformName: jobData.platformName,
                    status: selectedStatus 
                })
            });

            if (response.ok) {
                statusDiv.textContent = "✅ Saved Successfully!";
                statusDiv.className = "success";
                setTimeout(() => window.close(), 1000);
            } else {
                statusDiv.textContent = "❌ Server Error";
                statusDiv.className = "error";
            }
        } catch (err) {
            console.error(err);
            statusDiv.textContent = "❌ Connection Refused";
            statusDiv.className = "error";
        }
    });
});

// Keep this function self-contained (no imports inside it)
// because it runs inside the browser tab, not the extension.
function scrapeJobDetails() {
    let company = "Unknown Company";
    // ... (Your existing scraping logic is fine here)
    // ...
    return {
        companyName: company,
        jobTitle: title, // ensure 'title' is defined in your full code
        jobUrl: window.location.href,
        platformName: platform // ensure 'platform' is defined
    };
}