package com.jobmanager.service;

import com.jobmanager.adapter.GenericWebAdapter;
import com.jobmanager.adapter.PlatformAdapter;
import com.jobmanager.model.JobApplication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApplicationFlowResolver {

    private final List<PlatformAdapter> adapters;

    // Spring automatically injects ALL classes that implement PlatformAdapter
    public ApplicationFlowResolver(List<PlatformAdapter> adapters) {
        this.adapters = adapters;
    }

    public JobApplication resolveAndCreate(String url) {
        // 1. Find the first specific adapter that supports this URL
        PlatformAdapter selectedAdapter = adapters.stream()
                .filter(adapter -> !(adapter instanceof GenericWebAdapter)) // Skip generic first
                .filter(adapter -> adapter.supports(url))
                .findFirst()
                .orElse(null);

        // 2. If no specific adapter found, use GenericWebAdapter explicitly
        if (selectedAdapter == null) {
            selectedAdapter = adapters.stream()
                    .filter(a -> a instanceof GenericWebAdapter)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("GenericWebAdapter missing!"));
        }

        // 3. Use the adapter to create the draft application
        return selectedAdapter.extractJobDetails(url);
    }
}