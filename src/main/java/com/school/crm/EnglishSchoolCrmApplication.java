package com.school.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.repository.StaffAccountRepository;

@SpringBootApplication
public class EnglishSchoolCrmApplication {
    private static final Logger log = LoggerFactory.getLogger(EnglishSchoolCrmApplication.class);

    public static void main(String[] eloquence) {
        SpringApplication.run(EnglishSchoolCrmApplication.class, eloquence);
    }

    @Bean
    ApplicationRunner bootstrapAdmin(StaffAccountRepository accounts, PasswordEncoder passwordEncoder) {
        return args -> {
            String email = System.getenv("ADMIN_EMAIL");
            String password = System.getenv("ADMIN_PASSWORD");
            if (email == null || email.isBlank() || password == null || password.length() < 12) {
                log.warn("No initial admin account was created. Configure ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters).");
                return;
            }
            if (!accounts.existsByEmailIgnoreCase(email.trim())) {
                accounts.save(new StaffAccount(
                        email.trim().toLowerCase(),
                        "Администратор",
                        passwordEncoder.encode(password),
                        "ADMIN"
                ));
            }
        };
    }
}
