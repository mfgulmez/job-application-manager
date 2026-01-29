// main.js
import { PLATFORMS } from './config.js';
import { 
    detectPlatform, findAllItems, extractInfo, checkForSuccessText, 
    fetchBatchStatus, sendData, generateCoverLetter 
} from './utils.js';

console.log("Job Manager Co-Pilot: SYNC SYSTEM ACTIVATED 🔄");

const statusCache = new Map(); 

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

function performVisualAudit(item, platform) {
    const btn = item.element.querySelector(".jm-tracker-btn");
    // If we've already synced this as APPLIED, skip
    if (!btn || btn.dataset.state === "APPLIED") return;

    let scope = item.element;
    if (item.type === 'DETAIL') {
        platform.selectors.scanAreaDetail.forEach(sel => {
            const el = document.querySelector(sel);
            if (el && el.contains(item.element)) scope = el;
        });
    }

    const modal = document.querySelector(".artdeco-modal") || document.querySelector(".ip-Modal");
    if (checkForSuccessText(scope, false) || (modal && checkForSuccessText(modal, true))) {
        // Use global sync
        if (btn.dataset.jobId) updateGlobalState(btn.dataset.jobId, "APPLIED");
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
            container.style.cssText = "position:absolute; top:0px; right:100px; z-index:99999; display:flex; gap:10px; background:rgba(255,255,255,0.9); padding:4px; border-radius:8px;";
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

function setupApplySpy(platform) {
    const btns = document.querySelectorAll(platform.selectors.applyBtns.join(", "));
    btns.forEach(btn => {
        if (btn.dataset.jmSpyAttached) return;
        btn.dataset.jmSpyAttached = "true";
        btn.addEventListener("click", () => startAggressiveCheck());
    });
}

function startAggressiveCheck() {
    let checks = 0;
    const interval = setInterval(() => {
        checks++;
        if (checks > 30) clearInterval(interval);
        const modal = document.querySelector(".artdeco-modal") || document.querySelector(".ip-Modal");
        if (modal && checkForSuccessText(modal, true)) {
             statusCache.clear(); 
             runBatchScanner();
             clearInterval(interval);
        }
        if (checkForSuccessText(document.body, false)) {
            statusCache.clear();
            runBatchScanner();
            clearInterval(interval);
        }
    }, 1000);
}