package com.school.crm.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

@Configuration
public class DatabaseConfiguration {

    @Bean
    @Primary
    DataSource dataSource(Environment environment) {
        String url = environment.getRequiredProperty("spring.datasource.url");
        if (url.isBlank()) {
            throw new IllegalStateException(
                    "Database URL is empty. Set SPRING_DATASOURCE_URL to a JDBC URL.");
        }
        if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
            return postgresDataSource(url);
        }

        DataSourceBuilder<?> builder = DataSourceBuilder.create().url(url);
        String username = environment.getProperty("spring.datasource.username");
        String password = environment.getProperty("spring.datasource.password");
        String driver = environment.getProperty("spring.datasource.driver-class-name");
        if (driver == null) {
            driver = environment.getProperty("DATABASE_DRIVER");
        }
        if (username != null) {
            builder.username(username);
        }
        if (password != null) {
            builder.password(password);
        }
        if (driver != null) {
            builder.driverClassName(driver);
        }
        return builder.build();
    }

    private DataSource postgresDataSource(String url) {
        URI uri = URI.create(url);
        String rawUserInfo = uri.getRawUserInfo();
        int passwordSeparator = rawUserInfo == null ? -1 : rawUserInfo.indexOf(':');
        if (uri.getHost() == null || uri.getRawPath() == null || passwordSeparator < 1) {
            throw new IllegalArgumentException("PostgreSQL URL не содержит корректные реквизиты.");
        }

        String username = decodeUrlComponent(rawUserInfo.substring(0, passwordSeparator));
        String password = decodeUrlComponent(rawUserInfo.substring(passwordSeparator + 1));
        String port = uri.getPort() < 0 ? "" : ":" + uri.getPort();
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + query;

        return DataSourceBuilder.create()
                .driverClassName("org.postgresql.Driver")
                .url(jdbcUrl)
                .username(username)
                .password(password)
                .build();
    }

    private String decodeUrlComponent(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
