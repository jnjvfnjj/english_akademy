package com.school.crm.model.dto;

import java.time.Instant;

public record StudentDeletionNoticeDto(
        Long id,
        Long deletedStudentId,
        String studentName,
        String studentEmail,
        String deletedBy,
        Instant deletedAt
) {}
