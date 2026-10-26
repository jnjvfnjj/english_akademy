package com.school.crm.service;

import com.school.crm.model.entity.Lesson;
import com.school.crm.model.entity.SchoolGroup;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.WeeklySchedule;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.WeeklyScheduleRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WeeklyLessonSchedulerTest {

    @Test
    void recordsAndCompletesWeeklyOccurrenceOnlyOnceAndExpiresPackage() {
        WeeklyScheduleRepository scheduleRepository = mock(WeeklyScheduleRepository.class);
        LessonRepository lessonRepository = mock(LessonRepository.class);
        StudentRepository studentRepository = mock(StudentRepository.class);
        LessonService lessonService = mock(LessonService.class);
        WeeklyLessonScheduler scheduler = new WeeklyLessonScheduler(
                scheduleRepository, lessonRepository, studentRepository, lessonService
        );

        LocalDate today = LocalDate.of(2025, 10, 1);
        SchoolGroup group = new SchoolGroup(
                "English A1",
                "A1",
                "Beginner course",
                new StaffAccount("teacher@example.com", "Teacher", "hash", "TEACHER")
        );
        WeeklySchedule schedule = new WeeklySchedule();
        schedule.setGroup(group);
        schedule.setDayOfWeek(today.getDayOfWeek().getValue());
        schedule.setTime("10:00");
        schedule.setTopic("Speaking");
        schedule.setDuration(1);

        Student student = new Student("Student One", null, null, "A1", 3, "Adults", "Active", null);
        student.setPaymentExpiresAt(today.minusDays(1));
        group.getEnrolledStudents().add(student);

        when(lessonRepository.findAllByStatusAndDateLessThanEqual("Scheduled", today)).thenReturn(List.of());
        when(scheduleRepository.findAll()).thenReturn(List.of(schedule));
        when(lessonRepository.existsByWeeklySchedule_IdAndDate(null, today)).thenReturn(false, true);
        when(lessonRepository.save(any(Lesson.class))).thenAnswer(invocation -> {
            Lesson occurrence = invocation.getArgument(0);
            occurrence.setId(10L);
            return occurrence;
        });
        when(studentRepository.findAll()).thenReturn(List.of(student));

        LocalDateTime now = today.atTime(12, 0);
        scheduler.processDueLessons(today, now);
        scheduler.processDueLessons(today, now);

        verify(lessonRepository, times(1)).save(any(Lesson.class));
        verify(lessonService, times(1)).updateLessonStatus(
                10L,
                "Completed",
                "Автоматически отмечено по недельному расписанию.",
                null
        );
        verify(studentRepository, times(1)).save(student);
        org.junit.jupiter.api.Assertions.assertEquals(0, student.getBalance());
    }
}
