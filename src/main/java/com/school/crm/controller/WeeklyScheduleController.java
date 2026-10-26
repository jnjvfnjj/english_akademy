package com.school.crm.controller;

import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.WeeklyScheduleDto;
import com.school.crm.model.entity.SchoolGroup;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.model.entity.WeeklySchedule;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.SchoolGroupRepository;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.WeeklyScheduleRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/weekly-schedules")
public class WeeklyScheduleController {

    private final WeeklyScheduleRepository scheduleRepository;
    private final SchoolGroupRepository groupRepository;
    private final StaffAccountRepository accountRepository;
    private final LessonRepository lessonRepository;

    public WeeklyScheduleController(
            WeeklyScheduleRepository scheduleRepository,
            SchoolGroupRepository groupRepository,
            StaffAccountRepository accountRepository,
            LessonRepository lessonRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.groupRepository = groupRepository;
        this.accountRepository = accountRepository;
        this.lessonRepository = lessonRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<WeeklyScheduleDto> getSchedules(Authentication authentication) {
        List<WeeklySchedule> schedules = isAdmin(authentication)
                ? scheduleRepository.findAll()
                : scheduleRepository.findAllByGroup_Teacher_IdOrderByDayOfWeekAscTimeAsc(
                        currentTeacher(authentication).getId()
                );
        return schedules.stream().map(this::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public WeeklyScheduleDto createSchedule(
            @Valid @RequestBody WeeklyScheduleDto request,
            Authentication authentication
    ) {
        SchoolGroup group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + request.groupId()));
        ensureGroupAccess(group, authentication);
        if (scheduleRepository.existsByGroup_IdAndDayOfWeekAndTime(group.getId(), request.dayOfWeek(), request.time())) {
            throw new IllegalArgumentException("В это время у группы уже запланировано занятие.");
        }
        WeeklySchedule schedule = new WeeklySchedule();
        schedule.setGroup(group);
        schedule.setDayOfWeek(request.dayOfWeek());
        schedule.setTime(request.time());
        schedule.setTopic(request.topic().trim());
        schedule.setDuration(request.duration());
        return toDto(scheduleRepository.save(schedule));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteSchedule(@PathVariable Long id, Authentication authentication) {
        WeeklySchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Weekly schedule not found with ID: " + id));
        ensureGroupAccess(schedule.getGroup(), authentication);
        if (lessonRepository.existsByWeeklySchedule_Id(id)) {
            throw new IllegalStateException("Нельзя удалить расписание, по которому уже проведены занятия.");
        }
        scheduleRepository.delete(schedule);
    }

    private WeeklyScheduleDto toDto(WeeklySchedule schedule) {
        SchoolGroup group = schedule.getGroup();
        return new WeeklyScheduleDto(
                schedule.getId(),
                group.getId(),
                group.getTitle(),
                group.getTeacher().getName(),
                schedule.getDayOfWeek(),
                schedule.getTime(),
                schedule.getTopic(),
                schedule.getDuration(),
                java.util.stream.Stream.concat(
                                group.getStudents().stream(),
                                group.getEnrolledStudents().stream()
                        )
                        .map(student -> student.getId())
                        .distinct()
                        .toList()
        );
    }

    private void ensureGroupAccess(SchoolGroup group, Authentication authentication) {
        if (!isAdmin(authentication)
                && !group.getTeacher().getId().equals(currentTeacher(authentication).getId())) {
            throw new AccessDeniedException("Эта группа назначена другому преподавателю.");
        }
    }

    private StaffAccount currentTeacher(Authentication authentication) {
        return accountRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(account -> "TEACHER".equals(account.getRole()) && account.isEnabled())
                .orElseThrow(() -> new AccessDeniedException("Активный аккаунт преподавателя не найден."));
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
