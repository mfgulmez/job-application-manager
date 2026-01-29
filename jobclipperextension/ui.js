// ui.js
import { PLATFORMS } from './constants.js';
import { cleanUrl } from './utils.js';

export function extractInfo(element, platform, isDetailView) {
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
    
    if (!isDetailView) {
        const link = element.querySelector("a");
        if (link) url = link.href;
    } else {
        const titleLink = element.querySelector("h1 a");
        if (titleLink && titleLink.href && !titleLink.href.includes("javascript")) {
            url = titleLink.href;
        }
    }
    return { title, company, url: cleanUrl(url) };
}

export function createButtons(element, platform, isDetailView) {
    if (element.querySelector(".jm-actions")) return null;
    if (getComputedStyle(element).position === "static") element.style.position = "relative";

    const container = document.createElement("div");
    container.className = "jm-actions";
    
    if (isDetailView) {
        container.style.cssText = "position:absolute; top:20px; right:20px; z-index:9999; display:flex; gap:10px; background:rgba(255,255,255,0.95); padding:6px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);";
    } else {
        container.style.cssText = platform === PLATFORMS.INDEED 
            ? "position:absolute; top:0px; right:0px; z-index:900; display:flex; gap:4px; padding:2px;"
            : "position:absolute; top:10px; right:10px; z-index:900; display:flex; gap:6px;";
    }

    const btnTrack = document.createElement("button");
    btnTrack.className = "jm-tracker-btn";
    
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

    return { btnTrack, btnPrep };
}

export function updateButtonVisuals(btn, state, btnPrep, isDetailView) {
    btn.dataset.state = state;
    btn.style.cssText = isDetailView
        ? "border:none; border-radius:20px; padding:6px 12px; font-size:14px; font-weight:bold; cursor:pointer;"
        : "border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;";

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
    } else if (state === "ERROR") {
        btn.innerHTML = "⚠️";
    }
}

export function showPreviewPanel(text) {
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