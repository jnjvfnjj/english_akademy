package com.school.crm.design.observer;

public class LessonStatusEvent extends SchoolEvent {

    private final Long lessonId;
    private final String oldStatus;
    private final String newStatus;

    public LessonStatusEvent(Object source, Long lessonId, String oldStatus, String newStatus, String details) {
        super(source, "LESSON_STATUS_CHANGED", details);
        this.lessonId = lessonId;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
    }

    public Long getLessonId() { return lessonId; }
    public String getOldStatus() { return oldStatus; }
    public String getNewStatus() { return newStatus; }
}
