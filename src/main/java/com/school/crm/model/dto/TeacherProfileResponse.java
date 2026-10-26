package com.school.crm.model.dto;

public record TeacherProfileResponse(
        String name,
        String email,
        String role,
        boolean canViewStudentPayments
) {}
