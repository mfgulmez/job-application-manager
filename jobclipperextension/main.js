/**
 * @file This script is the core of the Job Manager extension's content-side functionality.
 * It is injected into job portal pages (like LinkedIn and Indeed) to provide the user with
 * tools to track and manage their job applications directly on the page.
 *
 * The script operates on a polling mechanism (`runBatchScanner`) that periodically scans the DOM
 * for job listings. For each job found, it injects "Track Job" and "Prep" buttons.
 *
 * Key features:
 * - **Platform Detection:** Automatically detects whether the user is on a supported platform.
 * - **DOM Scanning:** Regularly scans for job postings, both in list and detail views.
 * - **Button Injection:** Adds custom buttons to each job posting to allow tracking and preparation.
 * - **State Management:** Maintains the status of each job (e.g., UNTRACKED, DRAFT, APPLIED)
 *   and keeps the UI synchronized. It uses a local cache (`statusCache`) for performance and
 *   a global state updater (`updateGlobalState`) to ensure all buttons for a given job are in sync.
 * - **"Apply" Spy:** Actively monitors for "apply" actions to automatically update a job's status
 *   to "APPLIED" after the user successfully submits an application. This involves an "aggressive check"
 *   to handle various asynchronous application flows.
 * - **Background Communication:** Communicates with the background script (`background.js`) to save
 *   application data and generate cover letters.
 */

import { PLATFORMS } from './config.js';
import { 
    detectPlatform, findAllItems, extractInfo, checkForSuccessText, 
    fetchBatchStatus, sendData, generateCoverLetter 
} from './utils.js';

// =================================================================================================
// CORE ENGINE & STATE
// =================================================================================================

/**
 * @property {Map<string, string>} statusCache - A map to cache the application status of jobs.
 * The key is the job ID, and the value is the status string (e.g., "DRAFT", "APPLIED").
 */
const statusCache = new Map(); 

/**
 * The main polling function that runs periodically to scan the page and update the UI.
 * This is the heart of the extension's content script.
 */
setInterval(runBatchScanner, 500); 

/**
 * Scans the page for job items, determines their status, and injects or updates the necessary UI elements.
 * It fetches the status of jobs in batches to minimize network requests.
 */
async function runBatchScanner() {
    const platform = detectPlatform();
    if (!platform) return;

    const windowJobId = getJobId(window.location.href);
    let items = findAllItems(platform);

    // Fallback to find a container if the primary selectors fail. This increases resilience to DOM changes.
    const detailItemFound = items.some(i => i.type === 'DETAIL');
    if (!detailItemFound) {
        const fallbackTarget = findFallbackTarget();
        if (fallbackTarget) {
            items.push({ element: fallbackTarget, type: 'DETAIL' });
        }
    }

    const itemsToProcess = [];
    const idsToCheck = [];

    items.forEach(item => {
        const isDetail = item.type === 'DETAIL';
        const isStandalonePage = window.location.pathname.includes("/jobs/view/") || 
                                 window.location.pathname.includes("/viewjob");

        // Skip detail views that are not on a standalone page (e.g., right-side panels) to avoid clutter.
        if (isDetail && !isStandalonePage) {
            return; 
        }

        let effectiveJobId = isDetail ? windowJobId : getJobId(extractInfo(item.element, platform, false).url);
        if (!effectiveJobId) return;

        // If a button exists but its job ID doesn't match the current effective ID, remove it to be re-injected.
        // This handles cases where the DOM is reused by the page's framework.
        const existingContainer = item.element.querySelector(".jm-actions");
        if (existingContainer && existingContainer.querySelector(".jm-tracker-btn")?.dataset.jobId !== effectiveJobId) {
            existingContainer.remove();
        }

        // Now that cleanup is done, either inject or audit the existing element.
        const info = extractInfo(item.element, platform, isDetail);
        if (isDetail && windowJobId) info.url = window.location.href; 
        info.url = getCanonicalUrl(info.url);

        if (statusCache.has(effectiveJobId)) {
            injectButtons(item.element, info, platform, statusCache.get(effectiveJobId), isDetail, effectiveJobId);
        } else {
            itemsToProcess.push({ element: item.element, info, jobId: effectiveJobId, type: item.type });
            if (!idsToCheck.includes(info.url)) idsToCheck.push(info.url);
            injectButtons(item.element, info, platform, "UNTRACKED", isDetail, effectiveJobId);
        }
        
        // After injection, perform a visual audit to detect if the job has been applied for.
        performVisualAudit(item, platform);
    });

    // Fetch statuses for all new items found on the page.
    if (idsToCheck.length > 0) {
        try {
            const batchResults = await fetchBatchStatus(idsToCheck);
            itemsToProcess.forEach(item => {
                const res = batchResults[item.info.url] || { status: "UNTRACKED" };
                updateGlobalState(item.jobId, res.status);
            });
        } catch (e) {
            console.error("Job Manager: Error fetching batch status.", e);
        }
    }
    
    setupApplySpy(platform);
}

// =================================================================================================
// STATE MANAGEMENT & SYNCHRONIZATION
// =================================================================================================

/**
 * Updates the global state for a given job ID and synchronizes all related UI elements.
 * This is the single source of truth for button states.
 * @param {string} jobId - The ID of the job to update.
 * @param {string} newState - The new status of the job.
 */
function updateGlobalState(jobId, newState) {
    if (!jobId) return;

    statusCache.set(jobId, newState);

    const allMatchingBtns = document.querySelectorAll(`.jm-tracker-btn[data-job-id="${jobId}"]`);
    allMatchingBtns.forEach(btn => {
        const isDetail = btn.dataset.isDetail === "true";
        setVisuals(btn, newState, null, null, isDetail);
    });
}

// =================================================================================================
// DATA & URL HANDLING
// =================================================================================================

/**
 * Extracts a unique job identifier from a URL.
 * @param {string} url - The URL of the job posting.
 * @returns {string|null} The unique job ID or null if not found.
 */
function getJobId(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        // LinkedIn uses 'currentJobId', Indeed uses 'vjk' or 'jk'.
        if (urlObj.searchParams.get("currentJobId")) return urlObj.searchParams.get("currentJobId");
        if (urlObj.searchParams.get("vjk")) return urlObj.searchParams.get("vjk");
        if (urlObj.searchParams.get("jk")) return urlObj.searchParams.get("jk");

        // Fallback for LinkedIn URLs that use the path for the job ID.
        const pathMatch = url.match(/\/jobs\/view\/(\d+)/);
        if (pathMatch) return pathMatch[1];
    } catch (e) {
        console.error("Job Manager: Could not parse URL for Job ID.", e);
    }
    return null;
}

/**
 * Normalizes a job URL to a consistent, canonical format. This is crucial for reliable caching and backend lookups.
 * @param {string} url - The raw URL.
 * @returns {string} The canonical URL.
 */
function getCanonicalUrl(url) {
    const jobId = getJobId(url);
    if (!jobId) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname; // Fallback: strip query params if no ID is found.
        } catch(e) { return url; }
    }
    
    if (url.includes("linkedin.com")) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
    }
    if (url.includes("indeed.com")) {
        return `https://www.indeed.com/viewjob?jk=${jobId}`;
    }
    return url;
}

// =================================================================================================
// DOM INTERACTION & BUTTON INJECTION
// =================================================================================================

/**
 * Finds a fallback DOM element to attach to if the primary selectors fail.
 * @returns {HTMLElement|null} The fallback element or null.
 */
function findFallbackTarget() {
    const candidates = [
        ".scaffold-layout__main", "main",
        ".jobs-details__main-content", ".jobs-search__job-details", 
        ".scaffold-layout__detail", ".job-view-layout",
        "#viewJob-container", ".jobsearch-JobComponent", ".jobsearch-ViewJobLayout"
    ];
    for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el && el.offsetHeight > 50) return el;
    }
    return null;
}

/**
 * Injects the "Track Job" and "Prep" buttons into a given DOM element.
 * @param {HTMLElement} element - The parent element for the buttons.
 * @param {object} info - The extracted job information.
 * @param {object} platform - The current platform's configuration.
 * @param {string} initialState - The initial state of the job (e.g., "UNTRACKED").
 * @param {boolean} isDetailView - True if the element is a detail view.
 * @param {string} jobId - The job's unique ID.
 */
function injectButtons(element, info, platform, initialState, isDetailView, jobId) {
    if (element.querySelector(".jm-actions")) return;

    if (getComputedStyle(element).position === "static") element.style.position = "relative";

    const container = document.createElement("div");
    container.className = "jm-actions";
    
    // Position the button container differently based on view type and platform.
    if (isDetailView) {
        container.style.cssText = `position:absolute; top:${window.location.hostname.includes("indeed") ? '0px' : '70px'}; right:${window.location.hostname.includes("indeed") ? '0px' : '24px'}; z-index:99999; display:flex; gap:10px; background:rgba(255,255,255,0.95); padding:6px; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);`;
    } else {
        container.style.cssText = platform === PLATFORMS.INDEED 
            ? "position:absolute; top:100px; right:15px; z-index:900; display:flex; gap:4px; padding:2px;"
            : "position:absolute; top:50px; right:10px; z-index:900; display:flex; gap:6px;";
    }

    const btnTrack = document.createElement("button");
    btnTrack.className = "jm-tracker-btn";
    btnTrack.dataset.jobId = jobId; 
    btnTrack.dataset.url = info.url;
    btnTrack.dataset.isDetail = isDetailView; 

    const btnPrep = document.createElement("button");
    btnPrep.className = "jm-prep-btn";

    // Style the prep button differently for detail vs. list views.
    if (isDetailView) {
        btnPrep.innerHTML = "✨ Prep";
        btnPrep.style.cssText = "border:none; background:#6f42c1; color:white; border-radius:20px; padding:6px 12px; cursor:pointer; font-weight:bold; font-size:12px; display:none;";
    } else {
        btnPrep.innerHTML = "✨";
        btnPrep.style.cssText = "border:none; background:#6f42c1; color:white; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:10px; display:none; align-items:center; justify-content:center;";
    }

    container.appendChild(btnPrep);
    container.appendChild(btnTrack);
    element.appendChild(container);

    setVisuals(btnTrack, initialState, btnPrep, null, isDetailView);

    // --- Event Handlers ---
    btnTrack.addEventListener("click", async (e) => {
        e.stopPropagation(); e.preventDefault();
        if (btnTrack.dataset.state === "LOADING") return;
        
        const freshInfo = extractInfo(element, platform, isDetailView);
        if (isDetailView) freshInfo.url = window.location.href;
        const finalInfo = (freshInfo.title && freshInfo.title !== "Unknown") ? freshInfo : info;
        finalInfo.url = getCanonicalUrl(finalInfo.url);

        if (btnTrack.dataset.state === "UNTRACKED") {
            setVisuals(btnTrack, "LOADING", btnPrep, null, isDetailView);
            const success = await sendData(finalInfo, "DRAFT");
            updateGlobalState(jobId, success ? "DRAFT" : "UNTRACKED");
            if (!success) setVisuals(btnTrack, "ERROR", btnPrep, "❌", isDetailView);
        }
    });

    btnPrep.addEventListener("click", async (e) => {
        e.stopPropagation(); e.preventDefault();
        btnPrep.innerHTML = "⏳";
        
        const freshInfo = extractInfo(element, platform, isDetailView);
        const finalInfo = (freshInfo.title && freshInfo.title !== "Unknown") ? freshInfo : info;

        let desc = "Job description not found.";
        if (isDetailView) {
            const descEl = document.querySelector("#job-details") || document.querySelector("#jobDescriptionText");
            if (descEl) desc = descEl.innerText.substring(0, 3000);
        }
        
        try {
            const data = await generateCoverLetter(finalInfo, desc);
            btnPrep.innerHTML = isDetailView ? "✨ Prep" : "✨";
            showPreviewPanel(data.coverLetter);
        } catch (err) {
            btnPrep.innerHTML = "⚠️";
            console.error("Job Manager: Failed to generate cover letter.", err);
        }
    });
}

/**
 * Updates the visual appearance of a button based on its state.
 * @param {HTMLElement} btn - The button to update.
 * @param {string} state - The new state ("UNTRACKED", "DRAFT", "APPLIED", etc.).
 * @param {HTMLElement} btnPrep - The associated prep button.
 * @param {string|null} customText - Optional text to override the default.
 * @param {boolean} isDetailView - True if the button is in a detail view.
 */
function setVisuals(btn, state, btnPrep, customText, isDetailView) {
    if (!btnPrep && btn.parentElement) btnPrep = btn.parentElement.querySelector(".jm-prep-btn");
    
    btn.dataset.state = state;
    btn.style.cssText = isDetailView
        ? "border:none; border-radius:20px; padding:6px 12px; font-size:14px; font-weight:bold; cursor:pointer;"
        : "border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;";

    if (customText) { btn.innerHTML = customText; return; }

    switch(state) {
        case "UNTRACKED":
            btn.innerHTML = isDetailView ? "➕ Track Job" : "➕";
            btn.style.background = "#0a66c2"; btn.style.color = "white";
            if (btnPrep) btnPrep.style.display = "none";
            break;
        case "DRAFT":
            btn.innerHTML = isDetailView ? "🟡 Saved" : "🟡";
            btn.style.background = "#fff3cd"; btn.style.color = "#856404";
            if (btnPrep) btnPrep.style.display = isDetailView ? "block" : "flex";
            break;
        case "APPLIED":
            btn.innerHTML = isDetailView ? "✅ Applied" : "✅";
            btn.style.background = "#d4edda"; btn.style.color = "#155724";
            if (btnPrep) btnPrep.style.display = "none";
            break;
        case "LOADING":
            btn.innerHTML = "⏳";
            btn.style.background = "#f3f2ef"; btn.style.color = "#333";
            break;
        default:
            btn.innerHTML = "⚠️";
            btn.style.background = "#f8d7da"; btn.style.color = "#721c24";
            break;
    }
}

/**
 * Displays a panel with the generated cover letter or other text.
 * @param {string} text - The text to display in the panel.
 */
function showPreviewPanel(text) {
    const existing = document.getElementById("jm-preview-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "jm-preview-panel";
    panel.style.cssText = `position: fixed; bottom: 20px; right: 20px; width: 400px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 100000; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #ccc; font-family: sans-serif;`;
    
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "flex: 1; padding: 15px; border: none; outline: none; resize: none; font-family: monospace; line-height: 1.5; font-size: 13px; color: #333;";
    
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "Close ✖";
    closeBtn.style.cssText = "padding: 10px; background: #f3f2ef; border: none; cursor: pointer; border-top: 1px solid #ccc;";
    closeBtn.onclick = () => panel.remove();
    
    panel.appendChild(textarea);
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);
}

// =================================================================================================
// EVENT HANDLING & "APPLY" SPY
// =================================================================================================

let spyInitialized = false;

/**
 * Sets up a global click listener to detect when a user clicks an "Apply" button.
 * This uses event delegation to catch clicks on buttons that may be loaded lazily.
 * @param {object} platform - The platform configuration object.
 */
function setupApplySpy(platform) {
    if (spyInitialized) return;
    spyInitialized = true;
    
    document.body.addEventListener("click", (e) => {
        const isApplyBtn = e.target.closest(platform.selectors.applyBtns.join(", "));
        if (isApplyBtn) {
            startAggressiveCheck();
        }
    }, true); // Use capture phase to prevent frameworks from blocking the event.
}

/**
 * Starts a polling mechanism to aggressively check for an application success indicator.
 * This is necessary because application success messages are often displayed asynchronously in modals.
 */
function startAggressiveCheck() {
    let checks = 0;
    const interval = setInterval(() => {
        checks++;
        if (checks > 30) { // Stop after 30 seconds to prevent infinite loops.
            clearInterval(interval);
            return;
        }
        
        let isSuccess = false;
        const modal = document.querySelector(".artdeco-modal") || document.querySelector(".ip-Modal");
        if (modal && checkForSuccessText(modal, true)) {
             isSuccess = true;
        }

        // Also check for changes in the native "Apply" button text or success banners on the page.
        if (!isSuccess && window.location.pathname.includes("/jobs/view/")) {
            const nativeBtns = document.querySelectorAll(".jobs-apply-button span.artdeco-button__text, .jobs-apply-button--top-card span.artdeco-button__text");
            for (const span of nativeBtns) {
                if (span.innerText.trim() === "Applied") {
                    isSuccess = true;
                    break;
                }
            }
            const banner = document.querySelector(".artdeco-inline-feedback--success");
            if (banner && banner.innerText.toLowerCase().includes("applied")) {
                isSuccess = true;
            }
        }

        if (isSuccess) {
             statusCache.clear(); // Clear cache to force a re-scan.
             runBatchScanner();
             clearInterval(interval);
        }
    }, 1000);
}

/**
 * Performs a visual audit of a job item to see if its status has changed to "APPLIED"
 * based on visual cues on the page.
 * @param {object} item - The job item to audit.
 * @param {object} platform - The platform configuration object.
 */
async function performVisualAudit(item, platform) {
    const btn = item.element.querySelector(".jm-tracker-btn");
    if (!btn || btn.dataset.state === "APPLIED") return;

    let scope = item.element;
    if (item.type === 'DETAIL') {
        platform.selectors.scanAreaDetail.forEach(sel => {
            const el = document.querySelector(sel);
            if (el && el.contains(item.element)) scope = el;
        });
    }

    const modal = document.querySelector(".artdeco-modal") || document.querySelector(".ip-Modal");
    let isApplied = checkForSuccessText(scope, false);
    
    // If the success indicator is in a modal, we need to associate it with the active job.
    const windowJobId = getJobId(window.location.href);
    const isActiveJob = (item.type === 'DETAIL' || btn.dataset.jobId === windowJobId);

    if (!isApplied && isActiveJob && modal) {
        isApplied = checkForSuccessText(modal, true);
    }

    // Check for native button text changes on standalone pages.
    if (!isApplied && item.type === 'DETAIL') {
        const nativeBtns = item.element.querySelectorAll(".jobs-apply-button span.artdeco-button__text, .jobs-apply-button--top-card span.artdeco-button__text");
        for (const span of nativeBtns) {
            if (span.innerText.trim() === "Applied") {
                isApplied = true;
                break;
            }
        }
        const banner = item.element.querySelector(".artdeco-inline-feedback--success");
        if (banner && banner.innerText.toLowerCase().includes("applied")) {
            isApplied = true;
        }
    }

    if (isApplied) {
        if (btn.dataset.jobId) {
            updateGlobalState(btn.dataset.jobId, "APPLIED");
            
            const info = extractInfo(item.element, platform, item.type === 'DETAIL');
            if (item.type === 'DETAIL') info.url = window.location.href;
            if (typeof getCanonicalUrl === 'function') info.url = getCanonicalUrl(info.url);
            
            try {
                await sendData(info, "APPLIED"); 
            } catch (error) {
                console.error("Job Manager: Failed to sync APPLIED state", error);
            }
        }
    }
}

// =================================================================================================
// POPUP COMMUNICATION
// =================================================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_STATUS") {
        const detectedPlatform = detectPlatform();
        let platformName = null;
        if (detectedPlatform) {
            platformName = Object.keys(PLATFORMS).find(key => PLATFORMS[key] === detectedPlatform);
        }

        let view = null;
        let count = 0;
        if (detectedPlatform) {
            const items = findAllItems(detectedPlatform);
            count = items.length;
            const isDetail = items.some(i => i.type === 'DETAIL');
            const isList = items.some(i => i.type === 'LIST');
            if (isDetail) {
                view = 'DETAIL';
            } else if (isList) {
                view = 'LIST';
            }
        }
        sendResponse({
            platform: platformName,
            view: view,
            count: count
        });
        return true; 
    }
    if (request.type === "RESCAN_PAGE") {
        statusCache.clear();
        runBatchScanner();
        sendResponse({success: true});
        return true;
    }
});