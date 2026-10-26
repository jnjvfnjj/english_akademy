package com.school.crm.model.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record WeeklyScheduleDto(
        Long id,
        @NotNull Long groupId,
        String groupName,
        String teacherName,
        @Min(1) @Max(6) int dayOfWeek,
        @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):(00|30)$") String time,
        @NotBlank String topic,
        @DecimalMin("0.5") @DecimalMax("4.0") double duration,
        java.util.List<Long> studentIds
) {}
