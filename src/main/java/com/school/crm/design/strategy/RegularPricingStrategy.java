package com.school.crm.design.strategy;

public class RegularPricingStrategy implements PricingStrategy {

    private static final double RATE_PER_HOUR = 25.0;

    @Override
    public double calculatePrice(int hours) {
        return hours * RATE_PER_HOUR;
    }

    @Override
    public String getPolicyDescription() {
        return "Regular hourly lessons rate ($25.0/hour)";
    }
}
