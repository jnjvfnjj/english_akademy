package com.school.crm.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SchoolGroupRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 30) String level,
        @Size(max = 2000) String description,
        @NotNull Long teacherId,
        List<Long> studentIds
) {}
