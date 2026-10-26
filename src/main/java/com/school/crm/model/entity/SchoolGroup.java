package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "school_groups")
public class SchoolGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String level;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private StaffAccount teacher;

    @OneToMany(mappedBy = "group")
    private List<Student> students = new ArrayList<>();

    @ManyToMany(mappedBy = "enrolledGroups")
    private List<Student> enrolledStudents = new ArrayList<>();

    public SchoolGroup() {}

    public SchoolGroup(String title, String level, String description, StaffAccount teacher) {
        this.title = title;
        this.level = level;
        this.description = description;
        this.teacher = teacher;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getLevel() { return level; }
    public String getDescription() { return description; }
    public StaffAccount getTeacher() { return teacher; }
    public List<Student> getStudents() { return students; }
    public List<Student> getEnrolledStudents() { return enrolledStudents; }
    public void setTeacher(StaffAccount teacher) { this.teacher = teacher; }
}
