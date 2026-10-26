package com.school.crm.controller;

import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.SchoolGroupDto;
import com.school.crm.model.dto.SchoolGroupRequest;
import com.school.crm.model.entity.SchoolGroup;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.model.entity.Student;
import com.school.crm.repository.SchoolGroupRepository;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.LessonRepository;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/groups")
public class SchoolGroupController {

    private final SchoolGroupRepository groupRepository;
    private final StaffAccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final LessonRepository lessonRepository;
    private final com.school.crm.repository.WeeklyScheduleRepository scheduleRepository;

    public SchoolGroupController(
            SchoolGroupRepository groupRepository,
            StaffAccountRepository accountRepository,
            StudentRepository studentRepository,
            LessonRepository lessonRepository,
            com.school.crm.repository.WeeklyScheduleRepository scheduleRepository
    ) {
        this.groupRepository = groupRepository;
        this.accountRepository = accountRepository;
        this.studentRepository = studentRepository;
        this.lessonRepository = lessonRepository;
        this.scheduleRepository = scheduleRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SchoolGroupDto> listGroups(Authentication authentication) {
        List<SchoolGroup> groups = isAdmin(authentication)
                ? groupRepository.findAllByOrderByTitleAsc()
                : groupRepository.findAllByTeacher_IdOrderByTitleAsc(currentTeacher(authentication).getId());
        return groups.stream().map(SchoolGroupController::toDto).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SchoolGroupDto> createGroup(
            @Valid @RequestBody SchoolGroupRequest request
    ) {
        StaffAccount teacher = accountRepository.findById(request.teacherId())
                .filter(account -> "TEACHER".equals(account.getRole()) && account.isEnabled())
                .orElseThrow(() -> new IllegalArgumentException("Выберите активного зарегистрированного преподавателя."));
        SchoolGroup group = groupRepository.save(new SchoolGroup(
                request.title().trim(),
                request.level().trim(),
                request.description() == null ? "" : request.description().trim(),
                teacher
        ));
        Set<Long> studentIds = request.studentIds() == null ? Set.of() : Set.copyOf(request.studentIds());
        List<Student> students = studentRepository.findAllById(studentIds);
        if (students.size() != studentIds.size()) {
            throw new IllegalArgumentException("Один или несколько выбранных студентов не найдены.");
        }
        students.forEach(student -> {
            student.setGroup(group);
            if (!student.getEnrolledGroups().contains(group)) {
                student.getEnrolledGroups().add(group);
                group.getEnrolledStudents().add(student);
            }
        });
        studentRepository.saveAll(students);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(group));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        SchoolGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + id));
        if (lessonRepository.existsByGroup_Id(id) || scheduleRepository.existsByGroup_Id(id)) {
            throw new IllegalStateException("Нельзя удалить группу, у которой есть занятия в расписании.");
        }
        group.getStudents().forEach(student -> student.setGroup(null));
        group.getEnrolledStudents().forEach(student -> student.getEnrolledGroups().remove(group));
        studentRepository.saveAll(group.getStudents());
        studentRepository.saveAll(group.getEnrolledStudents());
        groupRepository.delete(group);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/students/{studentId}")
    @Transactional
    public ResponseEntity<SchoolGroupDto> addStudent(
            @PathVariable Long id,
            @PathVariable Long studentId,
            Authentication authentication
    ) {
        SchoolGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + id));
        ensureGroupAccess(group, authentication);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        if (!student.getEnrolledGroups().contains(group)) student.getEnrolledGroups().add(group);
        studentRepository.save(student);
        return ResponseEntity.ok(toDto(group));
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @Transactional
    public ResponseEntity<SchoolGroupDto> removeStudent(
            @PathVariable Long id,
            @PathVariable Long studentId,
            Authentication authentication
    ) {
        SchoolGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + id));
        ensureGroupAccess(group, authentication);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        student.getEnrolledGroups().remove(group);
        group.getEnrolledStudents().remove(student);
        if (student.getGroup() != null && student.getGroup().getId().equals(group.getId())) {
            student.setGroup(null);
        }
        studentRepository.save(student);
        return ResponseEntity.ok(toDto(group));
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

    private void ensureGroupAccess(SchoolGroup group, Authentication authentication) {
        if (!isAdmin(authentication)
                && !group.getTeacher().getId().equals(currentTeacher(authentication).getId())) {
            throw new AccessDeniedException("Эта группа назначена другому преподавателю.");
        }
    }

    private static SchoolGroupDto toDto(SchoolGroup group) {
        return new SchoolGroupDto(
                group.getId(),
                group.getTitle(),
                group.getLevel(),
                group.getDescription(),
                group.getTeacher().getId(),
                group.getTeacher().getName(),
                java.util.stream.Stream.concat(
                                group.getStudents().stream(),
                                group.getEnrolledStudents().stream()
                        )
                        .map(Student::getId)
                        .distinct()
                        .collect(Collectors.toList())
        );
    }
}
