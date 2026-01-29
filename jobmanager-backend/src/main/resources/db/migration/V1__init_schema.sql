-- 1. Create Company Table
CREATE TABLE IF NOT EXISTS company (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Platform Table
CREATE TABLE IF NOT EXISTS platform (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    base_url VARCHAR(255), -- ADDED THIS LINE ✅
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Job Application Table
CREATE TABLE IF NOT EXISTS job_application (
    id BIGSERIAL PRIMARY KEY,
    job_title VARCHAR(255),
    company_id BIGINT REFERENCES company(id),
    platform_id BIGINT REFERENCES platform(id),
    job_url TEXT UNIQUE NOT NULL,
    status VARCHAR(50),
    description TEXT,
    applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_job_application_job_url ON job_application(job_url);