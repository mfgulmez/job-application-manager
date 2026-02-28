/**
 * @file This configuration file centralizes all the static data and settings required for the job clipper extension.
 * It includes API endpoints, keywords for job filtering, CSS selectors for web scraping, and other constants.
 * Keeping these values in a single file makes them easier to manage and update.
 */

/**
 * The base URL for the backend API. All API requests will be made relative to this URL.
 */
export const API_BASE = "http://localhost/api/applications";

/**
 * An array of keywords used to identify relevant job titles and descriptions.
 * This helps in automatically highlighting or filtering jobs that match the user's interests.
 * The keywords cover various terms for software engineering roles in both English and Turkish.
 */
export const KEYWORDS = ["java", "spring", "software engineer", "backend", "developer", "yazılım", "geliştirici", "uzman", "data engineer"];

/**
 * A list of strings that indicate a successful job application.
 * These are used to detect when a user has completed the application process on a job platform.
 * The indicators include phrases in both English and Turkish.
 */
export const SUCCESS_INDICATORS = [
    "applied", "başvuruldu", "application sent", "başvuru gönderildi", 
    "application submitted", "applied on", "resume sent", "your application was sent"
];

/**
 * A collection of words to be ignored when parsing text for relevant information.
 * These words are typically found near important data but are not part of the data itself
 * (e.g., labels like "applicants" or "views").
 */
export const NOISE_WORDS = ["applicants", "people", "kişi", "connections", "alumni", "compare", "views", "görüntülenme"];

/**
 * A comprehensive configuration object for each supported job platform (e.g., LinkedIn, Indeed).
 * Each platform object contains:
 * - `domain`: The domain name of the platform, used to identify the current site.
 * - `selectors`: A map of CSS selectors used to scrape specific data from the platform's pages.
 *   - `listCard`: Selectors for identifying individual job listings in a search results page.
 *   - `detailHeader`: Selectors for the main header of a job details page.
 *   - `scanAreaDetail`: Selectors for the area containing the detailed job description.
 *   - `applyBtns`: Selectors for the "Apply" button.
 *   - `title`: Selectors for the job title.
 *   - `company`: Selectors for the company name.
 * The selectors are arrays of strings to provide fallbacks if a platform updates its UI.
 */
export const PLATFORMS = {
    LINKEDIN: {
        domain: "linkedin.com",
        selectors: {
            listCard: [".scaffold-layout__main", ".job-card-container", ".jobs-search-results__list-item", "li.jobs-search-results__list-item"],
            detailHeader: [".job-details-jobs-unified-top-card", ".jobs-unified-top-card", ".jobs-details-top-card", ".jobs-details__main-content", ".job-view-layout"],
            scanAreaDetail: [".jobs-search__job-details", ".job-view-layout", ".artdeco-modal", ".jobs-details__main-content"], 
            applyBtns: [".jobs-apply-button", ".jobs-apply-button--top-card", "button[aria-label*='Apply']"],
            title: [".job-details-jobs-unified-top-card__job-title h1", ".jobs-unified-top-card__job-title h1", ".jobs-details-top-card__job-title h1", "h1", ".job-card-list__title strong", ".job-card-container__link strong", "a strong", ".artdeco-entity-lockup__title", ".job-card-list__title"],
            company: [".job-details-jobs-unified-top-card__company-name a", ".jobs-unified-top-card__company-name a", ".jobs-details-top-card__company-info a", ".artdeco-entity-lockup__subtitle", ".job-card-container__company-name", ".job-card-container__primary-description"]
        }
    },
    INDEED: {
        domain: "indeed.com",
        selectors: {
            listCard: [".job_seen_beacon", ".resultContent", ".cardOutline", "[data-testid='job-card']", "td.result"],
            detailHeader: [".jobsearch-JobComponent-header", ".jobsearch-InfoHeaderContainer", ".jobsearch-JobComponent", "#viewJob-container"],
            scanAreaDetail: [".jobsearch-JobComponent", "#viewJob-container"],
            applyBtns: ["#indeedApplyButton", ".jobsearch-JobInfoHeader-applyButton", "button[id*='Apply']"],
            title: ["h2.jobsearch-JobInfoHeader-title", "[data-testid='jobsearch-JobInfoHeader-title']", "h1", "h2.jobTitle span[title]", ".jcs-JobTitle span[title]", "h2.jobTitle span", "h2.jobTitle"], 
            company: ["[data-testid='company-name']", "[data-testid='inlineHeader-companyName']", ".companyName", "div.company_location a", "a[data-testid='company-name']"]
        }
    }
};