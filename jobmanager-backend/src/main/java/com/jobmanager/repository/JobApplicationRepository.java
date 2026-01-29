package com.jobmanager.repository;

import com.jobmanager.model.JobApplication;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {
    
    @Query("SELECT j.status, COUNT(j) FROM JobApplication j GROUP BY j.status")
    List<Object[]> countApplicationsByStatus();

    // ✅ NEW: Find by URL to prevent duplicates
    Optional<JobApplication> findByJobUrl(String jobUrl);
    // Add this method to find multiple jobs at once
    List<JobApplication> findByJobUrlIn(List<String> jobUrls);
}