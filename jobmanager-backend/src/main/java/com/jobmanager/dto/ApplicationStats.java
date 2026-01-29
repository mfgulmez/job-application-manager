package com.jobmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.Map;

@Data
@AllArgsConstructor
public class ApplicationStats {
    private long totalApplications;
    private Map<String, Long> statusBreakdown;
}