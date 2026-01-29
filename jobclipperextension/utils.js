// utils.js
import { PLATFORMS, SUCCESS_INDICATORS, NOISE_WORDS } from './config.js';

// --- PLATFORM HELPERS ---
export function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("linkedin")) return PLATFORMS.LINKEDIN;
    if (host.includes("indeed")) return PLATFORMS.INDEED;
    return null;
}

export function cleanUrl(raw) {
    try {
        const u = new URL(raw);
        if (u.hostname.includes("linkedin") && u.pathname.includes("/jobs/view/")) 
            return `https://www.linkedin.com/jobs/view/${u.pathname.split("/jobs/view/")[1].split("/")[0]}`;
        if (u.hostname.includes("indeed") && u.searchParams.has("jk")) 
            return `https://www.indeed.com/viewjob?jk=${u.searchParams.get("jk")}`;
        return raw.split("?")[0];
    } catch (e) { return raw; }
}

// utils.js -> extractInfo function

export function extractInfo(element, platform, isDetailView) {
    // Helper to remove newlines, "followers", and weird spacing
    const cleanText = (text) => {
        if (!text) return null;
        return text
            .replace(/\n/g, " ")             // Remove newlines
            .replace(/\d{1,3}(,\d{3})*\s+followers/gi, "") // Remove "80,211 followers"
            .replace(/\s+/g, " ")            // Collapse multiple spaces
            .trim();
    };

    const findText = (selectors) => {
        for (const s of selectors) {
            const el = element.querySelector(s);
            // We check for length > 1 to avoid empty elements
            if (el && el.innerText && el.innerText.trim().length > 1) {
                return cleanText(el.innerText);
            }
        }
        return null;
    };

    const title = findText(platform.selectors.title) || "Unknown Title";
    const company = findText(platform.selectors.company) || "Unknown Company";
    
    let url = window.location.href;
    if (!isDetailView) {
        const link = element.querySelector("a");
        if (link) url = link.href;
    } else {
        // Try to find a link inside the H1 first
        const titleLink = element.querySelector("h1 a");
        if (titleLink && titleLink.href && !titleLink.href.includes("javascript")) {
            url = titleLink.href;
        }
    }

    return { title, company, url: cleanUrl(url) };
}

// --- DOM HELPERS ---
// utils.js

export function findAllItems(platform) {
    const items = [];
    const seenUrls = new Set(); // Track URLs to prevent duplicates

    // 1. Find List Cards
    document.querySelectorAll(platform.selectors.listCard.join(", ")).forEach(el => {
        if (el.innerText.length > 20) {
            const info = extractInfo(el, platform, false);
            if (info.url && !seenUrls.has(info.url)) {
                items.push({ element: el, type: 'LIST', info });
                seenUrls.add(info.url);
            }
        }
    });

    // 2. Find Detail Header (Strictly check if URL is already handled)
    let foundHeader = null;
    for (const selector of platform.selectors.detailHeader) {
        const el = document.querySelector(selector);
        if (el && !el.closest('.job-card-container')) {
            const info = extractInfo(el, platform, true);
            // Only add the detail header if its URL hasn't been handled in the list
            if (info.url && !seenUrls.has(info.url)) {
                items.push({ element: el, type: 'DETAIL', info });
                seenUrls.add(info.url);
            }
            break; 
        }
    }
    
    return items;
}

export function checkForSuccessText(scopeElement, isModal) {
    if (!scopeElement) return false;
    const text = scopeElement.innerText.toLowerCase();
    if (text.includes("easy apply") || text.includes("kolay başvuru")) return false;

    return SUCCESS_INDICATORS.some(phrase => {
        const index = text.indexOf(phrase);
        if (index === -1) return false;
        if (isModal) return true; 
        const context = text.substring(Math.max(0, index - 50), Math.min(text.length, index + 50));
        return !NOISE_WORDS.some(noise => context.includes(noise));
    });
}

// --- API HELPERS ---
export async function fetchBatchStatus(urls) {
    try {
        const res = await fetch("http://localhost/api/applications/check-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(urls)
        });
        if (res.ok) return await res.json();
    } catch (e) { }
    return {};
}

export async function sendData(info, status) {
    const pName = window.location.hostname.includes("indeed") ? "Indeed" : "LinkedIn";
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
}

export async function generateCoverLetter(info, desc) {
    const res = await fetch("http://localhost/api/applications/generate-materials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle: info.title, companyName: info.company, jobDescription: desc })
    });
    if (res.ok) return await res.json();
    throw new Error("API Error");
}