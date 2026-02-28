/**
 * @fileoverview This module provides a set of utility functions for the extension.
 * These helpers handle tasks such as platform detection, URL sanitization,
 * DOM inspection for job data, and communication with the backend API.
 */

import { PLATFORMS, SUCCESS_INDICATORS, NOISE_WORDS } from './config.js';

// --- PLATFORM & URL HELPERS ---

/**
 * Detects the current job platform based on the window's hostname.
 * @returns {object|null} The platform configuration object from config.js or null if unsupported.
 */
export function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("linkedin")) return PLATFORMS.LINKEDIN;
    if (host.includes("indeed")) return PLATFORMS.INDEED;
    return null;
}

/**
 * Cleans a raw URL to create a canonical, tracker-free version.
 * This is crucial for reliably identifying and de-duplicating jobs.
 * @param {string} raw The original URL, which may contain tracking parameters.
 * @returns {string} A cleaned, canonical URL for the job posting.
 */
export function cleanUrl(raw) {
    try {
        const u = new URL(raw);
        // For LinkedIn, the canonical URL is based on the job ID in the path.
        if (u.hostname.includes("linkedin") && u.pathname.includes("/jobs/view/")) {
            const jobId = u.pathname.split("/jobs/view/")[1].split("/")[0];
            return `https://www.linkedin.com/jobs/view/${jobId}`;
        }
        // For Indeed, the 'jk' parameter is the unique job key.
        if (u.hostname.includes("indeed") && u.searchParams.has("jk")) {
            return `https://www.indeed.com/viewjob?jk=${u.searchParams.get("jk")}`;
        }
        // For other URLs, a simple approach is to remove all query parameters.
        return raw.split("?")[0];
    } catch (e) {
        // If the URL is malformed, return it as is.
        return raw;
    }
}


// --- DOM EXTRACTION HELPERS ---

/**
 * Extracts job information (title, company, URL) from a given DOM element.
 * @param {HTMLElement} element The parent DOM element containing the job information.
 * @param {object} platform The platform configuration object with CSS selectors.
 * @param {boolean} isDetailView Indicates if the current view is a detailed job page.
 * @returns {{title: string, company: string, url: string}} An object containing the extracted job details.
 */
export function extractInfo(element, platform, isDetailView) {
    /**
     * Cleans common artifacts from text scraped from job sites.
     * @param {string} text The raw text.
     * @returns {string|null} The cleaned text or null.
     */
    const cleanText = (text) => {
        if (!text) return null;
        return text
            .replace(/\n/g, " ")             // Remove newlines
            .replace(/\d{1,3}(,\d{3})*\s+followers/gi, "") // Remove follower counts (e.g., "80,211 followers")
            .replace(/\s+/g, " ")            // Collapse multiple whitespace characters
            .trim();
    };

    /**
     * Finds and returns the cleaned text content of the first matching selector.
     * @param {string[]} selectors An array of CSS selectors to try.
     * @returns {string|null} The cleaned text content of the found element or null.
     */
    const findText = (selectors) => {
        for (const s of selectors) {
            const el = element.querySelector(s);
            // Check for non-trivial text content to avoid empty or whitespace-only elements.
            if (el && el.innerText && el.innerText.trim().length > 1) {
                return cleanText(el.innerText);
            }
        }
        return null;
    };

    const title = findText(platform.selectors.title) || "Unknown Title";
    const company = findText(platform.selectors.company) || "Unknown Company";
    
    let url = window.location.href;
    // In a list view, find the specific link for the job item.
    if (!isDetailView) {
        const link = element.querySelector("a");
        if (link) url = link.href;
    } else {
        // In a detail view, the page URL is the default, but a link in the H1 might be a better canonical URL.
        const titleLink = element.querySelector("h1 a");
        if (titleLink && titleLink.href && !titleLink.href.includes("javascript")) {
            url = titleLink.href;
        }
    }

    return { title, company, url: cleanUrl(url) };
}

/**
 * Finds all relevant job items on the current page, for both list and detail views.
 * @param {object} platform The platform configuration object.
 * @returns {Array<{element: HTMLElement, type: 'LIST'|'DETAIL', info: object}>} An array of found job items.
 */
export function findAllItems(platform) {
    const items = [];
    const seenUrls = new Set(); // Use a Set to track seen URLs and prevent duplicate entries.

    // 1. Find all job cards in the list view.
    const listCardSelectors = platform.selectors.listCard.join(", ");
    document.querySelectorAll(listCardSelectors).forEach(el => {
        // Basic filter to ignore empty or invalid elements.
        if (el.innerText.length > 20) {
            const info = extractInfo(el, platform, false);
            if (info.url && !seenUrls.has(info.url)) {
                items.push({ element: el, type: 'LIST', info });
                seenUrls.add(info.url);
            }
        }
    });

    // 2. Find the header element in the detail view.
    for (const selector of platform.selectors.detailHeader) {
        const el = document.querySelector(selector);
        // Ensure the found element is not part of a list card (e.g., a recommended job).
        if (el && !el.closest('.job-card-container')) {
            const info = extractInfo(el, platform, true);
            // Only add the detail view item if it hasn't already been processed as a list item.
            if (info.url && !seenUrls.has(info.url)) {
                items.push({ element: el, type: 'DETAIL', info });
                seenUrls.add(info.url);
            }
            break; // Stop after finding the first valid detail header.
        }
    }
    
    return items;
}

/**
 * Checks if a given element contains text indicating a successful application.
 * @param {HTMLElement} scopeElement The element to search within (e.g., a modal or the whole document).
 * @param {boolean} isModal Indicates if the search scope is a modal, which requires less strict checking.
 * @returns {boolean} True if a success message is found.
 */
export function checkForSuccessText(scopeElement, isModal) {
    if (!scopeElement) return false;
    const text = scopeElement.innerText.toLowerCase();
    
    // Ignore "Easy Apply" buttons, which are not confirmation messages.
    if (text.includes("easy apply") || text.includes("kolay başvuru")) return false;

    return SUCCESS_INDICATORS.some(phrase => {
        const index = text.indexOf(phrase);
        if (index === -1) return false;

        // For modals, the presence of the phrase is enough.
        if (isModal) return true; 

        // For full-page scans, check the context to avoid false positives.
        // Example: "Your application for... was sent" vs. "You withdrew your application".
        const context = text.substring(Math.max(0, index - 50), Math.min(text.length, index + 50));
        return !NOISE_WORDS.some(noise => context.includes(noise));
    });
}

// --- API HELPERS ---
// @todo: Move API endpoint URLs to the configuration file.

/**
 * Fetches the tracking status for a batch of job URLs from the backend.
 * @param {string[]} urls An array of cleaned job URLs.
 * @returns {Promise<Object>} A promise that resolves to a map of URL -> Status.
 */
export async function fetchBatchStatus(urls) {
    try {
        const res = await fetch("http://localhost/api/applications/check-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(urls)
        });
        if (res.ok) return await res.json();
    } catch (e) {
        console.error("JM-Ext: Batch status fetch failed.", e);
    }
    return {}; // Return an empty object on failure.
}

/**
 * Sends job application data to the backend to be saved.
 * @param {object} info The extracted job info ({ title, company, url }).
 * @param {string} status The status of the application (e.g., 'DRAFT').
 * @returns {Promise<boolean>} True if the data was sent successfully.
 */
export async function sendData(info, status) {
    // @todo: The platform name should be passed in, not derived here.
    const pName = window.location.hostname.includes("indeed") ? "Indeed" : "LinkedIn";
    try {
        const res = await fetch("http://localhost/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                jobTitle: info.title, 
                companyName: info.company, 
                jobUrl: info.url, 
                platformName: pName, 
                status: status 
            })
        });
        return res.ok;
    } catch (e) {
        console.error("JM-Ext: Failed to send data.", e);
        return false;
    }
}

/**
 * Requests the backend to generate application materials (e.g., a cover letter).
 * @param {object} info The extracted job info.
 * @param {string} desc The job description text.
 * @returns {Promise<object>} A promise that resolves with the generated materials.
 * @throws Will throw an error if the API call fails.
 */
export async function generateCoverLetter(info, desc) {
    const res = await fetch("http://localhost/api/applications/generate-materials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle: info.title, companyName: info.company, jobDescription: desc })
    });
    if (res.ok) return await res.json();
    throw new Error("API Error: Failed to generate materials.");
}