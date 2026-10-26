package com.school.crm.model.dto;

import java.util.List;

public record SchoolGroupDto(
        Long id,
        String title,
        String level,
        String description,
        Long teacherId,
        String teacherName,
        List<Long> studentIds
) {}
