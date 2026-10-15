package com.school.crm.design.observer;

import com.school.crm.model.entity.AuditLog;
import com.school.crm.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SchoolEventListener {

    private static final Logger log = LoggerFactory.getLogger(SchoolEventListener.class);
    private final AuditLogRepository auditLogRepository;

    public SchoolEventListener(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // Polymorphic event handling: handles any subclass of SchoolEvent
    @EventListener
    public void handleSchoolEvent(SchoolEvent event) {
        log.info("[Observer Notification] Event Received: {} - {}", event.getEventType(), event.getDetails());
        
        AuditLog auditLog = new AuditLog(event.getEventType(), event.getDetails());
        auditLogRepository.save(auditLog);
        
        // Custom scenario: low balance alert (if balance drops below 3 hours)
        if (event instanceof StudentBalanceEvent) {
            StudentBalanceEvent balanceEvent = (StudentBalanceEvent) event;
            if (balanceEvent.getNewBalance() <= 3 && balanceEvent.getNewBalance() < balanceEvent.getOldBalance()) {
                String warningDetails = "Student ID " + balanceEvent.getStudentId() + 
                                       " balance is low (" + balanceEvent.getNewBalance() + " hours left). Suggest top-up.";
                log.warn("[WARNING] {}", warningDetails);
                AuditLog warningLog = new AuditLog("BALANCE_WARNING", warningDetails);
                auditLogRepository.save(warningLog);
            }
        }
    }
}
