package com.school.crm.controller;

import com.school.crm.model.dto.StudentDto;
import com.school.crm.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*") // Allow React Native front-end to call endpoints smoothly
public class StudentController {

    private final StudentService studentService;

    // Direct Constructor Injection - No @Autowired on fields (Mandatory guideline constraint 3.3)
    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    public ResponseEntity<List<StudentDto>> getAllStudents(Authentication authentication) {
        return ResponseEntity.ok(studentService.getAllStudents().stream()
                .map(student -> hideFinancialFieldsForTeachers(student, authentication))
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(hideFinancialFieldsForTeachers(studentService.getStudentById(id), authentication));
    }

    @PostMapping
    public ResponseEntity<StudentDto> createStudent(
            @Valid @RequestBody StudentDto studentDto,
            Authentication authentication
    ) {
        StudentDto created = studentService.createStudent(studentDto);
        return new ResponseEntity<>(hideFinancialFieldsForTeachers(created, authentication), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentDto> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody StudentDto studentDto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(hideFinancialFieldsForTeachers(studentService.updateStudent(id, studentDto), authentication));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }

    // Custom non-trivial balance adjust endpoint
    @PostMapping("/{id}/adjust-balance")
    public ResponseEntity<Void> adjustStudentBalance(@PathVariable Long id, @RequestParam int amount) {
        studentService.adjustStudentBalance(id, amount);
        return ResponseEntity.ok().build();
    }

    private StudentDto hideFinancialFieldsForTeachers(StudentDto student, Authentication authentication) {
        if (authentication.getAuthorities().stream().noneMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"))) {
            student.setTotalPaid(0);
        }
        return student;
    }
}
