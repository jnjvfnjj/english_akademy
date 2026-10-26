package com.school.crm.service;

import com.school.crm.model.entity.Lesson;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.WeeklySchedule;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.WeeklyScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class WeeklyLessonScheduler {

    private static final Logger log = LoggerFactory.getLogger(WeeklyLessonScheduler.class);
    private static final ZoneId SCHOOL_TIME_ZONE = ZoneId.of("Asia/Bishkek");
    private final WeeklyScheduleRepository scheduleRepository;
    private final LessonRepository lessonRepository;
    private final StudentRepository studentRepository;
    private final LessonService lessonService;

    public WeeklyLessonScheduler(
            WeeklyScheduleRepository scheduleRepository,
            LessonRepository lessonRepository,
            StudentRepository studentRepository,
            LessonService lessonService
    ) {
        this.scheduleRepository = scheduleRepository;
        this.lessonRepository = lessonRepository;
        this.studentRepository = studentRepository;
        this.lessonService = lessonService;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void completeDueLessons() {
        LocalDate today = LocalDate.now(SCHOOL_TIME_ZONE);
        LocalDateTime now = LocalDateTime.now(SCHOOL_TIME_ZONE);
        processDueLessons(today, now);
    }

    void processDueLessons(LocalDate today, LocalDateTime now) {
        List<Lesson> dueLessons = lessonRepository.findAllByStatusAndDateLessThanEqual("Scheduled", today);
        for (Lesson lesson : dueLessons) {
            LocalDateTime end = LocalDateTime.of(lesson.getDate(), LocalTime.parse(lesson.getTime()))
                    .plusMinutes((long) (lesson.getDuration() * 60));
            if (!now.isBefore(end)) {
                lessonService.updateLessonStatus(lesson.getId(), "Completed", lesson.getNotes(), null);
            }
        }

        int weekday = today.getDayOfWeek().getValue();
        for (WeeklySchedule schedule : scheduleRepository.findAll()) {
            if (schedule.getDayOfWeek() != weekday || lessonRepository.existsByWeeklySchedule_IdAndDate(schedule.getId(), today)) {
                continue;
            }
            LocalDateTime end = LocalDateTime.of(today, LocalTime.parse(schedule.getTime()))
                    .plusMinutes((long) (schedule.getDuration() * 60));
            if (now.isBefore(end)) continue;

            Lesson occurrence = new Lesson(
                    null,
                    today,
                    schedule.getTime(),
                    schedule.getGroup().getTeacher().getName(),
                    schedule.getTopic(),
                    schedule.getDuration(),
                    "Scheduled",
                    null
            );
            occurrence.setGroup(schedule.getGroup());
            occurrence.setWeeklySchedule(schedule);
            Lesson saved = lessonRepository.save(occurrence);
            lessonService.updateLessonStatus(saved.getId(), "Completed", "Автоматически отмечено по недельному расписанию.", null);
            log.info("Automatically completed weekly lesson {} for schedule {}", saved.getId(), schedule.getId());
        }

        List<Student> students = studentRepository.findAll();
        for (Student student : students) {
            if (student.getBalance() > 0
                    && student.getPaymentExpiresAt() != null
                    && student.getPaymentExpiresAt().isBefore(today)) {
                int oldBalance = student.getBalance();
                student.setBalance(0);
                studentRepository.save(student);
                log.info("Expired {} remaining lessons for student {}", oldBalance, student.getId());
            }
        }
    }
}
