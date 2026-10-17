package com.school.crm.controller;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.dto.AdminRegistrationRequest;
import com.school.crm.model.dto.AuthResponse;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.service.StaffAuthService;
import com.school.crm.repository.StaffAccountRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StaffAuthService authService;
    private final StaffAccountRepository accountRepository;

    public AuthController(StaffAuthService authService, StaffAccountRepository accountRepository) {
        this.authService = authService;
        this.accountRepository = accountRepository;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerTeacher(request));
    }

    @PostMapping("/register/admin")
    public ResponseEntity<AuthResponse> registerAdmin(@Valid @RequestBody AdminRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                authService.registerAdmin(request.toAuthRequest(), request.registrationCode())
        );
    }

    @GetMapping("/me")
    public AuthResponse currentUser(Authentication authentication) {
        StaffAccount account = accountRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new StaffAuthService.InvalidCredentialsException("Учётная запись не найдена."));
        return new AuthResponse(
                null,
                account.getEmail(),
                account.getName(),
                StaffAuthService.isAdmin(account.getRole()) ? "Admin" : "Teacher",
                "SUPER_ADMIN".equals(account.getRole())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authorization) {
        authService.logout(authorization.substring("Bearer ".length()));
        return ResponseEntity.noContent().build();
    }
}
