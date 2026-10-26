package com.school.crm.model.dto;

public record AuthResponse(
        String token,
        String email,
        String name,
        String role,
        boolean superAdmin,
        boolean canViewStudentPayments
) {}
