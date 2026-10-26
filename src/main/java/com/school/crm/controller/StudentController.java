package com.school.crm.controller;

import com.school.crm.model.dto.StudentDto;
import com.school.crm.service.StudentService;
import com.school.crm.repository.StaffAccountRepository;
import com.school.crm.repository.SchoolGroupRepository;
import com.school.crm.model.entity.StaffAccount;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*") // Allow React Native front-end to call endpoints smoothly
public class StudentController {

    private final StudentService studentService;
    private final StaffAccountRepository accountRepository;
    private final SchoolGroupRepository groupRepository;

    // Direct Constructor Injection - No @Autowired on fields (Mandatory guideline constraint 3.3)
    public StudentController(
            StudentService studentService,
            StaffAccountRepository accountRepository,
            SchoolGroupRepository groupRepository
    ) {
        this.studentService = studentService;
        this.accountRepository = accountRepository;
        this.groupRepository = groupRepository;
    }

    @GetMapping
    public ResponseEntity<List<StudentDto>> getAllStudents(Authentication authentication) {
        List<StudentDto> students = studentService.getAllStudents();
        if (!isAdmin(authentication)) {
            StaffAccount teacher = currentTeacher(authentication);
            var groupIds = groupRepository.findAllByTeacher_IdOrderByTitleAsc(teacher.getId()).stream()
                    .map(group -> group.getId()).collect(java.util.stream.Collectors.toSet());
            students = students.stream().filter(student ->
                    groupIds.contains(student.getGroupId())
                            || (student.getGroupIds() != null && student.getGroupIds().stream().anyMatch(groupIds::contains))
            ).toList();
        }
        return ResponseEntity.ok(students.stream().map(student -> applyPaymentVisibility(student, authentication)).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable Long id, Authentication authentication) {
        StudentDto student = studentService.getStudentById(id);
        ensureTeacherOwns(student, authentication);
        return ResponseEntity.ok(applyPaymentVisibility(student, authentication));
    }

    @PostMapping
    public ResponseEntity<StudentDto> createStudent(
            @Valid @RequestBody StudentDto studentDto,
            Authentication authentication
    ) {
        StudentDto created = studentService.createStudent(studentDto);
        return new ResponseEntity<>(applyPaymentVisibility(created, authentication), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentDto> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody StudentDto studentDto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(applyPaymentVisibility(studentService.updateStudent(id, studentDto), authentication));
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

    private StudentDto applyPaymentVisibility(StudentDto student, Authentication authentication) {
        if (!isAdmin(authentication) && !currentTeacher(authentication).canViewStudentPayments()) {
            student.setTotalPaid(0);
        }
        return student;
    }

    private void ensureTeacherOwns(StudentDto student, Authentication authentication) {
        if (isAdmin(authentication)) return;
        StaffAccount teacher = currentTeacher(authentication);
        boolean ownsGroup = student.getGroupId() != null
                && groupRepository.findAllByTeacher_IdOrderByTitleAsc(teacher.getId()).stream()
                .anyMatch(group -> group.getId().equals(student.getGroupId()));
        if (!ownsGroup) {
            ownsGroup = student.getGroupIds() != null && student.getGroupIds().stream().anyMatch(groupId ->
                    groupRepository.findAllByTeacher_IdOrderByTitleAsc(teacher.getId()).stream()
                            .anyMatch(group -> group.getId().equals(groupId))
            );
        }
        if (!ownsGroup) throw new AccessDeniedException("Нет доступа к данным этого студента.");
    }

    private StaffAccount currentTeacher(Authentication authentication) {
        return accountRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(account -> "TEACHER".equals(account.getRole()) && account.isEnabled())
                .orElseThrow(() -> new AccessDeniedException("Активный аккаунт преподавателя не найден."));
    }

    private static boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
