// config.js
export const API_BASE = "http://localhost/api/applications";
export const KEYWORDS = ["java", "spring", "software engineer", "backend", "developer", "yazılım", "geliştirici", "uzman", "data engineer"];

export const SUCCESS_INDICATORS = [
    "applied", "başvuruldu", "application sent", "başvuru gönderildi", 
    "application submitted", "applied on", "resume sent", "your application was sent"
];

export const NOISE_WORDS = ["applicants", "people", "kişi", "connections", "alumni", "compare", "views", "görüntülenme"];

export const PLATFORMS = {
    LINKEDIN: {
        domain: "linkedin.com",
        selectors: {
            listCard: [".job-card-container", ".jobs-search-results__list-item", "li.jobs-search-results__list-item"],
            detailHeader: [".job-details-jobs-unified-top-card", ".jobs-unified-top-card", ".jobs-details-top-card", ".jobs-details__main-content", ".job-view-layout"],
            scanAreaDetail: [".jobs-search__job-details", ".job-view-layout", ".artdeco-modal", ".jobs-details__main-content"], 
            applyBtns: [".jobs-apply-button", ".jobs-apply-button--top-card", "button[aria-label*='Apply']"],
            title: [".job-details-jobs-unified-top-card__job-title h1", ".jobs-unified-top-card__job-title h1", ".jobs-details-top-card__job-title h1", "h1", ".job-card-list__title strong", ".job-card-container__link strong", "a strong"],
            company: [".job-details-jobs-unified-top-card__company-name a", ".jobs-unified-top-card__company-name a", ".jobs-details-top-card__company-info a", ".artdeco-entity-lockup__subtitle", ".job-card-container__company-name", ".artdeco-entity-lockup__subtitle", ".job-card-container__primary-description"]
        }
    },
    INDEED: {
        domain: "indeed.com",
        selectors: {
            listCard: [".job_seen_beacon", ".resultContent", ".cardOutline", "[data-testid='job-card']"],
            detailHeader: [".jobsearch-JobComponent-header", ".jobsearch-InfoHeaderContainer", ".jobsearch-JobComponent", "#viewJob-container"],
            scanAreaDetail: [".jobsearch-JobComponent", "#viewJob-container"],
            applyBtns: ["#indeedApplyButton", ".jobsearch-JobInfoHeader-applyButton", "button[id*='Apply']"],
            title: ["h2.jobsearch-JobInfoHeader-title", "[data-testid='jobsearch-JobInfoHeader-title']", "h1", "h2.jobTitle span[title]", ".jcs-JobTitle span[title]"], 
            company: ["[data-testid='company-name']", "[data-testid='inlineHeader-companyName']", ".companyName", "div.company_location a"]
        }
    }
};