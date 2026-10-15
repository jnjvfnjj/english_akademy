package com.school.crm.design.builder;

import java.time.LocalDateTime;

public class Receipt {

    private final String receiptNumber;
    private final String studentName;
    private final String studentEmail;
    private final double amount;
    private final int hoursPurchased;
    private final String pricingPolicy;
    private final LocalDateTime issuedAt;
    private final String footerMessage;

    private Receipt(ReceiptBuilder builder) {
        this.receiptNumber = builder.receiptNumber;
        this.studentName = builder.studentName;
        this.studentEmail = builder.studentEmail;
        this.amount = builder.amount;
        this.hoursPurchased = builder.hoursPurchased;
        this.pricingPolicy = builder.pricingPolicy;
        this.issuedAt = builder.issuedAt;
        this.footerMessage = builder.footerMessage;
    }

    public String getReceiptNumber() { return receiptNumber; }
    public String getStudentName() { return studentName; }
    public String getStudentEmail() { return studentEmail; }
    public double getAmount() { return amount; }
    public int getHoursPurchased() { return hoursPurchased; }
    public String getPricingPolicy() { return pricingPolicy; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public String getFooterMessage() { return footerMessage; }

    public String generatePrintableText() {
        return "==========================================\n" +
               "           ENGLISH SCHOOL Receipt        \n" +
               "==========================================\n" +
               "Receipt #: " + receiptNumber + "\n" +
               "Date/Time: " + issuedAt + "\n" +
               "------------------------------------------\n" +
               "Student: " + studentName + " (" + studentEmail + ")\n" +
               "Hours Refilled: " + hoursPurchased + " hrs\n" +
               "Pricing Model: " + pricingPolicy + "\n" +
               "Total Paid: $" + String.format("%.2f", amount) + "\n" +
               "------------------------------------------\n" +
               "Status: PAID IN FULL\n" +
               footerMessage + "\n" +
               "==========================================";
    }

    public static class ReceiptBuilder {
        private String receiptNumber;
        private String studentName;
        private String studentEmail;
        private double amount;
        private int hoursPurchased;
        private String pricingPolicy;
        private LocalDateTime issuedAt = LocalDateTime.now();
        private String footerMessage = "Thank you for studying with English School CRM!";

        public ReceiptBuilder(String receiptNumber, String studentName) {
            this.receiptNumber = receiptNumber;
            this.studentName = studentName;
        }

        public ReceiptBuilder studentEmail(String studentEmail) {
            this.studentEmail = studentEmail;
            return this;
        }

        public ReceiptBuilder amount(double amount) {
            this.amount = amount;
            return this;
        }

        public ReceiptBuilder hoursPurchased(int hoursPurchased) {
            this.hoursPurchased = hoursPurchased;
            return this;
        }

        public ReceiptBuilder pricingPolicy(String pricingPolicy) {
            this.pricingPolicy = pricingPolicy;
            return this;
        }

        public ReceiptBuilder issuedAt(LocalDateTime issuedAt) {
            this.issuedAt = issuedAt;
            return this;
        }

        public ReceiptBuilder footerMessage(String footerMessage) {
            this.footerMessage = footerMessage;
            return this;
        }

        public Receipt build() {
            if (receiptNumber == null || receiptNumber.isBlank()) {
                throw new IllegalStateException("Receipt number is required for builder");
            }
            if (studentName == null || studentName.isBlank()) {
                throw new IllegalStateException("Student name is required for builder");
            }
            return new Receipt(this);
        }
    }
}
