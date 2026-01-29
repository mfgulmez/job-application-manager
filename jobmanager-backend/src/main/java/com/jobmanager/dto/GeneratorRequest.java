package com.jobmanager.dto;

import lombok.Data;

@Data
public class GeneratorRequest {
    private String jobTitle;
    private String companyName;
    private String jobDescription; // The full text scraped from LinkedIn
}