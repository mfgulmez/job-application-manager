// background.js
const API_BASE = "http://localhost/api/applications";

// Listen for messages from api.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 1. Handle Saving Job Statuses
    if (request.type === "SEND_APPLICATION_DATA") {
        fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                jobTitle: request.info.title, 
                companyName: request.info.company, 
                jobUrl: request.info.url, 
                platformName: request.pName, 
                status: request.status 
            })
        })
        .then(res => sendResponse({ success: res.ok }))
        .catch(err => {
            console.error("Background fetch error:", err);
            sendResponse({ success: false });
        });
        
        return true; // Keeps the message channel open for the async response
    }

    // 2. Handle Batch Status Checks
    if (request.type === "FETCH_BATCH_STATUS") {
        fetch(`${API_BASE}/check-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.urls)
        })
        .then(res => res.ok ? res.json() : {})
        .then(data => sendResponse({ data }))
        .catch(err => sendResponse({ data: {} }));
        
        return true;
    }

    // 3. Handle Cover Letter Generation
    if (request.type === "FETCH_COVER_LETTER") {
        fetch(`${API_BASE}/generate-materials`, {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                jobTitle: request.info.title, 
                companyName: request.info.company, 
                jobDescription: request.jobDescription 
            })
        })
        .then(res => res.ok ? res.json() : { error: "Failed" })
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ error: err.message }));

        return true;
    }
});