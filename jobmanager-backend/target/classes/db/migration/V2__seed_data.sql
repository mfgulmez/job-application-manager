-- 1. Insert Companies first
INSERT INTO company (name, website) VALUES 
('Google', 'https://careers.google.com'),
('Netflix', 'https://jobs.netflix.com'),
('Spotify', 'https://spotify.com'),
('Amazon', 'https://amazon.jobs'),
('Microsoft', 'https://careers.microsoft.com'),
('OpenAI', 'https://openai.com');

-- 2. Insert Job Applications (Linking to the companies and platforms we just created)
-- Note: We use subqueries (SELECT id FROM ...) so we don't have to guess the IDs.

INSERT INTO job_application (job_title, job_url, status, platform_id, company_id, applied_at, created_at, updated_at)
VALUES 
(
    'Backend Engineer L4', 
    'https://careers.google.com', 
    'INTERVIEWING',
    (SELECT id FROM platform WHERE name = 'LinkedIn'), -- Assumes V1 created 'LinkedIn'
    (SELECT id FROM company WHERE name = 'Google'),
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'Senior Platform Engineer', 
    'https://jobs.netflix.com', 
    'REJECTED',
    (SELECT id FROM platform WHERE name = 'Indeed'),
    (SELECT id FROM company WHERE name = 'Netflix'),
    CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'Java Developer', 
    'https://lifeatspotify.com', 
    'OFFER',
    (SELECT id FROM platform WHERE name = 'Glassdoor'),
    (SELECT id FROM company WHERE name = 'Spotify'),
    CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'SDE II', 
    'https://amazon.jobs', 
    'APPLIED',
    (SELECT id FROM platform WHERE name = 'Company Website'),
    (SELECT id FROM company WHERE name = 'Amazon'),
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'Full Stack Developer', 
    'https://careers.microsoft.com', 
    'APPLIED',
    (SELECT id FROM platform WHERE name = 'LinkedIn'),
    (SELECT id FROM company WHERE name = 'Microsoft'),
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'Research Engineer', 
    'https://openai.com/careers', 
    'WITHDRAWN',
    (SELECT id FROM platform WHERE name = 'Company Website'),
    (SELECT id FROM company WHERE name = 'OpenAI'),
    CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);