package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "student_deletion_notices")
public class StudentDeletionNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long deletedStudentId;

    @Column(nullable = false)
    private String studentName;

    @Column(nullable = false)
    private String studentEmail;

    @Column(nullable = false)
    private String deletedBy;

    @Column(nullable = false)
    private Instant deletedAt;

    public StudentDeletionNotice() {}

    public StudentDeletionNotice(Long deletedStudentId, String studentName, String studentEmail, String deletedBy) {
        this.deletedStudentId = deletedStudentId;
        this.studentName = studentName;
        this.studentEmail = studentEmail;
        this.deletedBy = deletedBy;
        this.deletedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getDeletedStudentId() { return deletedStudentId; }
    public String getStudentName() { return studentName; }
    public String getStudentEmail() { return studentEmail; }
    public String getDeletedBy() { return deletedBy; }
    public Instant getDeletedAt() { return deletedAt; }
}
