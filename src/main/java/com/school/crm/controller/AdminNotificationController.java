package com.school.crm.controller;

import com.school.crm.model.dto.StudentDeletionNoticeDto;
import com.school.crm.repository.StudentDeletionNoticeRepository;
import com.school.crm.repository.StudentRepository;
import com.school.crm.model.dto.PaymentReminderDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final StudentDeletionNoticeRepository noticeRepository;
    private final StudentRepository studentRepository;

    public AdminNotificationController(
            StudentDeletionNoticeRepository noticeRepository,
            StudentRepository studentRepository
    ) {
        this.noticeRepository = noticeRepository;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/payments")
    public List<PaymentReminderDto> getPaymentReminders() {
        return studentRepository.findAll().stream()
                .filter(student -> "Active".equalsIgnoreCase(student.getStatus()) && student.getBalance() <= 2)
                .map(student -> new PaymentReminderDto(
                        student.getId(),
                        student.getName(),
                        student.getBalance(),
                        student.getPaymentExpiresAt()
                ))
                .toList();
    }

    @GetMapping
    public List<StudentDeletionNoticeDto> getDeletionNotices(
            @RequestParam(defaultValue = "0") Long afterId
    ) {
        if (afterId == 0) {
            return noticeRepository.findFirstByOrderByIdDesc()
                    .map(notice -> List.of(toDto(notice)))
                    .orElseGet(List::of);
        }
        return noticeRepository.findTop50ByIdGreaterThanOrderByIdAsc(afterId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private StudentDeletionNoticeDto toDto(com.school.crm.model.entity.StudentDeletionNotice notice) {
        return new StudentDeletionNoticeDto(
                notice.getId(),
                notice.getDeletedStudentId(),
                notice.getStudentName(),
                notice.getStudentEmail(),
                notice.getDeletedBy(),
                notice.getDeletedAt()
        );
    }
}
