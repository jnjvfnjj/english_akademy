package com.school.crm.controller;

import com.school.crm.model.dto.LessonDto;
import com.school.crm.service.LessonService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/lessons")
@CrossOrigin(origins = "*")
public class LessonController {

    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping
    public ResponseEntity<List<LessonDto>> getAllLessons(Authentication authentication) {
        return ResponseEntity.ok(lessonService.getAllLessons(authentication));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<LessonDto>> getLessonsByStudent(
            @PathVariable Long studentId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(lessonService.getLessonsByStudent(studentId, authentication));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LessonDto> getLessonById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(lessonService.getLessonById(id, authentication));
    }

    @PostMapping
    public ResponseEntity<LessonDto> createLesson(
            @Valid @RequestBody LessonDto lessonDto,
            Authentication authentication
    ) {
        LessonDto created = lessonService.createLesson(lessonDto, authentication);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LessonDto> updateLesson(
            @PathVariable Long id,
            @Valid @RequestBody LessonDto lessonDto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(lessonService.updateLesson(id, lessonDto, authentication));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id, Authentication authentication) {
        lessonService.deleteLesson(id, authentication);
        return ResponseEntity.noContent().build();
    }

    // Custom non-trivial status transition action
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateLessonStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String notes,
            Authentication authentication) {
        lessonService.updateLessonStatus(id, status, notes, authentication);
        return ResponseEntity.ok().build();
    }
}
