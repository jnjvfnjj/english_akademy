package com.school.crm.repository;

import com.school.crm.model.entity.StaffAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaffAccountRepository extends JpaRepository<StaffAccount, Long> {
    Optional<StaffAccount> findByEmailIgnoreCase(String email);
    Optional<StaffAccount> findFirstByRole(String role);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByRole(String role);
}
