// main.js
import { PLATFORMS } from './config.js';
import { 
    detectPlatform, findAllItems, extractInfo, checkForSuccessText, 
    fetchBatchStatus, sendData, generateCoverLetter 
} from './utils.js';

console.log("Job Manager Co-Pilot: SYNC SYSTEM ACTIVATED 🔄");

const statusCache = new Map(); 
const spyAttachedSet = new WeakSet();

// --- HELPER: Get Job ID ---
function getJobId(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        // LinkedIn
        if (urlObj.searchParams.get("currentJobId")) return urlObj.searchParams.get("currentJobId");
        
        // Indeed
        if (urlObj.searchParams.get("vjk")) return urlObj.searchParams.get("vjk");
        if (urlObj.searchParams.get("jk")) return urlObj.searchParams.get("jk");

        // LinkedIn Path Match
        const pathMatch = url.match(/\/jobs\/view\/(\d+)/);
        if (pathMatch) return pathMatch[1];
    } catch (e) { }
    return null;
}

function getCanonicalUrl(url) {
    const jobId = getJobId(url);
    if (!jobId) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname; // Fallback: strip query params
        } catch(e) { return url; }
    }
    
    // Always return a clean, exact matching URL format
    if (url.includes("linkedin.com")) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
    }
    if (url.includes("indeed.com")) {
        return `https://www.indeed.com/viewjob?jk=${jobId}`;
    }
    return url;
}

// --- GLOBAL POLLER ---
setInterval(runBatchScanner, 500); 

async function runBatchScanner() {
    const platform = detectPlatform();
    if (!platform) return;

    const windowJobId = getJobId(window.location.href);
    let items = findAllItems(platform);

    // Safety Net for finding containers
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

        // 🛡️ THE NEW RULE: If it's a Detail View but NOT a Standalone page 
        // (e.g., the right side of Recommended Jobs), skip it completely!
        if (isDetail && !isStandalonePage) {
            return; 
        }
        let effectiveJobId = null;
        if (isDetail) {
             effectiveJobId = windowJobId;
        } else {
             const tempInfo = extractInfo(item.element, platform, false);
             effectiveJobId = getJobId(tempInfo.url);
        }

        if (!effectiveJobId) return;

        // Cleanup stale buttons
        const existingContainer = item.element.querySelector(".jm-actions");
        const btnTrack = existingContainer ? existingContainer.querySelector(".jm-tracker-btn") : null;

        if (existingContainer && btnTrack) {
            const currentBtnId = btnTrack.dataset.jobId;
            if (currentBtnId && currentBtnId !== effectiveJobId) {
                existingContainer.remove(); 
            } else {
                performVisualAudit(item, platform);
                return;
            }
        }

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
    });

    if (idsToCheck.length > 0) {
        try {
            const batchResults = await fetchBatchStatus(idsToCheck);
            itemsToProcess.forEach(item => {
                const res = batchResults[item.info.url] || { status: "UNTRACKED" };
                // Use global sync to update cache and all buttons
                updateGlobalState(item.jobId, res.status);
            });
        } catch (e) { }
    }
    
    setupApplySpy(platform);
}

// --- NEW HELPER: Synchronize All Buttons ---
function updateGlobalState(jobId, newState) {
    if (!jobId) return;

    // 1. Update Cache
    statusCache.set(jobId, newState);

    // 2. Find ALL buttons in the DOM with this Job ID
    const allMatchingBtns = document.querySelectorAll(`.jm-tracker-btn[data-job-id="${jobId}"]`);
    
    // 3. Update them all instantly
    allMatchingBtns.forEach(btn => {
        // We stored 'isDetail' in the dataset during injection (see injectButtons below)
        const isDetail = btn.dataset.isDetail === "true";
        setVisuals(btn, newState, null, null, isDetail);
    });
}

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
    
    // 🛡️ THE FIX: Connect the success modal to the currently active job!
    // If this list card's ID matches the active job ID in the URL, it claims the success.
    const windowJobId = getJobId(window.location.href);
    const isActiveJob = (item.type === 'DETAIL' || btn.dataset.jobId === windowJobId);

    if (!isApplied && isActiveJob && modal) {
        isApplied = checkForSuccessText(modal, true);
    }

    // Safely read the native button text on the Standalone page
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
                // This now securely sends through background.js!
                await sendData(info, "APPLIED"); 
            } catch (error) {
                console.error("Job Manager: Failed to sync APPLIED state", error);
            }
        }
    }
}

function injectButtons(element, info, platform, initialState, isDetailView, jobId) {
    if (element.querySelector(".jm-actions")) return;

    if (getComputedStyle(element).position === "static") element.style.position = "relative";

    const container = document.createElement("div");
    container.className = "jm-actions";
    
    if (isDetailView) {
        const isIndeed = window.location.hostname.includes("indeed");
        if (isIndeed) {
            container.style.cssText = "position:absolute; top:0px; right:0px; z-index:99999; display:flex; gap:10px; background:rgba(255,255,255,0.9); padding:4px; border-radius:8px;";
        } else {
            // LinkedIn Default Position
            container.style.cssText = "position:absolute; top:70px; right:24px; z-index:999999; display:flex; gap:10px; background:rgba(255,255,255,0.95); padding:6px; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);";
        }
    } else {
        container.style.cssText = platform === PLATFORMS.INDEED 
            ? "position:absolute; top:100px; right:15px; z-index:900; display:flex; gap:4px; padding:2px;"
            : "position:absolute; top:50px; right:10px; z-index:900; display:flex; gap:6px;";
    }

    const btnTrack = document.createElement("button");
    btnTrack.className = "jm-tracker-btn";
    btnTrack.dataset.jobId = jobId; 
    btnTrack.dataset.url = info.url;
    // Store view type so global sync knows how to style it later
    btnTrack.dataset.isDetail = isDetailView; 

    const btnPrep = document.createElement("button");
    btnPrep.className = "jm-prep-btn";

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

    // --- CLICK HANDLER ---
    btnTrack.addEventListener("click", async (e) => {
        e.stopPropagation(); e.preventDefault();
        if (btnTrack.innerHTML === "⏳") return;
        
        const freshInfo = extractInfo(element, platform, isDetailView);
        if (isDetailView) freshInfo.url = window.location.href;
        const finalInfo = (freshInfo.title && freshInfo.title !== "Unknown") ? freshInfo : info;
        finalInfo.url = getCanonicalUrl(finalInfo.url);
        if (btnTrack.dataset.state === "UNTRACKED") {
            // Set Loading VISUALLY on this button immediately for feedback
            setVisuals(btnTrack, "LOADING", btnPrep, null, isDetailView);
            
            const success = await sendData(finalInfo, "DRAFT");
            
            if (success) {
                // SUCCESS: Broadcast "DRAFT" to ALL buttons (List + Detail)
                updateGlobalState(jobId, "DRAFT");
            } else {
                // FAIL: Revert
                setVisuals(btnTrack, "UNTRACKED", btnPrep, null, isDetailView);
                btnTrack.innerHTML = "❌";
            }
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
        } catch (e) { btnPrep.innerHTML = "⚠️"; }
    });
}

function setVisuals(btn, state, btnPrep, customText, isDetailView) {
    if (!btnPrep && btn.parentElement) btnPrep = btn.parentElement.querySelector(".jm-prep-btn");
    
    btn.dataset.state = state;
    btn.style.cssText = isDetailView
        ? "border:none; border-radius:20px; padding:6px 12px; font-size:14px; font-weight:bold; cursor:pointer;"
        : "border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;";

    if (customText) { btn.innerHTML = customText; return; }

    if (state === "UNTRACKED") {
        btn.innerHTML = isDetailView ? "➕ Track Job" : "➕";
        btn.style.background = "#0a66c2"; btn.style.color = "white";
        if (btnPrep) btnPrep.style.display = "none";
    } else if (state === "DRAFT") {
        btn.innerHTML = isDetailView ? "🟡 Saved" : "🟡";
        btn.style.background = "#fff3cd"; btn.style.color = "#856404";
        if (btnPrep) btnPrep.style.display = isDetailView ? "block" : "flex";
    } else if (state === "APPLIED") {
        btn.innerHTML = isDetailView ? "✅ Applied" : "✅";
        btn.style.background = "#d4edda"; btn.style.color = "#155724";
        if (btnPrep) btnPrep.style.display = "none";
    } else if (state === "LOADING") {
        btn.innerHTML = "⏳";
        btn.style.background = "#f3f2ef"; btn.style.color = "#333";
    }
}

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

// 🛡️ THE FIX: Event Delegation prevents React Hydration Errors and catches lazy-loaded buttons
let spyInitialized = false;
function setupApplySpy(platform) {
    if (spyInitialized) return;
    spyInitialized = true;
    
    document.body.addEventListener("click", (e) => {
        const isApplyBtn = e.target.closest(platform.selectors.applyBtns.join(", "));
        if (isApplyBtn) {
            startAggressiveCheck();
        }
    }, true); // 'true' ensures React cannot block our listener
}

function startAggressiveCheck() {
    let checks = 0;
    const interval = setInterval(() => {
        checks++;
        if (checks > 30) clearInterval(interval);
        
        let isSuccess = false;
        const modal = document.querySelector(".artdeco-modal") || document.querySelector(".ip-Modal");
        if (modal && checkForSuccessText(modal, true)) {
             isSuccess = true;
        }

        // 🛡️ THE FIX: Ensure the timer watches the native button on the Standalone page
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
             statusCache.clear(); 
             runBatchScanner();
             clearInterval(interval);
        }
    }, 1000);
}