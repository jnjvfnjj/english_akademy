package com.school.crm.controller;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.dto.StaffAccountResponse;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.service.StaffAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final StaffAuthService authService;

    public AdminUserController(StaffAuthService authService) {
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<StaffAccountResponse> createAdmin(@Valid @RequestBody AuthRequest request) {
        StaffAccount account = authService.createAdminAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new StaffAccountResponse(
                account.getEmail(),
                account.getName(),
                "Admin",
                false
        ));
    }
}
