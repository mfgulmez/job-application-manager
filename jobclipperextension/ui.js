/**
 * @file This module handles the creation and management of all UI elements
 * injected into job board pages by the extension. It is responsible for extracting
 * job data from the DOM, creating buttons, updating their visual states,
 * and displaying informational panels.
 */

import { PLATFORMS } from './config.js';
import { cleanUrl } from './utils.js';

/**
 * Extracts job information (title, company, URL) from a given DOM element
 * based on the platform's specific selectors.
 * @param {HTMLElement} element The parent DOM element containing the job information.
 * @param {object} platform The platform configuration object with CSS selectors.
 * @param {boolean} isDetailView Indicates if the current view is a detailed job page.
 * @returns {{title: string, company: string, url: string}} An object containing the extracted job details.
 */
export function extractInfo(element, platform, isDetailView) {
    /**
     * Finds and returns the text content of the first matching selector.
     * @param {string[]} selectors An array of CSS selectors to try.
     * @returns {string|null} The text content of the found element or null.
     */
    const findText = (selectors) => {
        for (const s of selectors) {
            const el = element.querySelector(s);
            if (el) return el.innerText.trim();
        }
        return null;
    };

    const title = findText(platform.selectors.title) || "Unknown";
    const company = findText(platform.selectors.company) || "Unknown";
    let url = window.location.href;
    
    // In a list view, the primary link is usually the correct one.
    if (!isDetailView) {
        const link = element.querySelector("a");
        if (link) url = link.href;
    } else {
        // In a detail view, the URL in the address bar is often the canonical one,
        // but sometimes a direct link in the title is better if it's not a JS action.
        const titleLink = element.querySelector("h1 a");
        if (titleLink && titleLink.href && !titleLink.href.includes("javascript")) {
            url = titleLink.href;
        }
    }
    return { title, company, url: cleanUrl(url) };
}

/**
 * Creates and injects action buttons ("Track" and "Prep") into a job listing element.
 * @param {HTMLElement} element The job listing element to which the buttons will be added.
 * @param {object} platform The platform configuration object.
 * @param {boolean} isDetailView True if the element is on a job detail page.
 * @returns {{btnTrack: HTMLButtonElement, btnPrep: HTMLButtonElement}|null} An object with the created buttons, or null if they already exist.
 */
export function createButtons(element, platform, isDetailView) {
    // Avoid adding buttons to an element that already has them.
    if (element.querySelector(".jm-actions")) return null;
    // Ensure the parent element can contain our absolutely positioned buttons.
    if (getComputedStyle(element).position === "static") element.style.position = "relative";

    const container = document.createElement("div");
    container.className = "jm-actions";
    
    // Apply different positioning styles based on the view type (list vs. detail).
    if (isDetailView) {
        // Detail pages get a more prominent, floating-style button group.
        container.style.cssText = "position:absolute; top:20px; right:20px; z-index:9999; display:flex; gap:10px; background:rgba(255,255,255,0.95); padding:6px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);";
    } else {
        // List items get more compact buttons.
        container.style.cssText = platform === PLATFORMS.INDEED 
            // Indeed's list view requires special positioning due to its dense layout.
            ? "position:absolute; top:0px; right:0px; z-index:900; display:flex; gap:4px; padding:2px;"
            // A generic style for other platforms.
            : "position:absolute; top:10px; right:10px; z-index:900; display:flex; gap:6px;";
    }

    const btnTrack = document.createElement("button");
    btnTrack.className = "jm-tracker-btn";
    
    const btnPrep = document.createElement("button");
    btnPrep.className = "jm-prep-btn";

    // The "Prep" button has different styles for detail vs. list views.
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

    return { btnTrack, btnPrep };
}

/**
 * Updates the visual style and text of the tracking button based on the job's state.
 * @param {HTMLButtonElement} btn The tracking button element.
 * @param {'UNTRACKED'|'DRAFT'|'APPLIED'|'LOADING'|'ERROR'} state The current tracking state of the job.
 * @param {HTMLButtonElement} btnPrep The preparation button, which is shown/hidden based on state.
 * @param {boolean} isDetailView True if the button is on a job detail page.
 */
export function updateButtonVisuals(btn, state, btnPrep, isDetailView) {
    btn.dataset.state = state;
    // Base styles for all button states, differing only by view type.
    btn.style.cssText = isDetailView
        ? "border:none; border-radius:20px; padding:6px 12px; font-size:14px; font-weight:bold; cursor:pointer;"
        : "border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;";

    // State-specific styles and content.
    if (state === "UNTRACKED") {
        btn.innerHTML = isDetailView ? "➕ Track Job" : "➕";
        btn.style.background = "#0a66c2"; btn.style.color = "white";
        if (btnPrep) btnPrep.style.display = "none";
    } else if (state === "DRAFT") {
        btn.innerHTML = isDetailView ? "🟡 Saved" : "🟡";
        btn.style.background = "#fff3cd"; btn.style.color = "#856404";
        // Show the "Prep" button when a job is saved but not yet applied.
        if (btnPrep) btnPrep.style.display = isDetailView ? "block" : "flex";
    } else if (state === "APPLIED") {
        btn.innerHTML = isDetailView ? "✅ Applied" : "✅";
        btn.style.background = "#d4edda"; btn.style.color = "#155724";
        if (btnPrep) btnPrep.style.display = "none";
    } else if (state === "LOADING") {
        btn.innerHTML = "⏳";
    } else if (state === "ERROR") {
        btn.innerHTML = "⚠️";
    }
}

/**
 * Displays a floating panel for showing text content, like a generated cover letter.
 * @param {string} text The content to display inside the panel's textarea.
 */
export function showPreviewPanel(text) {
    // Remove any existing panel to avoid duplicates.
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