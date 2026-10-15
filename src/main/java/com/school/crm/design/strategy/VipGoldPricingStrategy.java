package com.school.crm.design.strategy;

public class VipGoldPricingStrategy implements PricingStrategy {

    private static final double VIP_RATE_PER_HOUR = 20.0; // 20% off standard $25

    @Override
    public double calculatePrice(int hours) {
        return hours * VIP_RATE_PER_HOUR;
    }

    @Override
    public String getPolicyDescription() {
        return "VIP Gold Tier - Premium 20% Discount applied ($20.0/hour)";
    }
}
