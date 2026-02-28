// api.js

export function fetchBatchStatus(urls) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            type: "FETCH_BATCH_STATUS",
            urls: urls
        }, (response) => {
            resolve((response && response.data) ? response.data : {});
        });
    });
}

export function sendApplicationData(info, status) {
    const pName = window.location.hostname.includes("indeed") ? "Indeed" : "LinkedIn";
    
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            type: "SEND_APPLICATION_DATA",
            info: info,
            status: status,
            pName: pName
        }, (response) => {
            resolve(response && response.success);
        });
    });
}

export function fetchCoverLetter(info, jobDescription) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: "FETCH_COVER_LETTER",
            info: info,
            jobDescription: jobDescription
        }, (response) => {
            if (response && response.coverLetter) {
                resolve(response);
            } else {
                reject(new Error("Failed to generate"));
            }
        });
    });
}