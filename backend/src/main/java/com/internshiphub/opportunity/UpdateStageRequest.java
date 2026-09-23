package com.internshiphub.opportunity;

import jakarta.validation.constraints.NotNull;

public record UpdateStageRequest(@NotNull Stage stage) {
}
