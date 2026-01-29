// constants.js
export const KEYWORDS = ["java", "spring", "software engineer", "backend", "developer", "yazılım", "geliştirici", "uzman", "data engineer"];

export const SUCCESS_INDICATORS = [
    "applied", "başvuruldu", 
    "application sent", "başvuru gönderildi", 
    "application submitted", 
    "applied on", 
    "resume sent", 
    "your application was sent"
];

export const NOISE_WORDS = ["applicants", "people", "kişi", "connections", "alumni", "compare", "views", "görüntülenme"];

export const PLATFORMS = {
    LINKEDIN: {
        domain: "linkedin.com",
        selectors: {
            listCard: [".job-card-container", ".jobs-search-results__list-item"],
            detailHeader: [
                ".job-details-jobs-unified-top-card", 
                ".jobs-unified-top-card", 
                ".job-view-layout"
            ],
            scanAreaDetail: [".jobs-search__job-details", ".job-view-layout", ".artdeco-modal"], 
            applyBtns: [".jobs-apply-button", ".jobs-apply-button--top-card", "button[aria-label*='Apply']"],
            title: [".artdeco-entity-lockup__title", ".job-card-list__title", "h1"],
            company: [".artdeco-entity-lockup__subtitle", ".job-card-container__primary-description", ".jobs-unified-top-card__company-name a", ".job-details-jobs-unified-top-card__company-name a"]
        }
    },
    INDEED: {
        domain: "indeed.com",
        selectors: {
            listCard: [".job_seen_beacon", ".resultContent", "td.result"],
            detailHeader: [".jobsearch-JobComponent-header", ".jobsearch-InfoHeaderContainer"],
            scanAreaDetail: [".jobsearch-JobComponent"],
            applyBtns: ["#indeedApplyButton", ".jobsearch-JobInfoHeader-applyButton", "button[id*='Apply']"],
            title: ["h2.jobTitle span", "h2.jobTitle", ".jobsearch-JobInfoHeader-title"], 
            company: ["[data-testid='company-name']", ".companyName", "a[data-testid='company-name']"]
        }
    }
};