/**
 * @file This file contains functions for interacting with the background script of the Chrome extension.
 * It provides a clean API for sending and receiving data from the background,
 * handling tasks such as fetching application statuses, sending application data, and generating cover letters.
 */

/**
 * Fetches the application status for a given list of job URLs.
 * This function sends a message to the background script to check the status of each URL
 * and returns a map of URL to application status.
 * @param {string[]} urls - An array of job application URLs to check.
 * @returns {Promise<Object.<string, string>>} A promise that resolves to an object mapping each URL to its application status.
 */
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

/**
 * Sends the scraped job application data to the background script for processing and storage.
 * It identifies the platform (e.g., LinkedIn, Indeed) based on the current URL.
 * @param {object} info - The scraped job application information.
 * @param {string} status - The current status of the application (e.g., "APPLIED", "INTERVIEWING").
 * @returns {Promise<boolean>} A promise that resolves to true if the data was sent successfully, false otherwise.
 */
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

/**
 * Requests a cover letter from the background script based on the provided job information and description.
 * @param {object} info - The scraped job application information.
 * @param {string} jobDescription - The full text of the job description.
 * @returns {Promise<object>} A promise that resolves with the response containing the generated cover letter.
 * If the generation fails, the promise is rejected with an error.
 */
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