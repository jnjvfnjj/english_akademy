package com.school.crm.controller;

import com.school.crm.model.dto.StudentDeletionNoticeDto;
import com.school.crm.repository.StudentDeletionNoticeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final StudentDeletionNoticeRepository noticeRepository;

    public AdminNotificationController(StudentDeletionNoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
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
