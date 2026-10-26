package com.school.crm;

import com.school.crm.model.dto.AuthRequest;
import com.school.crm.model.entity.StaffAccount;
import com.school.crm.service.StaffAuthService;
import jakarta.validation.Validator;
import java.io.Console;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableScheduling
public class EnglishSchoolCrmApplication {
    private static final Logger log = LoggerFactory.getLogger(EnglishSchoolCrmApplication.class);

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(EnglishSchoolCrmApplication.class);
        if (Arrays.asList(args).contains("--create-admin")) {
            application.setWebApplicationType(WebApplicationType.NONE);
        }
        application.run(args);
    }

    @Bean
    ApplicationRunner bootstrapAdmin(StaffAuthService authService, Validator validator) {
        return args -> {
            if (args.containsOption("create-admin")) {
                return;
            }
            String email = System.getenv("ADMIN_EMAIL");
            String password = System.getenv("ADMIN_PASSWORD");
            if ((email == null || email.isBlank()) && (password == null || password.isBlank())) {
                log.warn("No initial super admin configured. Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters).");
                return;
            }
            if (email == null || email.isBlank() || password == null || password.length() < 12) {
                throw new IllegalArgumentException(
                        "Set both ADMIN_EMAIL and ADMIN_PASSWORD; the password must contain at least 12 characters."
                );
            }

            AuthRequest request = new AuthRequest(email.trim(), password, "Главный администратор");
            var violations = validator.validate(request);
            if (!violations.isEmpty()) {
                throw new IllegalArgumentException(violations.iterator().next().getMessage());
            }
            StaffAccount account = authService.provisionSuperAdmin(request);
            log.info("Initial super admin is ready: {}", account.getEmail());
        };
    }

    @Bean
    ApplicationRunner createAdminFromTerminal(
            StaffAuthService authService,
            Validator validator
    ) {
        return args -> {
            if (!args.containsOption("create-admin")) {
                return;
            }

            Console console = System.console();
            if (console == null) {
                throw new IllegalStateException(
                        "Для создания администратора запустите команду из интерактивного терминала."
                );
            }

            String email = console.readLine("Email главного администратора: ");
            String name = console.readLine("Имя главного администратора: ");
            char[] password = null;
            char[] confirmation = null;
            try {
                password = console.readPassword("Пароль (не менее 12 символов): ");
                confirmation = console.readPassword("Повторите пароль: ");
                if (password == null || confirmation == null) {
                    throw new IllegalStateException("Ввод пароля был прерван.");
                }
                if (!Arrays.equals(password, confirmation)) {
                    throw new IllegalArgumentException("Пароли не совпадают.");
                }

                AuthRequest request = new AuthRequest(email, new String(password), name);
                var violations = validator.validate(request);
                if (!violations.isEmpty()) {
                    throw new IllegalArgumentException(violations.iterator().next().getMessage());
                }

                StaffAccount account = authService.createInitialSuperAdmin(request);
                console.printf("Главный администратор %s успешно создан.%n", account.getEmail());
            } finally {
                if (password != null) {
                    Arrays.fill(password, '\0');
                }
                if (confirmation != null) {
                    Arrays.fill(confirmation, '\0');
                }
            }
        };
    }
}
