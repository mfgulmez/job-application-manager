/**
 * @file background.js
 * This script acts as the central hub for the Chrome extension, running in the background to handle
 * communication between the content scripts (and other parts of the extension) and external APIs.
 * It is responsible for processing data, making API calls, and managing the extension's state.
 */

const API_BASE = "http://localhost/api/applications";

/**
 * Listens for incoming messages from other parts of the extension, such as content scripts.
 * This is the primary message handler and router for the extension.
 * It expects messages to have a `type` property to determine the action to take.
 *
 * @param {object} request - The message payload sent by the caller.
 * @param {object} sender - Information about the script that sent the message.
 * @param {function} sendResponse - A function to call to send a response back to the message sender.
 * @returns {boolean} - Returns true to indicate that the response will be sent asynchronously.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    /**
     * Handles the "SEND_APPLICATION_DATA" message type.
     * This action is triggered when a user saves a new job application.
     * It sends the application data to the backend API to be saved in the database.
     */
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
        
        return true; // Indicates an asynchronous response.
    }

    /**
     * Handles the "FETCH_BATCH_STATUS" message type.
     * This is used to check the application status for multiple job URLs at once.
     * It sends a list of URLs to the backend and receives their current statuses.
     */
    if (request.type === "FETCH_BATCH_STATUS") {
        fetch(`${API_BASE}/check-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.urls)
        })
        .then(res => res.ok ? res.json() : {})
        .then(data => sendResponse({ data }))
        .catch(err => sendResponse({ data: {} }));
        
        return true; // Indicates an asynchronous response.
    }

    /**
     * Handles the "FETCH_COVER_LETTER" message type.
     * This action is triggered when the user requests to generate a cover letter or other materials.
     * It sends the job details to a special generation endpoint on the backend.
     */
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

        return true; // Indicates an asynchronous response.
    }
});