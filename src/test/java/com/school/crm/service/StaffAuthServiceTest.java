package com.school.crm.service;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.dto.TeacherCreateRequest;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.StaffSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

    private StaffAuthService authService;

    @BeforeEach
    void setUp() {
        authService = new StaffAuthService(
                accountRepository,
                sessionRepository,
                passwordEncoder,
                "test-registration-code-1234"
        );
    }

    @Test
    void createAdminAccountSavesAdminWithNormalizedEmailAndEncodedPassword() {
        AuthRequest request = new AuthRequest("ADMIN@school.com", "password1234", "  Alex Admin  ");
        when(accountRepository.existsByEmailIgnoreCase("admin@school.com")).thenReturn(false);
        when(passwordEncoder.encode("password1234")).thenReturn("encoded-password");
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
        AuthRequest request = new AuthRequest("admin@school.com", "password1234", "Alex Admin");
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
    void adminProvisionedTeacherRequiresName() {
        TeacherCreateRequest request = new TeacherCreateRequest("teacher@school.com", " ", "password123");

        assertThrows(IllegalArgumentException.class, () -> authService.createTeacher(request));

        verify(accountRepository, never()).save(any(StaffAccount.class));
    }

    @Test
    void loginIncludesTheSuperAdminFlag() {
        StaffAccount superAdmin = new StaffAccount(
                "owner@school.com",
                "School Owner",
                "encoded-password",
                "SUPER_ADMIN"
        );
        when(accountRepository.findByEmailIgnoreCase("owner@school.com"))
                .thenReturn(java.util.Optional.of(superAdmin));
        when(passwordEncoder.matches("password1234", "encoded-password")).thenReturn(true);

        var response = authService.login(new AuthRequest("owner@school.com", "password1234", null));

        assertEquals("Admin", response.role());
        assertTrue(response.superAdmin());
    }

    @Test
    void registerAdminWithValidCodeCreatesAdminAndSession() {
        AuthRequest request = new AuthRequest("ADMIN@school.com", "password1234", "Alex Admin");
        when(accountRepository.existsByEmailIgnoreCase("admin@school.com")).thenReturn(false);
        when(passwordEncoder.encode("password1234")).thenReturn("encoded-password");
        when(accountRepository.save(any(StaffAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = authService.registerAdmin(request, "test-registration-code-1234");

        assertEquals("admin@school.com", response.email());
        assertEquals("Admin", response.role());
        assertEquals(false, response.superAdmin());
        verify(accountRepository).save(any(StaffAccount.class));
        verify(sessionRepository).save(any());
    }

    @Test
    void registerAdminRejectsInvalidCode() {
        AuthRequest request = new AuthRequest("admin@school.com", "password1234", "Alex Admin");

        assertThrows(
                StaffAuthService.AdminRegistrationException.class,
                () -> authService.registerAdmin(request, "incorrect-registration-code")
        );

        verify(accountRepository, never()).save(any(StaffAccount.class));
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void registerAdminIsDisabledWithoutConfiguredCode() {
        StaffAuthService serviceWithoutCode = new StaffAuthService(
                accountRepository,
                sessionRepository,
                passwordEncoder,
                ""
        );

        assertThrows(
                StaffAuthService.AdminRegistrationException.class,
                () -> serviceWithoutCode.registerAdmin(
                        new AuthRequest("admin@school.com", "password1234", "Alex Admin"),
                        "test-registration-code-1234"
                )
        );

        verify(accountRepository, never()).save(any(StaffAccount.class));
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void provisionSuperAdminCreatesTheOnlyMainAdmin() {
        AuthRequest request = new AuthRequest("ADMIN@school.com", "password1234", "  Alex Admin  ");
        when(accountRepository.findFirstByRole("SUPER_ADMIN")).thenReturn(java.util.Optional.empty());
        when(accountRepository.existsByEmailIgnoreCase("admin@school.com")).thenReturn(false);
        when(passwordEncoder.encode("password1234")).thenReturn("encoded-password");
        when(accountRepository.save(any(StaffAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StaffAccount account = authService.provisionSuperAdmin(request);

        assertEquals("admin@school.com", account.getEmail());
        assertEquals("Alex Admin", account.getName());
        assertEquals("SUPER_ADMIN", account.getRole());
        verify(accountRepository).save(any(StaffAccount.class));
    }

    @Test
    void provisionSuperAdminPromotesConfiguredExistingAdmin() {
        AuthRequest request = new AuthRequest("admin@school.com", "password1234", "Alex Admin");
        StaffAccount existingAccount = new StaffAccount(
                "admin@school.com",
                "Alex Admin",
                "existing-password-hash",
                "ADMIN"
        );
        when(accountRepository.findFirstByRole("SUPER_ADMIN")).thenReturn(java.util.Optional.empty());
        when(accountRepository.findByEmailIgnoreCase("admin@school.com"))
                .thenReturn(java.util.Optional.of(existingAccount));
        when(accountRepository.save(existingAccount)).thenReturn(existingAccount);

        StaffAccount account = authService.provisionSuperAdmin(request);

        assertEquals("SUPER_ADMIN", account.getRole());
        assertEquals("existing-password-hash", account.getPasswordHash());
        verify(passwordEncoder, never()).encode(any());
        verify(accountRepository).save(existingAccount);
    }

    @Test
    void createInitialSuperAdminRejectsASecondMainAdmin() {
        when(accountRepository.existsByRole("SUPER_ADMIN")).thenReturn(true);

        assertThrows(
                IllegalStateException.class,
                () -> authService.createInitialSuperAdmin(
                        new AuthRequest("admin@school.com", "password1234", "Alex Admin")
                )
        );

        verify(accountRepository, never()).save(any(StaffAccount.class));
    }

    @Test
    void disablingTeacherRevokesSessionsAndCanLaterBeReenabled() {
        StaffAccount teacher = new StaffAccount(
                "teacher@school.com",
                "Alex Teacher",
                "encoded-password",
                "TEACHER"
        );
        when(accountRepository.findById(42L)).thenReturn(java.util.Optional.of(teacher));
        when(accountRepository.save(teacher)).thenReturn(teacher);

        StaffAccount disabled = authService.setTeacherEnabled(42L, false);

        assertEquals(false, disabled.isEnabled());
        verify(sessionRepository).deleteAllByAccount_Id(42L);

        StaffAccount reenabled = authService.setTeacherEnabled(42L, true);

        assertEquals(true, reenabled.isEnabled());
        verify(sessionRepository, times(1)).deleteAllByAccount_Id(42L);
    }
}
