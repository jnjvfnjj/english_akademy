package com.school.crm.model.dto;

import jakarta.validation.constraints.NotNull;

public record TeacherStatusRequest(@NotNull Boolean active) {}
