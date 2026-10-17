package com.school.crm.repository;

import com.school.crm.model.entity.StaffSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;

public interface StaffSessionRepository extends JpaRepository<StaffSession, Long> {
    Optional<StaffSession> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
    void deleteByTokenHash(String tokenHash);
}
