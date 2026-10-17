package com.school.crm.integration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:staff-integration;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driverClassName=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "app.admin-registration-code=integration-test-admin-code-123456"
})
class TeacherLoginProfileIntegrationTest extends StaffIntegrationTestSupport {

    @Test
    void teacherCanRegisterLogInAndOpenOnlyTeacherFeatures() throws Exception {
        String email = "teacher-" + System.nanoTime() + "@school.test";
        String password = "TeacherPass123!";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "email", email,
                                "password", password,
                                "name", "Profile Teacher"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("Teacher"))
                .andExpect(jsonPath("$.superAdmin").value(false));

        String token = login(email, password);
        mockMvc.perform(get("/api/teachers/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Profile Teacher"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("Teacher"));

        mockMvc.perform(get("/api/admin/teachers").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        MvcResult badLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("email", email, "password", "WrongPass123!"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        org.junit.jupiter.api.Assertions.assertEquals(
                "Неверный email или пароль.",
                objectMapper.readTree(badLogin.getResponse().getContentAsByteArray()).path("message").asText()
        );
    }
}
