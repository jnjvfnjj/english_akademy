package com.school.crm.model.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class LessonDto {

    private Long id;

    @NotNull(message = "Student ID selection is required")
    private Long studentId;

    private String studentName; // Readable student name from the DB

    @NotNull(message = "Lesson date is required")
    private LocalDate date;

    @NotBlank(message = "Lesson time is required")
    private String time; // e.g. "14:30"

    @NotBlank(message = "Teacher name is required")
    private String teacherName;

    @NotBlank(message = "Lesson topic is required")
    private String topic;

    @DecimalMin(value = "0.5", message = "Lesson minimum duration is 0.5 hours")
    @DecimalMax(value = "4.0", message = "Lesson maximum duration is 4 hours")
    private double duration;

    @NotBlank(message = "Lesson status is required (Scheduled, Completed, Cancelled)")
    private String status;

    private String notes;

    public LessonDto() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public double getDuration() { return duration; }
    public void setDuration(double duration) { this.duration = duration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
