package com.school.crm.design.strategy;

public class PricingContext {

    private PricingStrategy pricingStrategy;

    public PricingContext(PricingStrategy pricingStrategy) {
        this.pricingStrategy = pricingStrategy;
    }

    public void setPricingStrategy(PricingStrategy pricingStrategy) {
        this.pricingStrategy = pricingStrategy;
    }

    public double executeStrategy(int hours) {
        if (hours <= 0) {
            throw new IllegalArgumentException("Hours must be strictly greater than zero");
        }
        return pricingStrategy.calculatePrice(hours);
    }

    public String executeGetDescription() {
        return pricingStrategy.getPolicyDescription();
    }
}
