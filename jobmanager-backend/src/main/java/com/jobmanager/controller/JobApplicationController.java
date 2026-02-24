package com.jobmanager.controller;
import com.jobmanager.model.ApplicationStatus; 
import com.jobmanager.model.Company;
import com.jobmanager.model.JobApplication;
import com.jobmanager.model.Platform;
import com.jobmanager.repository.JobApplicationRepository;
import com.jobmanager.service.JobApplicationService;
import com.jobmanager.dto.ApplicationStats;
import com.jobmanager.dto.CreateApplicationRequest;
import com.jobmanager.dto.GeneratorRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "*")
public class JobApplicationController {

    private final JobApplicationService service;
    private final JobApplicationRepository repository;

    public JobApplicationController(JobApplicationService service, JobApplicationRepository repository) {
        this.service = service;
        this.repository = repository;
    }

    @GetMapping
    public List<JobApplication> getAllApplications() {
        return service.findAll();
    }

    @PostMapping
    public JobApplication createApplication(@RequestBody CreateApplicationRequest request) {
        ApplicationStatus incomingStatus = ApplicationStatus.DRAFT;
        if (request.getStatus() != null) {
            try {
                // Ensure uppercase to prevent enum errors!
                incomingStatus = ApplicationStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                incomingStatus = ApplicationStatus.DRAFT;
            }
        }

        // 2. UPSERT LOGIC: Check if this job already exists in the database
        JobApplication existingApp = service.findByUrl(request.getJobUrl());
        
        if (existingApp != null) {
            // If it exists, update the status of the existing record instead of duplicating
            return service.updateStatus(existingApp.getId(), incomingStatus);
        }

        // 3. If it does NOT exist, proceed with creating a brand new record
        JobApplication app = new JobApplication();
        app.setJobTitle(request.getJobTitle());
        app.setJobUrl(request.getJobUrl());
        
        Company company = Company.builder()
                .name(request.getCompanyName())
                .build();
        app.setCompany(company);

        if (request.getPlatformName() != null) {
            Platform platform = Platform.builder()
                    .name(request.getPlatformName())
                    .build();
            app.setPlatform(platform);
        }
        
        app.setStatus(incomingStatus);

        return service.createApplication(app);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplication> getApplication(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<JobApplication> updateStatus(@PathVariable Long id, @RequestParam ApplicationStatus status) {
        try {
            return ResponseEntity.ok(service.updateStatus(id, status));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    // POST /api/applications/import?url=...
    @PostMapping("/import")
    public JobApplication importApplication(@RequestParam String url) {
        return service.createFromUrl(url);
    }
    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> updateApplication(@PathVariable Long id, @RequestBody JobApplication application) {
        try {
            return ResponseEntity.ok(service.updateDetails(id, application));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/stats")
    public ApplicationStats getStats() {
        return service.getStats();
    }
    
    @GetMapping("/check")
    public ResponseEntity<Map<String, String>> checkStatus(@RequestParam String url) {
        JobApplication app = service.findByUrl(url);
        if (app != null) {
            return ResponseEntity.ok(Map.of(
                "exists", "true",
                "status", app.getStatus().name()
            ));
        } else {
            return ResponseEntity.ok(Map.of("exists", "false"));
        }
    }
// ... inside JobApplicationController class ...

@PostMapping("/check-batch")
    public ResponseEntity<Map<String, Map<String, String>>> checkBatch(@RequestBody List<String> urls) {
        // Use 'applicationRepository' here because we declared it above
        List<JobApplication> foundApps = repository.findByJobUrlIn(urls);
        
        Map<String, Map<String, String>> response = new HashMap<>();
        
        for (JobApplication app : foundApps) {
            Map<String, String> data = new HashMap<>();
            data.put("status", app.getStatus().toString());
            data.put("exists", "true");
            response.put(app.getJobUrl(), data);
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate-materials")
    public ResponseEntity<Map<String, String>> generateMaterials(@RequestBody GeneratorRequest request) {
        
        // 1. In a real app, you would fetch the User's Resume from DB here.
        // For the thesis, we use a placeholder "Master Resume".
        String mySkills = "Java, Spring Boot, React, Docker, SQL";
        String myExperience = "Junior Software Engineer with 2 years of experience in building scalable web apps.";

        // 2. Generate Cover Letter (Simple Template Logic)
        // In the future, you can replace this with a call to ChatGPT/Gemini API!
        String coverLetter = String.format(
            "Dear Hiring Manager at %s,\n\n" +
            "I am writing to express my interest in the %s position. " +
            "With my background in %s, I am confident I can contribute effectively to your team.\n\n" +
            "I noticed in your job description that you are looking for someone skilled in: %s. " +
            "My experience matches this perfectly.\n\n" +
            "Thank you for considering my application.\n" +
            "Sincerely,\n[Your Name]",
            request.getCompanyName(),
            request.getJobTitle(),
            mySkills,
            request.getJobTitle() // simplistic matching for now
        );

        return ResponseEntity.ok(Map.of("coverLetter", coverLetter));
    }
}