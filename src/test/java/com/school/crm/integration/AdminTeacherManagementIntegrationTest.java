package com.school.crm.integration;

import com.school.crm.model.dto.TeacherCreateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class AdminTeacherManagementIntegrationTest extends StaffIntegrationTestSupport {

    @Test
    void adminCanListDisableAndRestoreTeacherAccounts() throws Exception {
        String adminEmail = "admin-" + System.nanoTime() + "@school.test";
        String adminToken = createAdminAndLogin(adminEmail);
        String teacherEmail = "teacher-" + System.nanoTime() + "@school.test";
        String teacherPassword = "TeacherPass123!";

        mockMvc.perform(post("/api/admin/teachers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "email", teacherEmail,
                                "password", teacherPassword,
                                "name", "Manageable Teacher"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.canViewStudentPayments").value(false));
        String teacherToken = login(teacherEmail, teacherPassword);

        MvcResult listResult = mockMvc.perform(get("/api/admin/teachers")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(teacherEmail))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].canViewStudentPayments").value(false))
                .andReturn();
        long teacherId = objectMapper.readTree(listResult.getResponse().getContentAsByteArray())
                .get(0).get("id").asLong();

        mockMvc.perform(patch("/api/admin/teachers/{id}/status", teacherId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/teachers/me").header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("email", teacherEmail, "password", teacherPassword))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/admin/teachers/{id}/status", teacherId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
        login(teacherEmail, teacherPassword);
    }

    @Test
    void teacherCannotAccessManagementEndpoints() throws Exception {
        String teacherEmail = "teacher-" + System.nanoTime() + "@school.test";
        authService.createTeacher(new TeacherCreateRequest(teacherEmail, "Regular Teacher", "TeacherPass123!"));
        String token = login(teacherEmail, "TeacherPass123!");

        mockMvc.perform(get("/api/admin/teachers").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/teachers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "email", "unauthorized-" + System.nanoTime() + "@school.test",
                                "name", "Unauthorized Create",
                                "password", "TeacherPass123!"
                        ))))
                .andExpect(status().isForbidden());
    }
}
