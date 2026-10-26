package com.school.crm.model.dto;

import java.time.LocalDate;

public record PaymentReminderDto(Long studentId, String studentName, int remainingLessons, LocalDate expiresAt) {}
