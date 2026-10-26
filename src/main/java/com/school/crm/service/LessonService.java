package com.school.crm.service;

import com.school.crm.model.dto.LessonDto;
import java.util.List;
import org.springframework.security.core.Authentication;

public interface LessonService {
    List<LessonDto> getAllLessons(Authentication authentication);
    List<LessonDto> getLessonsByStudent(Long studentId, Authentication authentication);
    LessonDto getLessonById(Long id, Authentication authentication);
    LessonDto createLesson(LessonDto lessonDto, Authentication authentication);
    LessonDto updateLesson(Long id, LessonDto lessonDto, Authentication authentication);
    void deleteLesson(Long id, Authentication authentication);
    void updateLessonStatus(Long id, String status, String notes, Authentication authentication);
}
