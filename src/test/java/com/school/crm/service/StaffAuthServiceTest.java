package com.school.crm.service;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StaffSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffAuthServiceTest {

    @Mock
    private StaffAccountRepository accountRepository;

    @Mock
    private StaffSessionRepository sessionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private StaffAuthService authService;

    @Test
    void createAdminAccountSavesAdminWithNormalizedEmailAndEncodedPassword() {
        AuthRequest request = new AuthRequest("ADMIN@school.com", "password123", "  Alex Admin  ");
        when(accountRepository.existsByEmailIgnoreCase("admin@school.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(accountRepository.save(any(StaffAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StaffAccount account = authService.createAdminAccount(request);

        assertEquals("admin@school.com", account.getEmail());
        assertEquals("Alex Admin", account.getName());
        assertEquals("encoded-password", account.getPasswordHash());
        assertEquals("ADMIN", account.getRole());
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void createAdminAccountRejectsExistingEmail() {
        AuthRequest request = new AuthRequest("admin@school.com", "password123", "Alex Admin");
        when(accountRepository.existsByEmailIgnoreCase("admin@school.com")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> authService.createAdminAccount(request));

        verify(accountRepository, never()).save(any(StaffAccount.class));
    }

    @Test
    void createAdminAccountRequiresName() {
        AuthRequest request = new AuthRequest("admin@school.com", "password123", "  ");

        assertThrows(IllegalArgumentException.class, () -> authService.createAdminAccount(request));

        verify(accountRepository, never()).save(any(StaffAccount.class));
    }

    @Test
    void registerTeacherStillRequiresName() {
        AuthRequest request = new AuthRequest("teacher@school.com", "password123", " ");

        assertThrows(IllegalArgumentException.class, () -> authService.registerTeacher(request));

        verify(accountRepository, never()).save(any(StaffAccount.class));
    }
}
