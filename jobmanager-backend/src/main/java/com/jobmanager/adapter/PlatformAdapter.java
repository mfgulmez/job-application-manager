package com.jobmanager.adapter;

import com.jobmanager.model.JobApplication;

public interface PlatformAdapter {
    /**
     * Returns true if this adapter can handle the given URL.
     * Example: LinkedInAdapter returns true for "linkedin.com/jobs/..."
     */
    boolean supports(String url);

    /**
     * Extracts metadata (Company, Title) from the URL if possible.
     * Returns a partially filled JobApplication object.
     */
    JobApplication extractJobDetails(String url);
}