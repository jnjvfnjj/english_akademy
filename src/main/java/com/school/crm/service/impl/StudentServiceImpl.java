package com.school.crm.service.impl;

import com.school.crm.design.observer.StudentBalanceEvent;
import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.StudentDto;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.StudentDeletionNotice;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.StudentDeletionNoticeRepository;
import com.school.crm.repository.TransactionRepository;
import com.school.crm.service.StudentService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StudentServiceImpl implements StudentService {

    private static final Logger log = LoggerFactory.getLogger(StudentServiceImpl.class);
    private final StudentRepository studentRepository;
    private final StudentDeletionNoticeRepository deletionNoticeRepository;
    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    // Constructor-based Dependency Injection only! (Mandatory rule 3.3)
    public StudentServiceImpl(
            StudentRepository studentRepository,
            StudentDeletionNoticeRepository deletionNoticeRepository,
            TransactionRepository transactionRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.studentRepository = studentRepository;
        this.deletionNoticeRepository = deletionNoticeRepository;
        this.transactionRepository = transactionRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents() {
        return studentRepository.findAll()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
        return convertToDto(student);
    }

    @Override
    @Transactional
    public StudentDto createStudent(StudentDto dto) {
        if (studentRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new IllegalStateException("Email " + dto.getEmail() + " is already registered!");
        }

        Student student = new Student(
                dto.getName(),
                dto.getEmail(),
                dto.getPhone(),
                dto.getLevel(),
                dto.getBalance(),
                dto.getAgeGroup(),
                dto.getStatus(),
                dto.getNotes()
        );

        // Precalculate total paid and total classes based on initial package rate ($25/hr default)
        student.setTotalClasses(dto.getBalance());
        student.setTotalPaid(dto.getBalance() * 25.0);

        Student saved = studentRepository.save(student);
        log.info("[Service Log] Successfully created student profile: {}", saved.getName());
        return convertToDto(saved);
    }

    @Override
    @Transactional
    public StudentDto updateStudent(Long id, StudentDto dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        student.setName(dto.getName());
        student.setEmail(dto.getEmail());
        student.setPhone(dto.getPhone());
        student.setLevel(dto.getLevel());
        student.setAgeGroup(dto.getAgeGroup());
        student.setStatus(dto.getStatus());
        student.setNotes(dto.getNotes());

        Student updated = studentRepository.save(student);
        return convertToDto(updated);
    }

    @Override
    @Transactional
    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String deletedBy = authentication == null ? "unknown" : authentication.getName();
        StudentDeletionNotice notice = new StudentDeletionNotice(
                student.getId(),
                student.getName(),
                student.getEmail(),
                deletedBy
        );
        transactionRepository.findByStudentId(id).forEach(transaction -> {
            transaction.setStudent(null);
            student.getTransactions().remove(transaction);
            transactionRepository.save(transaction);
        });
        studentRepository.delete(student);
        deletionNoticeRepository.save(notice);
        log.info("Student {} deleted by {}", id, deletedBy);
    }

    @Override
    @Transactional
    public void adjustStudentBalance(Long id, int amount) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        int oldBalance = student.getBalance();
        if (amount < 0) {
            student.deductBalance(Math.abs(amount));
        } else {
            student.addBalance(amount);
        }

        studentRepository.save(student);

        // Observer Pattern: Publish custom StudentBalanceEvent to alert of state modifications
        eventPublisher.publishEvent(new StudentBalanceEvent(
                this,
                student.getId(),
                oldBalance,
                student.getBalance(),
                "Adjusted balance for student " + student.getName() + " by " + amount + " hours."
        ));
    }

    // Manual Object Conversion to fulfill architectural constraints without external mappers
    private StudentDto convertToDto(Student student) {
        StudentDto dto = new StudentDto();
        dto.setId(student.getId());
        dto.setName(student.getName());
        dto.setEmail(student.getEmail());
        dto.setPhone(student.getPhone());
        dto.setLevel(student.getLevel());
        dto.setBalance(student.getBalance());
        dto.setTotalClasses(student.getTotalClasses());
        dto.setTotalPaid(student.getTotalPaid());
        dto.setAgeGroup(student.getAgeGroup());
        dto.setStatus(student.getStatus());
        dto.setNotes(student.getNotes());
        return dto;
    }
}
