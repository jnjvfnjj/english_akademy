package com.school.crm.repository;

import com.school.crm.model.entity.StaffAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaffAccountRepository extends JpaRepository<StaffAccount, Long> {
    Optional<StaffAccount> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
