/**
 * @fileoverview This script controls the logic for the extension's popup UI.
 * It acts as a mini-dashboard, providing status information and actions to the user.
 * It communicates with the content script to get page-specific data and with the
 * backend to get application-wide stats.
 */

// @todo: Make the dashboard URL configurable.
const DASHBOARD_URL = "http://localhost";
const API_URL = "http://localhost/api/applications/stats";

/**
 * Updates the DOM with the provided status.
 * @param {string} icon The emoji icon to display.
 * @param {string} message The status message to show.
 */
function updateStatus(icon, message) {
    document.getElementById('status-icon').textContent = icon;
    document.getElementById('status-message').textContent = message;
}

/**
 * Fetches and displays summary statistics from the backend.
 */
async function loadStats() {
    try {
        // @todo: Replace with a more secure authentication method.
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const stats = await response.json();
        
        document.getElementById('total-tracked').textContent = stats.totalApplications || 0;
        document.getElementById('total-applied').textContent = stats.statusBreakdown?.APPLIED || 0;
    } catch (error) {
        console.warn("Popup: Could not load stats.", error.message);
        document.getElementById('total-tracked').textContent = 'N/A';
        document.getElementById('total-applied').textContent = 'N/A';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = 'Could not connect to server for stats.';
        errorDiv.style.display = 'block';
    }
}

/**
 * Communicates with the content script to get information about the current page.
 */
async function getPageStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // A tab might not be ready or could be a chrome:// page.
    if (!tab || !tab.id || !tab.url.startsWith('http')) {
        updateStatus('❓', 'This is not a web page.');
        document.getElementById('rescan-btn').disabled = true;
        return;
    }

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_STATUS" });
        if (response) {
            handlePageStatusResponse(response);
        } else {
            updateStatus('⚠️', "Page not responding. Try reloading.");
            document.getElementById('rescan-btn').disabled = true;
        }
    } catch (error) {
        // This error often means the content script isn't injected on the current page.
        console.info("Popup: Content script not available on this page.", error.message);
        updateStatus('📄', "This page is not a supported job platform.");
        document.getElementById('rescan-btn').style.display = 'none'; // Hide rescan if page is not supported
    }
}

/**
 * Handles the response from the content script and updates the UI accordingly.
 * @param {object} response The status object from the content script.
 */
function handlePageStatusResponse(response) {
    if (!response.platform) {
        updateStatus('🤔', "Not a recognized job page.");
        return;
    }

    let message = `On ${response.platform}, viewing a job `;
    if (response.view === 'LIST') {
        message += 'list.';
    } else if (response.view === 'DETAIL') {
        message += 'detail page.';
    } else {
        message += 'page.'
    }
    updateStatus('💼', message);

    const infoDiv = document.getElementById('info');
    infoDiv.textContent = `${response.count} jobs found on this page.`;
    infoDiv.style.display = 'block';
}

/**
 * Handles the click event for the "Rescan Page" button.
 */
async function handleRescanClick() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: "RESCAN_PAGE" });
            window.close(); // Close popup after sending message
        } catch (error) {
            console.warn("Popup: Could not send rescan message.", error.message);
        }
    }
}

/**
 * Initializes the popup, fetches data, and sets up event listeners.
 */
function initialize() {
    // Show loader and hide main content initially
    document.getElementById('loader').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';

    document.getElementById('dashboard-link').href = DASHBOARD_URL;
    document.getElementById('rescan-btn').addEventListener('click', handleRescanClick);

    // Load async data
    Promise.all([
        loadStats(),
        getPageStatus()
    ]).finally(() => {
        // Hide loader and show main content
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });
}

// Run the initialization logic when the popup is opened.
document.addEventListener('DOMContentLoaded', initialize);