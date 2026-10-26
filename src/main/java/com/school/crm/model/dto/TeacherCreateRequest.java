package com.school.crm.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeacherCreateRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Size(min = 8, max = 72) String password
) {}
