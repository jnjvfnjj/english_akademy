package com.school.crm.service.impl;

import com.school.crm.model.dto.StudentDto;
import com.school.crm.model.entity.Student;
import com.school.crm.repository.StudentRepository;
import com.school.crm.repository.StudentDeletionNoticeRepository;
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
public class StudentServiceImplTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private StudentDeletionNoticeRepository deletionNoticeRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private StudentServiceImpl studentService;

    private Student student;
    private StudentDto studentDto;

    @BeforeEach
    void setUp() {
        student = new Student("John Doe", "john@mail.com", "1234567890", "B1", 10, "Adults", "Active", "Needs IELTS prep");
        student.setId(1L);

        studentDto = new StudentDto();
        studentDto.setName("John Doe");
        studentDto.setEmail("john@mail.com");
        studentDto.setPhone("1234567890");
        studentDto.setLevel("B1");
        studentDto.setBalance(10);
        studentDto.setAgeGroup("Adults");
        studentDto.setStatus("Active");
        studentDto.setNotes("Needs IELTS prep");
    }

    @Test
    void testGetStudentById_Success() {
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));

        StudentDto result = studentService.getStudentById(1L);

        assertNotNull(result);
        assertEquals("John Doe", result.getName());
        assertEquals("john@mail.com", result.getEmail());
    }

    @Test
    void testCreateStudent_Success() {
        when(studentRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(studentRepository.save(any(Student.class))).thenReturn(student);

        StudentDto result = studentService.createStudent(studentDto);

        assertNotNull(result);
        assertEquals("John Doe", result.getName());
    }

    @Test
    void testCreateStudent_ThrowsConflict() {
        when(studentRepository.findByEmail(any())).thenReturn(Optional.of(student));

        assertThrows(IllegalStateException.class, () -> studentService.createStudent(studentDto));
        verify(studentRepository, never()).save(any(Student.class));
    }

    @Test
    void createStudentStoresExplicitPaymentAndOneMonthExpiry() {
        studentDto.setBalance(12);
        studentDto.setTotalClasses(12);
        studentDto.setPaymentAmount(2100);
        studentDto.setPaymentDate(LocalDate.of(2025, 10, 1));
        studentDto.setEducationFormat("Продлёнка");
        studentDto.setCourses(java.util.List.of("Английский язык", "Математика"));
        when(studentRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(studentRepository.save(any(Student.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StudentDto result = studentService.createStudent(studentDto);

        assertEquals(LocalDate.of(2025, 10, 1), result.getPaymentDate());
        assertEquals(2100, result.getPaymentAmount());
        assertEquals(LocalDate.of(2025, 11, 1), result.getPaymentExpiresAt());
        assertEquals("KGS", result.getPaymentCurrency());
        assertEquals(12, result.getBalance());
        assertEquals(java.util.List.of("Английский язык", "Математика"), result.getCourses());
        verify(transactionRepository).save(argThat(payment ->
                payment.getAmount() == 2100
                        && payment.getDate().equals(LocalDate.of(2025, 10, 1))
                        && payment.getExpiresAt().equals(LocalDate.of(2025, 11, 1))
                        && payment.getLessonsPurchased() == 12));
    }

    @Test
    void updateStudentPersistsPaymentFieldsAndPackageBalance() {
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenAnswer(invocation -> invocation.getArgument(0));
        studentDto.setBalance(12);
        studentDto.setTotalClasses(12);
        studentDto.setTotalPaid(2100);
        studentDto.setPaymentAmount(2100);
        studentDto.setPaymentDate(LocalDate.of(2025, 10, 1));
        studentDto.setPaymentExpiresAt(LocalDate.of(2025, 11, 1));
        studentDto.setPaymentCurrency("KGS");

        StudentDto result = studentService.updateStudent(1L, studentDto);

        assertEquals(12, student.getBalance());
        assertEquals(2100, student.getTotalPaid());
        assertEquals(LocalDate.of(2025, 10, 1), result.getPaymentDate());
        assertEquals(2100, result.getPaymentAmount());
        assertEquals(LocalDate.of(2025, 11, 1), result.getPaymentExpiresAt());
        assertEquals("KGS", result.getPaymentCurrency());
    }
}
