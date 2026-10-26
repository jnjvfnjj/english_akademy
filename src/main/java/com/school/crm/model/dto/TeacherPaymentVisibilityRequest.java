package com.school.crm.model.dto;

import jakarta.validation.constraints.NotNull;

public record TeacherPaymentVisibilityRequest(@NotNull Boolean enabled) {}
