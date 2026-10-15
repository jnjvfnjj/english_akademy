package com.school.crm.design.observer;

import org.springframework.context.ApplicationEvent;

public abstract class SchoolEvent extends ApplicationEvent {

    private final String eventType;
    private final String details;

    public SchoolEvent(Object source, String eventType, String details) {
        super(source);
        this.eventType = eventType;
        this.details = details;
    }

    public String getEventType() {
        return eventType;
    }

    public String getDetails() {
        return details;
    }
}
