// api.js
const API_BASE = "http://localhost/api/applications";

export async function fetchBatchStatus(urls) {
    try {
        const res = await fetch(`${API_BASE}/check-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(urls)
        });
        if (res.ok) return await res.json();
    } catch (e) { console.error("Batch fetch error", e); }
    return {};
}

export async function sendApplicationData(info, status) {
    const pName = window.location.hostname.includes("indeed") ? "Indeed" : "LinkedIn";
    const res = await fetch(API_BASE, {
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

export async function fetchCoverLetter(info, jobDescription) {
    const res = await fetch(`${API_BASE}/generate-materials`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle: info.title, companyName: info.company, jobDescription })
    });
    if (res.ok) return await res.json();
    throw new Error("Failed to generate");
}