package com.school.crm.design.strategy;

public class PackagePricingStrategy implements PricingStrategy {

    private static final double DISCOUNTED_RATE_PER_HOUR = 22.50; // Discounted from $25

    @Override
    public double calculatePrice(int hours) {
        return hours * DISCOUNTED_RATE_PER_HOUR;
    }

    @Override
    public String getPolicyDescription() {
        return "Bulk Package Tier - 10% Discount applied ($22.5/hour)";
    }
}
