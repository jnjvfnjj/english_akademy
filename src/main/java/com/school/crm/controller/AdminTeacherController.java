package com.school.crm.controller;

import com.school.crm.model.dto.TeacherAccountResponse;
import com.school.crm.model.dto.TeacherStatusRequest;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.service.StaffAuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/teachers")
public class AdminTeacherController {

    private final StaffAuthService authService;

    public AdminTeacherController(StaffAuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<TeacherAccountResponse> listTeachers() {
        return authService.getTeachers().stream()
                .map(AdminTeacherController::toResponse)
                .toList();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TeacherAccountResponse> updateTeacherStatus(
            @PathVariable long id,
            @Valid @RequestBody TeacherStatusRequest request
    ) {
        return ResponseEntity.ok(toResponse(authService.setTeacherEnabled(id, request.active())));
    }

    private static TeacherAccountResponse toResponse(StaffAccount account) {
        return new TeacherAccountResponse(
                account.getId(),
                account.getName(),
                account.getEmail(),
                account.isEnabled()
        );
    }
}
