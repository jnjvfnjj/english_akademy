package com.school.crm.model.dto;

import jakarta.validation.constraints.*;

public class StudentDto {

    private Long id;

    @NotBlank(message = "Student name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Pattern(regexp = "^(\\+?[0-9\\s]{10,15})?$", message = "Invalid phone number format")
    private String phone;

    private String level;

    @Min(value = 0, message = "Initial package balance cannot be negative")
    private int balance;

    private int totalClasses;
    private double totalPaid;

    @NotBlank(message = "Age group is required (Kids, Teens, Adults)")
    private String ageGroup;

    @NotBlank(message = "Status is required (Active, On Hold, Completed)")
    private String status;

    private String notes;

    public StudentDto() {}

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

    public String getAgeGroup() { return ageGroup; }
    public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
