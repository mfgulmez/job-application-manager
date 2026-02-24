package com.jobmanager.adapter;

import com.jobmanager.model.ApplicationStatus;
import com.jobmanager.model.Company;
import com.jobmanager.model.JobApplication;
import com.jobmanager.model.Platform;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
public class GenericWebAdapter implements PlatformAdapter {

    @Override
    public boolean supports(String url) {
        return true; 
    }

    @Override
    public JobApplication extractJobDetails(String url) {
        String pageTitle = "";
        String companyName = "Check Link";
        String position = "Unknown Position";
        String platformName = "Company Website"; // Default

        // 1. Try to guess Platform from Domain
        try {
            String domain = URI.create(url).getHost();
            if (domain != null) {
                domain = domain.replace("www.", "");
                // Simple heuristic: "careers.google.com" -> "google.com"
                if (domain.contains("indeed")) platformName = "Indeed";
                else if (domain.contains("glassdoor")) platformName = "Glassdoor";
                else if (domain.contains("monster")) platformName = "Monster";
                else if (domain.contains("wellfound")) platformName = "Wellfound";
                else platformName = "Company Website";
            }
        } catch (Exception e) {
            // Ignore URI parsing errors
        }

        // 2. Try to Scrape Title/Company
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .referrer("http://www.google.com")
                    .timeout(5000)
                    .get();

            pageTitle = doc.title();
            
            // Basic title parsing logic
            if (pageTitle.contains(" at ")) {
                String[] parts = pageTitle.split(" at ");
                position = parts[0].trim();
                companyName = parts[1].trim();
            } else if (pageTitle.contains(" | ")) {
                String[] parts = pageTitle.split(" \\| ");
                position = parts[0].trim();
                companyName = parts[1].trim();
            } else if (pageTitle.contains(" - ")) {
                String[] parts = pageTitle.split(" - ");
                position = parts[0].trim();
                companyName = parts[1].trim();
            } else {
                position = pageTitle;
            }

        } catch (Exception e) {
            position = "Import Failed";
            companyName = "Manual Entry Required";
        }

        // 3. Build Objects
        Company company = Company.builder().name(companyName).build();
        Platform platform = Platform.builder().name(platformName).build();

        return JobApplication.builder()
                .jobUrl(url)
                .company(company)   
                .platform(platform) 
                .jobTitle(position)
                .status(ApplicationStatus.DRAFT)
                .build();
    }
}