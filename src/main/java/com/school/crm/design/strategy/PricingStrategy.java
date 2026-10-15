package com.school.crm.design.strategy;

public interface PricingStrategy {
    double calculatePrice(int hours);
    String getPolicyDescription();
}
