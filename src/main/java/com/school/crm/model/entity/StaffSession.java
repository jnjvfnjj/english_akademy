package com.school.crm.model.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "staff_sessions")
public class StaffSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "staff_account_id", nullable = false)
    private StaffAccount account;

    @Column(nullable = false)
    private Instant expiresAt;

    public StaffSession() {}

    public StaffSession(String tokenHash, StaffAccount account, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.account = account;
        this.expiresAt = expiresAt;
    }

    public String getTokenHash() { return tokenHash; }
    public StaffAccount getAccount() { return account; }
    public Instant getExpiresAt() { return expiresAt; }
}
