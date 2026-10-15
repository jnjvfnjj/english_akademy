package com.school.crm.service;

import com.school.crm.model.dto.LessonDto;
import java.util.List;

public interface LessonService {
    List<LessonDto> getAllLessons();
    List<LessonDto> getLessonsByStudent(Long studentId);
    LessonDto getLessonById(Long id);
    LessonDto createLesson(LessonDto lessonDto);
    LessonDto updateLesson(Long id, LessonDto lessonDto);
    void deleteLesson(Long id);
    void updateLessonStatus(Long id, String status, String notes);
}
