package com.school.crm.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminRegistrationRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(min = 16, max = 256) String registrationCode
) {
    public AuthRequest toAuthRequest() {
        return new AuthRequest(email, password, name);
    }
}
