package com.school.crm.controller;

import com.school.crm.model.dto.TeacherProfileResponse;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.repository.StaffAccountRepository;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teachers")
public class TeacherProfileController {

    private final StaffAccountRepository accountRepository;

    public TeacherProfileController(StaffAccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @GetMapping("/me")
    public TeacherProfileResponse currentTeacher(Authentication authentication) {
        StaffAccount account = accountRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(StaffAccount::isEnabled)
                .orElseThrow(() -> new AccessDeniedException("Активный аккаунт не найден."));
        if (!"TEACHER".equals(account.getRole())) {
            throw new AccessDeniedException("Профиль доступен только преподавателям.");
        }

        return new TeacherProfileResponse(
                account.getName(),
                account.getEmail(),
                "Teacher",
                account.canViewStudentPayments()
        );
    }
}
