package com.internshiphub.opportunity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

public record CreateOpportunityRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String company,
        @Size(max = 2048) String discoveryUrl,
        @Size(max = 2048) String applicationUrl,
        @Size(max = 2048) String statusUrl) {
    @AssertTrue(message = "At least one link is required")
    public boolean isLinkPresent() {
        return hasText(discoveryUrl) || hasText(applicationUrl) || hasText(statusUrl);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
