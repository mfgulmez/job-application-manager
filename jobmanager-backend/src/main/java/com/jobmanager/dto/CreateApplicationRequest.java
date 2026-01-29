package com.jobmanager.dto;

import lombok.Data;

@Data
public class CreateApplicationRequest {
    private String companyName;
    private String jobTitle;
    private String jobUrl;
    private String platformName;
    private String status; // ✅ New Field
}