package com.school.crm.service.impl;

import com.school.crm.design.observer.LessonStatusEvent;
import com.school.crm.design.observer.StudentBalanceEvent;
import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.LessonDto;
import com.school.crm.model.entity.Lesson;
import com.school.crm.model.entity.Student;
import com.school.crm.repository.LessonRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.service.LessonService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LessonServiceImpl implements LessonService {

    private static final Logger log = LoggerFactory.getLogger(LessonServiceImpl.class);
    private final LessonRepository lessonRepository;
    private final StudentRepository studentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public LessonServiceImpl(LessonRepository lessonRepository, StudentRepository studentRepository, ApplicationEventPublisher eventPublisher) {
        this.lessonRepository = lessonRepository;
        this.studentRepository = studentRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonDto> getAllLessons() {
        return lessonRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonDto> getLessonsByStudent(Long studentId) {
        if (!studentRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student not found with ID: " + studentId);
        }
        return lessonRepository.findByStudentId(studentId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LessonDto getLessonById(Long id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        return convertToDto(lesson);
    }

    @Override
    @Transactional
    public LessonDto createLesson(LessonDto dto) {
        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + dto.getStudentId()));

        // Non-trivial business rule: check balance before scheduling (require at least 1 hour)
        if (student.getBalance() <= 0) {
            throw new IllegalStateException("Cannot schedule lesson! Student " + student.getName() + " has 0 hours left in package balance.");
        }

        Lesson lesson = new Lesson(
                student,
                dto.getDate(),
                dto.getTime(),
                dto.getTeacherName(),
                dto.getTopic(),
                dto.getDuration(),
                dto.getStatus(),
                dto.getNotes()
        );

        // If the immediate scheduled status is set to Completed on creation, deduct balance
        if ("Completed".equalsIgnoreCase(dto.getStatus())) {
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
        log.info("[Service Log] Scheduled new lesson for Student: {}", student.getName());
        return convertToDto(saved);
    }

    @Override
    @Transactional
    public LessonDto updateLesson(Long id, LessonDto dto) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));

        // Delegate status mutation logic to dedicated status updater in order to handle triggers correctly
        String oldStatus = lesson.getStatus();
        
        lesson.setDate(dto.getDate());
        lesson.setTime(dto.getTime());
        lesson.setTeacherName(dto.getTeacherName());
        lesson.setTopic(dto.getTopic());
        lesson.setDuration(dto.getDuration());
        lesson.setNotes(dto.getNotes());

        Lesson updated = lessonRepository.save(lesson);

        // If status changed in standard put request, process the business trigger
        if (!oldStatus.equalsIgnoreCase(dto.getStatus())) {
            updateLessonStatus(id, dto.getStatus(), dto.getNotes());
        }

        return convertToDto(updated);
    }

    @Override
    @Transactional
    public void deleteLesson(Long id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));
        lessonRepository.delete(lesson);
    }

    @Override
    @Transactional
    public void updateLessonStatus(Long id, String status, String notes) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + id));

        String oldStatus = lesson.getStatus();
        if (oldStatus.equalsIgnoreCase(status)) {
            return; // No transition needed
        }

        Student student = lesson.getStudent();

        // Complex Business Life-cycle Transition Triggers:
        // Transition PENDING/SCHEDULED -> COMPLETED deducts 1 hour package
        if ("Scheduled".equalsIgnoreCase(oldStatus) && "Completed".equalsIgnoreCase(status)) {
            int oldBalance = student.getBalance();
            student.deductBalance(1);
            student.setTotalClasses(student.getTotalClasses() + 1);
            studentRepository.save(student);

            eventPublisher.publishEvent(new StudentBalanceEvent(
                    this, student.getId(), oldBalance, student.getBalance(),
                    "Lesson completed: deducted 1 hour. Total completed classes: " + student.getTotalClasses()
            ));
        }
        // Transition COMPLETED -> CANCELLED restores 1 hour package
        else if ("Completed".equalsIgnoreCase(oldStatus) && "Cancelled".equalsIgnoreCase(status)) {
            int oldBalance = student.getBalance();
            student.addBalance(1);
            student.setTotalClasses(Math.max(0, student.getTotalClasses() - 1));
            studentRepository.save(student);

            eventPublisher.publishEvent(new StudentBalanceEvent(
                    this, student.getId(), oldBalance, student.getBalance(),
                    "Lesson cancelled after completion: restored 1 hour."
            ));
        }

        lesson.setStatus(status);
        if (notes != null) {
            lesson.setNotes(notes);
        }
        lessonRepository.save(lesson);

        // Notify systems of status transition via Event publisher (Observer pattern)
        eventPublisher.publishEvent(new LessonStatusEvent(
                this, lesson.getId(), oldStatus, status,
                "Lesson ID " + id + " for " + student.getName() + " transitioned from " + oldStatus + " to " + status
        ));
    }

    private LessonDto convertToDto(Lesson lesson) {
        LessonDto dto = new LessonDto();
        dto.setId(lesson.getId());
        dto.setStudentId(lesson.getStudent().getId());
        dto.setStudentName(lesson.getStudent().getName());
        dto.setDate(lesson.getDate());
        dto.setTime(lesson.getTime());
        dto.setTeacherName(lesson.getTeacherName());
        dto.setTopic(lesson.getTopic());
        dto.setDuration(lesson.getDuration());
        dto.setStatus(lesson.getStatus());
        dto.setNotes(lesson.getNotes());
        return dto;
    }
}
