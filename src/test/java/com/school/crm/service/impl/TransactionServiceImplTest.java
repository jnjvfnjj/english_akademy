package com.school.crm.service.impl;

import com.school.crm.model.dto.TransactionDto;
import com.school.crm.model.entity.Student;
import com.school.crm.model.entity.Transaction;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransactionServiceImplTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private Student student;
    private Transaction transaction;
    private TransactionDto transactionDto;

    @BeforeEach
    void setUp() {
        student = new Student("Bob Ross", "bob@art.com", "12345", "C1", 4, "Adults", "Active", "");
        student.setId(2L);
        student.setTotalPaid(100.0);

        transaction = new Transaction(student, 225.0, "Income", "Tuition", LocalDate.now(), "Top-up package");
        transaction.setId(100L);

        transactionDto = new TransactionDto();
        transactionDto.setStudentId(2L);
        transactionDto.setAmount(250.0); // 10 hours * $25 standard rate (becomes $225.0 under 10% standard bulk package billing strategy!)
        transactionDto.setType("Income");
        transactionDto.setCategory("Tuition");
        transactionDto.setDate(LocalDate.now());
        transactionDto.setDescription("Buying 10 bulk hours");
        transactionDto.setPricingTier("STANDARD_PACKAGE"); // Triggers Strategy calculation!
    }

    @Test
    void testCreateTransaction_StrategyServiceSuccess() {
        when(studentRepository.findById(2L)).thenReturn(Optional.of(student));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);

        TransactionDto result = transactionService.createTransaction(transactionDto);

        assertNotNull(result);
        // Billing Strategy Verification:
        // Bob started with 4 hours.
        // Paid tuition using 'STANDARD_PACKAGE' for 10 hours.
        // Rate per hour for STANDARD_PACKAGE is $22.50. Total pricing strategy calculated amount is $225.0.
        // New student hours balance must be 4 + 10 = 14.
        assertEquals(14, student.getBalance());
        assertEquals(325.0, student.getTotalPaid()); // 100 + 225 = 325

        verify(studentRepository, times(1)).save(student);
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void createTransactionUsesExplicitLessonCountAndPaymentDates() {
        LocalDate paidAt = LocalDate.of(2025, 10, 1);
        LocalDate expiresAt = LocalDate.of(2025, 11, 1);
        transactionDto.setPricingTier(null);
        transactionDto.setAmount(2100);
        transactionDto.setDate(paidAt);
        transactionDto.setDescription("Оплата 12 занятий");
        transactionDto.setLessonsPurchased(12);
        transactionDto.setExpiresAt(expiresAt);
        transactionDto.setCurrency("KGS");
        when(studentRepository.findById(2L)).thenReturn(Optional.of(student));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TransactionDto result = transactionService.createTransaction(transactionDto);

        assertEquals(16, student.getBalance());
        assertEquals(2100, student.getTotalPaid());
        assertEquals("KGS", student.getPaymentCurrency());
        assertEquals(2100, student.getPaymentAmount());
        assertEquals(paidAt, student.getPaymentDate());
        assertEquals(expiresAt, student.getPaymentExpiresAt());
        assertEquals(12, result.getLessonsPurchased());
        assertEquals(expiresAt, result.getExpiresAt());
        assertEquals("KGS", result.getCurrency());
    }
}
