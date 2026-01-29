package com.jobmanager.service;

import com.jobmanager.dto.ApplicationStats;
import com.jobmanager.model.ApplicationStatus;
import com.jobmanager.model.Company;
import com.jobmanager.model.JobApplication;
import com.jobmanager.model.Platform;
import com.jobmanager.repository.CompanyRepository;
import com.jobmanager.repository.JobApplicationRepository;
import com.jobmanager.repository.PlatformRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class JobApplicationService {

    private final JobApplicationRepository repository;
    private final CompanyRepository companyRepository;
    private final PlatformRepository platformRepository;
    private final ApplicationFlowResolver resolver;

    public JobApplicationService(JobApplicationRepository repository,
                                 CompanyRepository companyRepository,
                                 PlatformRepository platformRepository,
                                 ApplicationFlowResolver resolver) {
        this.repository = repository;
        this.companyRepository = companyRepository;
        this.platformRepository = platformRepository;
        this.resolver = resolver;
    }

    public List<JobApplication> findAll() {
        return repository.findAll();
    }

    public Optional<JobApplication> findById(Long id) {
        return repository.findById(id);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    /**
     * MAIN SAVE LOGIC: Handles "Find or Create" for Company/Platform
     */
    public JobApplication createApplication(JobApplication application) {
        // ✅ NEW: Check if this URL already exists
        if (application.getJobUrl() != null) {
            Optional<JobApplication> existing = repository.findByJobUrl(application.getJobUrl());
            if (existing.isPresent()) {
                JobApplication dbApp = existing.get();
                // Update the status (e.g., DRAFT -> APPLIED)
                dbApp.setStatus(application.getStatus());
                // Update timestamp
                return repository.save(dbApp);
            }
        }

        // ... existing logic for finding/creating Company and Platform ...
        // (Copy your previous Company/Platform logic here)
        if (application.getCompany() != null) {
             String companyName = application.getCompany().getName();
             Company company = companyRepository.findByName(companyName)
                    .orElseGet(() -> companyRepository.save(Company.builder().name(companyName).build()));
             application.setCompany(company);
        }

        if (application.getPlatform() == null) {
             Platform defaultPlatform = platformRepository.findByName("Company Website")
                     .orElseGet(() -> platformRepository.save(Platform.builder().name("Company Website").build()));
             application.setPlatform(defaultPlatform);
        } else {
            String platformName = application.getPlatform().getName();
            Platform platform = platformRepository.findByName(platformName)
                    .orElseGet(() -> platformRepository.save(Platform.builder().name(platformName).build()));
            application.setPlatform(platform);
        }

        return repository.save(application);
    }

    public JobApplication createFromUrl(String url) {
        // Resolver returns a draft with a transient Company object
        JobApplication draft = resolver.resolveAndCreate(url);
        return createApplication(draft); // Re-use the smart save logic above
    }

    public JobApplication updateStatus(Long id, ApplicationStatus newStatus) {
        JobApplication app = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        app.setStatus(newStatus);
        return repository.save(app);
    }

    public JobApplication updateDetails(Long id, JobApplication updated) {
        JobApplication existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        // Update basic fields
        existing.setJobTitle(updated.getJobTitle());
        existing.setJobUrl(updated.getJobUrl());
        
        // Handle Company Name Change
        if (updated.getCompany() != null) {
            String newName = updated.getCompany().getName();
            // Reuse logic: Find or Create
            Company company = companyRepository.findByName(newName)
                    .orElseGet(() -> companyRepository.save(Company.builder().name(newName).build()));
            existing.setCompany(company);
        }

        return repository.save(existing);
    }

    public ApplicationStats getStats() {
        List<Object[]> results = repository.countApplicationsByStatus();
        Map<String, Long> breakdown = new HashMap<>();
        long total = 0;
        for (Object[] result : results) {
            String status = result[0].toString();
            Long count = (Long) result[1];
            breakdown.put(status, count);
            total += count;
        }
        return new ApplicationStats(total, breakdown);
    }
    
    public JobApplication findByUrl(String url) {
        return repository.findByJobUrl(url).orElse(null);
    }
}