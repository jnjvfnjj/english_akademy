package com.school.crm.service;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.dto.AuthResponse;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.model.entity.StaffSession;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StaffSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class StaffAuthService {

    private final StaffAccountRepository accountRepository;
    private final StaffSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminRegistrationCode;
    private final SecureRandom secureRandom = new SecureRandom();

    public StaffAuthService(
            StaffAccountRepository accountRepository,
            StaffSessionRepository sessionRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin-registration-code:}") String adminRegistrationCode
    ) {
        this.accountRepository = accountRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminRegistrationCode = adminRegistrationCode;
    }

    @Transactional
    public AuthResponse login(AuthRequest request) {
        StaffAccount account = accountRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new InvalidCredentialsException("Неверный email или пароль."));
        return createSession(account);
    }

    @Transactional
    public AuthResponse registerTeacher(AuthRequest request) {
        requireName(request, "преподавателя");
        StaffAccount teacher = createAccount(request, "TEACHER");
        return createSession(teacher);
    }

    @Transactional
    public AuthResponse registerAdmin(AuthRequest request, String registrationCode) {
        requireName(request, "администратора");
        if (adminRegistrationCode == null || adminRegistrationCode.length() < 16) {
            throw new AdminRegistrationException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Регистрация администраторов отключена. Настройте ADMIN_REGISTRATION_CODE на сервере."
            );
        }
        if (registrationCode == null || !MessageDigest.isEqual(
                adminRegistrationCode.getBytes(StandardCharsets.UTF_8),
                registrationCode.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new AdminRegistrationException(
                    HttpStatus.FORBIDDEN,
                    "Неверный код регистрации администратора."
            );
        }
        return createSession(createAccount(request, "ADMIN"));
    }

    @Transactional
    public StaffAccount createAdminAccount(AuthRequest request) {
        requireName(request, "администратора");
        return createAccount(request, "ADMIN");
    }

    @Transactional
    public StaffAccount createInitialSuperAdmin(AuthRequest request) {
        requireName(request, "главного администратора");
        requireSuperAdminPassword(request);
        if (accountRepository.existsByRole("SUPER_ADMIN")) {
            throw new IllegalStateException("Главный администратор уже создан.");
        }
        return createAccount(request, "SUPER_ADMIN");
    }

    @Transactional
    public StaffAccount provisionSuperAdmin(AuthRequest request) {
        requireName(request, "главного администратора");
        requireSuperAdminPassword(request);
        var existingSuperAdmin = accountRepository.findFirstByRole("SUPER_ADMIN");
        if (existingSuperAdmin.isPresent()) {
            return existingSuperAdmin.get();
        }

        String email = request.email().trim().toLowerCase();
        StaffAccount existingAccount = accountRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existingAccount != null) {
            if (!"ADMIN".equals(existingAccount.getRole())) {
                throw new IllegalStateException(
                        "Email главного администратора уже используется учётной записью без прав администратора."
                );
            }
            existingAccount.setRole("SUPER_ADMIN");
            return accountRepository.save(existingAccount);
        }

        return createAccount(request, "SUPER_ADMIN");
    }

    private void requireName(AuthRequest request, String accountType) {
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Укажите имя " + accountType + ".");
        }
    }

    private void requireSuperAdminPassword(AuthRequest request) {
        if (request.password() == null || request.password().length() < 12) {
            throw new IllegalArgumentException("Пароль главного администратора должен содержать не менее 12 символов.");
        }
    }

    private StaffAccount createAccount(AuthRequest request, String role) {
        String email = request.email().trim().toLowerCase();
        if (accountRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalStateException("Пользователь с таким email уже зарегистрирован.");
        }

        return accountRepository.save(new StaffAccount(
                email,
                request.name().trim(),
                passwordEncoder.encode(request.password()),
                role
        ));
    }

    @Transactional(readOnly = true)
    public StaffAccount authenticate(String rawToken) {
        return sessionRepository.findByTokenHashAndExpiresAtAfter(hashToken(rawToken), Instant.now())
                .map(StaffSession::getAccount)
                .orElse(null);
    }

    @Transactional
    public void logout(String rawToken) {
        sessionRepository.deleteByTokenHash(hashToken(rawToken));
    }

    private AuthResponse createSession(StaffAccount account) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessionRepository.save(new StaffSession(
                hashToken(token),
                account,
                Instant.now().plus(30, ChronoUnit.DAYS)
        ));
        return new AuthResponse(
                token,
                account.getEmail(),
                account.getName(),
                isAdmin(account.getRole()) ? "Admin" : "Teacher",
                "SUPER_ADMIN".equals(account.getRole())
        );
    }

    public static boolean isAdmin(String role) {
        return "ADMIN".equals(role) || "SUPER_ADMIN".equals(role);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable.", error);
        }
    }

    public static class InvalidCredentialsException extends RuntimeException {
        public InvalidCredentialsException(String message) {
            super(message);
        }
    }

    public static class AdminRegistrationException extends RuntimeException {
        private final HttpStatus status;

        public AdminRegistrationException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

}
