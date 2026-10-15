package com.school.crm.service.impl;

import com.school.crm.model.dto.StudentDto;
import com.school.crm.model.entity.Student;
import com.school.crm.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudentServiceImplTest {

    @Mock
    private StudentRepository studentRepository;

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
}
