package com.school.crm.service;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.dto.AuthResponse;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.model.entity.StaffSession;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StaffSessionRepository;
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
    private final SecureRandom secureRandom = new SecureRandom();

    public StaffAuthService(
            StaffAccountRepository accountRepository,
            StaffSessionRepository sessionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.accountRepository = accountRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
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
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Укажите имя преподавателя.");
        }
        String email = request.email().trim().toLowerCase();
        if (accountRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalStateException("Пользователь с таким email уже зарегистрирован.");
        }

        StaffAccount teacher = accountRepository.save(new StaffAccount(
                email,
                request.name().trim(),
                passwordEncoder.encode(request.password()),
                "TEACHER"
        ));
        return createSession(teacher);
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
                "ADMIN".equals(account.getRole()) ? "Admin" : "Teacher"
        );
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
}
