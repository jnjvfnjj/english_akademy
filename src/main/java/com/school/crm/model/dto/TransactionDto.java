package com.school.crm.model.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class TransactionDto {

    private Long id;

    private Long studentId; // optional (e.g. expenses don't have associated student)
    private String studentName;

    @Positive(message = "Transaction amount must be strictly positive")
    private double amount;

    @NotBlank(message = "Transaction type is required (Income, Expense)")
    private String type;

    @NotBlank(message = "Transaction category is required (Tuition, Salary, Materials, Rent, Other)")
    private String category;

    @NotNull(message = "Transaction date is required")
    private LocalDate date;

    @NotBlank(message = "Description is required")
    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;

    // Optional for specifying custom pricing package calculations inside service
    private String pricingTier; // e.g., REGULAR, STANDARD_PACKAGE, VIP_GOLD

    public TransactionDto() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPricingTier() { return pricingTier; }
    public void setPricingTier(String pricingTier) { this.pricingTier = pricingTier; }
}
