package com.school.crm.service.impl;

import com.school.crm.design.observer.StudentBalanceEvent;
import com.school.crm.exception.ResourceNotFoundException;
import com.school.crm.model.dto.StudentDto;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.StudentDeletionNotice;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.SchoolGroupRepository;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class StudentServiceImpl implements StudentService {

    private static final Logger log = LoggerFactory.getLogger(StudentServiceImpl.class);
    private final StudentRepository studentRepository;
    private final SchoolGroupRepository groupRepository;
    private final StudentDeletionNoticeRepository deletionNoticeRepository;
    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    // Constructor-based Dependency Injection only! (Mandatory rule 3.3)
    public StudentServiceImpl(
            StudentRepository studentRepository,
            SchoolGroupRepository groupRepository,
            StudentDeletionNoticeRepository deletionNoticeRepository,
            TransactionRepository transactionRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.studentRepository = studentRepository;
        this.groupRepository = groupRepository;
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
        if (dto.getPaymentAmount() > 0 && (dto.getBalance() <= 0
                || dto.getEducationFormat() == null || dto.getEducationFormat().isBlank()
                || dto.getCourses() == null || dto.getCourses().stream().allMatch(course -> course == null || course.isBlank()))) {
            throw new IllegalArgumentException("Укажите формат, хотя бы один курс и положительное количество оплаченных занятий.");
        }
        String email = dto.getEmail() == null || dto.getEmail().isBlank() ? null : dto.getEmail().trim();
        if (email != null && studentRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("Email " + dto.getEmail() + " is already registered!");
        }

        Student student = new Student(
                dto.getName(),
                email,
                dto.getPhone(),
                dto.getLevel(),
                dto.getBalance(),
                dto.getAgeGroup(),
                dto.getStatus(),
                dto.getNotes()
        );

        student.setTotalClasses(dto.getTotalClasses() > 0 ? dto.getTotalClasses() : dto.getBalance());
        student.setTotalPaid(dto.getPaymentAmount() > 0 ? dto.getPaymentAmount()
                : dto.getTotalPaid() > 0 ? dto.getTotalPaid() : dto.getBalance() * 25.0);
        student.setEducationFormat(dto.getEducationFormat());
        student.setCourses(dto.getCourses() == null ? null : dto.getCourses().stream()
                .filter(Objects::nonNull).map(String::trim).filter(course -> !course.isEmpty())
                .distinct().collect(Collectors.joining("\n")));
        LocalDate paymentDate = dto.getPaymentDate() == null ? LocalDate.now() : dto.getPaymentDate();
        LocalDate expiresAt = dto.getPaymentExpiresAt();
        if (expiresAt == null && dto.getPaymentAmount() > 0) expiresAt = paymentDate.plusMonths(1);
        student.setPaymentDate(dto.getPaymentAmount() > 0 ? paymentDate : null);
        student.setPaymentAmount(dto.getPaymentAmount());
        student.setPaymentExpiresAt(expiresAt);
        student.setPaymentCurrency(dto.getPaymentAmount() > 0 ? "KGS" : dto.getPaymentCurrency());
        student.setGroup(resolveGroup(dto.getGroupId()));
        if (dto.getGroupIds() != null) {
            student.setEnrolledGroups(new ArrayList<>(groupRepository.findAllById(dto.getGroupIds())));
            if (student.getEnrolledGroups().size() != dto.getGroupIds().stream().distinct().count()) {
                throw new IllegalArgumentException("Одна или несколько выбранных групп не найдены.");
            }
        }

        Student saved = studentRepository.save(student);
        if (dto.getPaymentAmount() > 0) {
            com.school.crm.model.entity.Transaction payment = new com.school.crm.model.entity.Transaction(
                    saved,
                    dto.getPaymentAmount(),
                    "Income",
                    "Tuition",
                    paymentDate,
                    "Оплата обучения: " + saved.getBalance() + " занятий"
            );
            payment.setLessonsPurchased(saved.getBalance());
            payment.setExpiresAt(expiresAt);
            payment.setCurrency("KGS");
            transactionRepository.save(payment);
        }
        log.info("[Service Log] Successfully created student profile: {}", saved.getName());
        return convertToDto(saved);
    }

    @Override
    @Transactional
    public StudentDto updateStudent(Long id, StudentDto dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        student.setName(dto.getName());
        student.setEmail(dto.getEmail() == null || dto.getEmail().isBlank() ? null : dto.getEmail().trim());
        student.setPhone(dto.getPhone());
        student.setLevel(dto.getLevel());
        student.setAgeGroup(dto.getAgeGroup());
        student.setStatus(dto.getStatus());
        student.setNotes(dto.getNotes());
        student.setEducationFormat(dto.getEducationFormat());
        student.setCourses(dto.getCourses() == null ? null : dto.getCourses().stream()
                .filter(Objects::nonNull).map(String::trim).filter(course -> !course.isEmpty())
                .distinct().collect(Collectors.joining("\n")));
        if (dto.getPaymentDate() != null && dto.getPaymentAmount() > 0) {
            student.setBalance(dto.getBalance());
            student.setTotalClasses(dto.getTotalClasses());
            student.setTotalPaid(dto.getTotalPaid());
            student.setPaymentDate(dto.getPaymentDate());
            student.setPaymentAmount(dto.getPaymentAmount());
            student.setPaymentExpiresAt(dto.getPaymentExpiresAt());
            student.setPaymentCurrency(dto.getPaymentCurrency());
        }
        student.setGroup(resolveGroup(dto.getGroupId()));
        if (dto.getGroupIds() != null) {
            List<com.school.crm.model.entity.SchoolGroup> enrolledGroups =
                    new ArrayList<>(groupRepository.findAllById(dto.getGroupIds()));
            if (enrolledGroups.size() != dto.getGroupIds().stream().distinct().count()) {
                throw new IllegalArgumentException("Одна или несколько выбранных групп не найдены.");
            }
            student.setEnrolledGroups(enrolledGroups);
        }

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
        dto.setEducationFormat(student.getEducationFormat());
        dto.setCourses(student.getCourses() == null || student.getCourses().isBlank()
                ? List.of() : List.of(student.getCourses().split("\n")));
        dto.setPaymentExpiresAt(student.getPaymentExpiresAt());
        dto.setPaymentDate(student.getPaymentDate());
        dto.setPaymentAmount(student.getPaymentAmount());
        dto.setPaymentCurrency(student.getPaymentCurrency());
        dto.setAgeGroup(student.getAgeGroup());
        dto.setStatus(student.getStatus());
        dto.setNotes(student.getNotes());
        if (student.getGroup() != null) {
            dto.setGroupId(student.getGroup().getId());
            dto.setGroupName(student.getGroup().getTitle());
        }
        List<Long> groupIds = new ArrayList<>(student.getEnrolledGroups().stream()
                .map(group -> group.getId()).toList());
        if (student.getGroup() != null && !groupIds.contains(student.getGroup().getId())) {
            groupIds.add(student.getGroup().getId());
        }
        dto.setGroupIds(groupIds);
        return dto;
    }

    private com.school.crm.model.entity.SchoolGroup resolveGroup(Long groupId) {
        if (groupId == null) return null;
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with ID: " + groupId));
    }
}
