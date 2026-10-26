package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    private String phone;
    private String level;
    private int balance; // Class hours left
    private int totalClasses; // Total hours booked or completed
    private double totalPaid; // Total money paid
    private String educationFormat;
    @Column(columnDefinition = "TEXT")
    private String courses;
    private java.time.LocalDate paymentExpiresAt;
    private java.time.LocalDate paymentDate;
    private double paymentAmount;
    private String paymentCurrency;
    private String ageGroup; // Kids, Teens, Adults
    private String status; // Active, On Hold, Completed

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private SchoolGroup group;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Lesson> lessons = new ArrayList<>();

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Transaction> transactions = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "student_group_enrollments",
            joinColumns = @JoinColumn(name = "student_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id")
    )
    private List<SchoolGroup> enrolledGroups = new ArrayList<>();

    public Student() {}

    public Student(String name, String email, String phone, String level, int balance, String ageGroup, String status, String notes) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.level = level;
        this.balance = balance;
        this.ageGroup = ageGroup;
        this.status = status;
        this.notes = notes;
        this.totalClasses = balance; // Inital total matches initial package balance
        this.totalPaid = balance * 25.0; // standard $25/hr pricing
    }

    // Encapsulation: Custom business method for state mutation
    public void deductBalance(int hours) {
        if (this.balance < hours) {
            throw new IllegalStateException("Insufficient class hours balance! Current balance: " + this.balance);
        }
        this.balance -= hours;
    }

    public void addBalance(int hours) {
        if (hours < 0) {
            throw new IllegalArgumentException("Add hours amount must be positive");
        }
        this.balance += hours;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }

    public int getTotalClasses() { return totalClasses; }
    public void setTotalClasses(int totalClasses) { this.totalClasses = totalClasses; }

    public double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(double totalPaid) { this.totalPaid = totalPaid; }
    public String getEducationFormat() { return educationFormat; }
    public void setEducationFormat(String educationFormat) { this.educationFormat = educationFormat; }
    public String getCourses() { return courses; }
    public void setCourses(String courses) { this.courses = courses; }
    public java.time.LocalDate getPaymentExpiresAt() { return paymentExpiresAt; }
    public void setPaymentExpiresAt(java.time.LocalDate paymentExpiresAt) { this.paymentExpiresAt = paymentExpiresAt; }
    public java.time.LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(java.time.LocalDate paymentDate) { this.paymentDate = paymentDate; }
    public double getPaymentAmount() { return paymentAmount; }
    public void setPaymentAmount(double paymentAmount) { this.paymentAmount = paymentAmount; }
    public String getPaymentCurrency() { return paymentCurrency; }
    public void setPaymentCurrency(String paymentCurrency) { this.paymentCurrency = paymentCurrency; }

    public String getAgeGroup() { return ageGroup; }
    public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public SchoolGroup getGroup() { return group; }
    public void setGroup(SchoolGroup group) { this.group = group; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<Lesson> getLessons() { return lessons; }
    public void setLessons(List<Lesson> lessons) { this.lessons = lessons; }

    public List<Transaction> getTransactions() { return transactions; }
    public void setTransactions(List<Transaction> transactions) { this.transactions = transactions; }
    public List<SchoolGroup> getEnrolledGroups() { return enrolledGroups; }
    public void setEnrolledGroups(List<SchoolGroup> enrolledGroups) { this.enrolledGroups = enrolledGroups; }
}
