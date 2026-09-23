package com.internshiphub.opportunity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOpportunityRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String company,
        @NotBlank @Size(max = 2048) String postingUrl) {
}
