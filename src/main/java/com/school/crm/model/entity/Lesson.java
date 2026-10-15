package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "lessons")
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private LocalDate date;
    private String time; // e.g. "10:00"
    private String teacherName;
    private String topic;
    private double duration; // in hours, e.g. 1.0 or 1.5
    private String status; // Scheduled, Completed, Cancelled

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Lesson() {}

    public Lesson(Student student, LocalDate date, String time, String teacherName, String topic, double duration, String status, String notes) {
        this.student = student;
        this.date = date;
        this.time = time;
        this.teacherName = teacherName;
        this.topic = topic;
        this.duration = duration;
        this.status = status;
        this.notes = notes;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

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
