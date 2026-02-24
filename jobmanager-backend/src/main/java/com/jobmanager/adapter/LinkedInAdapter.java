package com.jobmanager.adapter;

import com.jobmanager.model.ApplicationStatus;
import com.jobmanager.model.Company;
import com.jobmanager.model.JobApplication;
import com.jobmanager.model.Platform; // Import Platform
import org.springframework.stereotype.Component;

@Component
public class LinkedInAdapter implements PlatformAdapter {

    @Override
    public boolean supports(String url) {
        return url != null && (url.contains("linkedin.com") || url.contains("lnkd.in"));
    }

    @Override
    public JobApplication extractJobDetails(String url) {
        // 1. Define the Platform
        Platform platform = Platform.builder()
                .name("LinkedIn")
                .build();

        // 2. Define a Placeholder Company
        // (Since we can't scrape LinkedIn easily, we prompt the user to fill it)
        Company company = Company.builder()
                .name("Fill Company Name") 
                .build();

        return JobApplication.builder()
                .jobUrl(url)
                .platform(platform) 
                .company(company)  
                .jobTitle("LinkedIn Job")
                .status(ApplicationStatus.APPLIED)
                .build();
    }
}