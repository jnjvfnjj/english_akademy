package com.school.crm.design.observer;

public class StudentBalanceEvent extends SchoolEvent {

    private final Long studentId;
    private final int oldBalance;
    private final int newBalance;

    public StudentBalanceEvent(Object source, Long studentId, int oldBalance, int newBalance, String details) {
        super(source, "STUDENT_BALANCE_CHANGED", details);
        this.studentId = studentId;
        this.oldBalance = oldBalance;
        this.newBalance = newBalance;
    }

    public Long getStudentId() { return studentId; }
    public int getOldBalance() { return oldBalance; }
    public int getNewBalance() { return newBalance; }
}
