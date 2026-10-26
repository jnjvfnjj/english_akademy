package com.school.crm.service.impl;

import com.school.crm.design.observer.LessonStatusEvent;
import com.school.crm.design.observer.StudentBalanceEvent;
import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.LessonDto;
import com.school.crm.model.entity.Lesson;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.SchoolGroup;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.SchoolGroupRepository;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.service.LessonService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LessonServiceImpl implements LessonService {

    private static final Logger log = LoggerFactory.getLogger(LessonServiceImpl.class);
    private final LessonRepository lessonRepository;
    private final StudentRepository studentRepository;
    private final SchoolGroupRepository groupRepository;
    private final StaffAccountRepository accountRepository;
    private final ApplicationEventPublisher eventPublisher;

    public LessonServiceImpl(
            LessonRepository lessonRepository,
            StudentRepository studentRepository,
            SchoolGroupRepository groupRepository,
            StaffAccountRepository accountRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.lessonRepository = lessonRepository;
        this.studentRepository = studentRepository;
        this.groupRepository = groupRepository;
        this.accountRepository = accountRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonDto> getAllLessons(Authentication authentication) {
        List<Lesson> lessons = isAdmin(authentication)
                ? lessonRepository.findAll()
                : lessonRepository.findAllByGroup_Teacher_Id(currentTeacher(authentication).getId());
        return lessons
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<LessonDto> getAllLessons() {
        return getAllLessons(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonDto> getLessonsByStudent(Long studentId, Authentication authentication) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));
        ensureStudentAccess(student, authentication);
        return lessonRepository.findByStudentId(studentId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<LessonDto> getLessonsByStudent(Long studentId) {
        return getLessonsByStudent(studentId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public LessonDto getLessonById(Long id, Authentication authentication) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        ensureLessonAccess(lesson, authentication);
        return convertToDto(lesson);
    }

    public LessonDto getLessonById(Long id) {
        return getLessonById(id, null);
    }

    @Override
    @Transactional
    public LessonDto createLesson(LessonDto dto, Authentication authentication) {
        Student student = dto.getStudentId() == null ? null : studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + dto.getStudentId()));
        SchoolGroup group = dto.getGroupId() == null ? null : groupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + dto.getGroupId()));
        if (student == null && group == null) {
            throw new IllegalArgumentException("Выберите учебную группу или студента для занятия.");
        }
        if (!isAdmin(authentication)) {
            if (group != null) ensureTeacherOwns(group, authentication);
            else ensureStudentAccess(student, authentication);
        }
        if (student != null && student.getBalance() <= 0) {
            throw new IllegalStateException("Cannot schedule lesson! Student " + student.getName() + " has 0 hours left in package balance.");
        }
        if (group != null && java.util.stream.Stream.concat(
                group.getStudents().stream(), group.getEnrolledStudents().stream()
        ).distinct().anyMatch(member -> member.getBalance() <= 0)) {
            throw new IllegalStateException("Нельзя запланировать урок: у одного или нескольких студентов группы закончились оплаченные часы.");
        }

        Lesson lesson = new Lesson(
                student,
                dto.getDate(),
                dto.getTime(),
                group == null ? dto.getTeacherName() : group.getTeacher().getName(),
                dto.getTopic(),
                dto.getDuration(),
                dto.getStatus(),
                dto.getNotes()
        );
        lesson.setGroup(group);

        // If the immediate scheduled status is set to Completed on creation, deduct balance
        if (student != null && "Completed".equalsIgnoreCase(dto.getStatus())) {
            int oldBalance = student.getBalance();
            student.deductBalance(1);
            studentRepository.save(student);
            
            // Publish balance event
            eventPublisher.publishEvent(new StudentBalanceEvent(
                    this, student.getId(), oldBalance, student.getBalance(),
                    "Completed lesson " + lesson.getTopic() + " deducted 1 package hour."
            ));
        }

        Lesson saved = lessonRepository.save(lesson);
        log.info("[Service Log] Scheduled new lesson for {}", group == null ? student.getName() : group.getTitle());
        return convertToDto(saved);
    }

    @Override
    @Transactional
    public LessonDto updateLesson(Long id, LessonDto dto, Authentication authentication) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        ensureLessonAccess(lesson, authentication);

        // Delegate status mutation logic to dedicated status updater in order to handle triggers correctly
        String oldStatus = lesson.getStatus();
        
        if (dto.getGroupId() != null) {
            SchoolGroup group = groupRepository.findById(dto.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + dto.getGroupId()));
            if (!isAdmin(authentication)) ensureTeacherOwns(group, authentication);
            lesson.setGroup(group);
            lesson.setStudent(null);
        }
        lesson.setDate(dto.getDate());
        lesson.setTime(dto.getTime());
        lesson.setTeacherName(lesson.getGroup() == null
                ? dto.getTeacherName()
                : lesson.getGroup().getTeacher().getName());
        lesson.setTopic(dto.getTopic());
        lesson.setDuration(dto.getDuration());
        lesson.setNotes(dto.getNotes());

        Lesson updated = lessonRepository.save(lesson);

        // If status changed in standard put request, process the business trigger
        if (!oldStatus.equalsIgnoreCase(dto.getStatus())) {
            updateLessonStatus(id, dto.getStatus(), dto.getNotes(), authentication);
        }

        return convertToDto(updated);
    }

    public LessonDto createLesson(LessonDto dto) {
        return createLesson(dto, null);
    }

    public LessonDto updateLesson(Long id, LessonDto dto) {
        return updateLesson(id, dto, null);
    }

    @Override
    @Transactional
    public void deleteLesson(Long id, Authentication authentication) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        ensureLessonAccess(lesson, authentication);
        lessonRepository.delete(lesson);
    }

    public void deleteLesson(Long id) {
        deleteLesson(id, null);
    }

    @Override
    @Transactional
    public void updateLessonStatus(Long id, String status, String notes, Authentication authentication) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        ensureLessonAccess(lesson, authentication);

        String oldStatus = lesson.getStatus();
        if (oldStatus.equalsIgnoreCase(status)) {
            return; // No transition needed
        }

        List<Student> affectedStudents = lesson.getGroup() == null
                ? (lesson.getStudent() == null ? List.of() : List.of(lesson.getStudent()))
                : java.util.stream.Stream.concat(
                        lesson.getGroup().getStudents().stream(),
                        lesson.getGroup().getEnrolledStudents().stream()
                ).distinct().toList();
        if ("Scheduled".equalsIgnoreCase(oldStatus) && "Completed".equalsIgnoreCase(status)) {
            affectedStudents.stream().filter(student -> student.getBalance() > 0).forEach(student -> {
                int oldBalance = student.getBalance();
                student.deductBalance(1);
                student.setTotalClasses(student.getTotalClasses() + 1);
                eventPublisher.publishEvent(new StudentBalanceEvent(
                        this, student.getId(), oldBalance, student.getBalance(),
                        "Lesson completed: deducted 1 hour. Total completed classes: " + student.getTotalClasses()
                ));
            });
            studentRepository.saveAll(affectedStudents);
        } else if ("Completed".equalsIgnoreCase(oldStatus) && "Cancelled".equalsIgnoreCase(status)) {
            affectedStudents.forEach(student -> {
                int oldBalance = student.getBalance();
                student.addBalance(1);
                student.setTotalClasses(Math.max(0, student.getTotalClasses() - 1));
                eventPublisher.publishEvent(new StudentBalanceEvent(
                        this, student.getId(), oldBalance, student.getBalance(),
                        "Lesson cancelled after completion: restored 1 hour."
                ));
            });
            studentRepository.saveAll(affectedStudents);
        }

        lesson.setStatus(status);
        if (notes != null) {
            lesson.setNotes(notes);
        }
        lessonRepository.save(lesson);

        // Notify systems of status transition via Event publisher (Observer pattern)
        eventPublisher.publishEvent(new LessonStatusEvent(
                this, lesson.getId(), oldStatus, status,
                "Lesson ID " + id + " transitioned from " + oldStatus + " to " + status
        ));
    }

    public void updateLessonStatus(Long id, String status, String notes) {
        updateLessonStatus(id, status, notes, null);
    }

    private LessonDto convertToDto(Lesson lesson) {
        LessonDto dto = new LessonDto();
        dto.setId(lesson.getId());
        if (lesson.getStudent() != null) {
            dto.setStudentId(lesson.getStudent().getId());
            dto.setStudentName(lesson.getStudent().getName());
        }
        if (lesson.getGroup() != null) {
            dto.setGroupId(lesson.getGroup().getId());
            dto.setGroupName(lesson.getGroup().getTitle());
        }
        if (lesson.getWeeklySchedule() != null) {
            dto.setWeeklyScheduleId(lesson.getWeeklySchedule().getId());
        }
        dto.setDate(lesson.getDate());
        dto.setTime(lesson.getTime());
        dto.setTeacherName(lesson.getTeacherName());
        dto.setTopic(lesson.getTopic());
        dto.setDuration(lesson.getDuration());
        dto.setStatus(lesson.getStatus());
        dto.setNotes(lesson.getNotes());
        return dto;
    }

    private void ensureLessonAccess(Lesson lesson, Authentication authentication) {
        if (isAdmin(authentication)) return;
        if (lesson.getGroup() != null) ensureTeacherOwns(lesson.getGroup(), authentication);
        else if (lesson.getStudent() != null) ensureStudentAccess(lesson.getStudent(), authentication);
        else throw new AccessDeniedException("Нет доступа к этому занятию.");
    }

    private void ensureStudentAccess(Student student, Authentication authentication) {
        if (isAdmin(authentication)) return;
        boolean hasAccess = student.getGroup() != null
                && student.getGroup().getTeacher().getId().equals(currentTeacher(authentication).getId());
        if (!hasAccess) {
            hasAccess = student.getEnrolledGroups().stream()
                    .anyMatch(group -> group.getTeacher().getId().equals(currentTeacher(authentication).getId()));
        }
        if (!hasAccess) throw new AccessDeniedException("Нет доступа к данным этого студента.");
    }

    private void ensureTeacherOwns(SchoolGroup group, Authentication authentication) {
        StaffAccount teacher = currentTeacher(authentication);
        if (!group.getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("Это занятие или группа назначены другому преподавателю.");
        }
    }

    private StaffAccount currentTeacher(Authentication authentication) {
        if (authentication == null) {
            throw new AccessDeniedException("Требуется авторизация преподавателя.");
        }
        return accountRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(account -> "TEACHER".equals(account.getRole()) && account.isEnabled())
                .orElseThrow(() -> new AccessDeniedException("Активный аккаунт преподавателя не найден."));
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication == null || authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
