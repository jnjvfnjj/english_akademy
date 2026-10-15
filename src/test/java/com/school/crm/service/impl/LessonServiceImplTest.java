package com.school.crm.service.impl;

import com.school.crm.model.dto.LessonDto;
import com.school.crm.model.entity.Lesson;
import com.school.crm.model.entity.Student;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LessonServiceImplTest {

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LessonServiceImpl lessonService;

    private Student student;
    private Lesson lesson;
    private LessonDto lessonDto;

    @BeforeEach
    void setUp() {
        student = new Student("Alice Cooper", "alice@mail.com", "1234567890", "A2", 5, "Kids", "Active", "");
        student.setId(1L);

        lesson = new Lesson(student, LocalDate.now(), "11:00", "Elena S.", "Alphabet prep", 1.0, "Scheduled", "");
        lesson.setId(10L);

        lessonDto = new LessonDto();
        lessonDto.setStudentId(1L);
        lessonDto.setStudentName("Alice Cooper");
        lessonDto.setDate(LocalDate.now());
        lessonDto.setTime("11:00");
        lessonDto.setTeacherName("Elena S.");
        lessonDto.setTopic("Alphabet prep");
        lessonDto.setDuration(1.0);
        lessonDto.setStatus("Scheduled");
    }

    @Test
    void testCreateLesson_SuccessWithDeduction() {
        lessonDto.setStatus("Completed"); // Set status directly to completed
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(lessonRepository.save(any(Lesson.class))).thenReturn(lesson);

        lessonService.createLesson(lessonDto);

        // Verification of Business Rule: completed lesson deducts 1 hour balance
        assertEquals(4, student.getBalance());
        verify(studentRepository, times(1)).save(student);
        verify(lessonRepository, times(1)).save(any(Lesson.class));
    }

    @Test
    void testCreateLesson_ThrowsNoBalance() {
        student.setBalance(0); // Zero hours package left
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));

        assertThrows(IllegalStateException.class, () -> lessonService.createLesson(lessonDto));
        verify(lessonRepository, never()).save(any(Lesson.class));
    }
}
