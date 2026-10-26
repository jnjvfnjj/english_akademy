package com.school.crm.integration;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
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
class TeacherGroupDataIntegrationTest extends StaffIntegrationTestSupport {

    @Test
    void groupRequiresAnExistingActiveTeacherAccount() throws Exception {
        String adminToken = createAdminAndLogin("admin-" + System.nanoTime() + "@school.test");
        mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "Unassigned group",
                                "level", "B1",
                                "description", "No arbitrary teacher names",
                                "teacherId", 999999,
                                "studentIds", new long[0]
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void teacherSeesOnlyAssignedGroupsLessonsAndPermittedPaymentSummary() throws Exception {
        String adminToken = createAdminAndLogin("admin-" + System.nanoTime() + "@school.test");
        String teacherEmail = "own-" + System.nanoTime() + "@school.test";
        long teacherId = createTeacher(adminToken, teacherEmail, "Own Teacher");
        long otherTeacherId = createTeacher(adminToken, "other-" + System.nanoTime() + "@school.test", "Other Teacher");

        long studentId = createStudent(adminToken, "student-" + System.nanoTime() + "@school.test", "Own Student");
        long otherStudentId = createStudent(adminToken, "other-student-" + System.nanoTime() + "@school.test", "Other Student");
        long groupId = createGroup(adminToken, teacherId, studentId, "Own group");
        long otherGroupId = createGroup(adminToken, otherTeacherId, otherStudentId, "Other group");
        mockMvc.perform(post("/api/lessons")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "groupId", otherGroupId,
                                "date", "2026-11-02",
                                "time", "11:00",
                                "teacherName", "Incorrect free text",
                                "topic", "Private lesson",
                                "duration", 1,
                                "status", "Scheduled"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teacherName").value("Other Teacher"));

        String teacherToken = login(teacherEmail, "TeacherPass123!");

        mockMvc.perform(get("/api/groups").header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Own group"));
        mockMvc.perform(get("/api/students").header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Own Student"))
                .andExpect(jsonPath("$[0].totalPaid").value(0));
        mockMvc.perform(get("/api/students/{id}", otherStudentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/lessons")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "groupId", groupId,
                                "date", "2026-11-01",
                                "time", "10:00",
                                "teacherName", "Own Teacher",
                                "topic", "Grammar",
                                "duration", 1,
                                "status", "Scheduled"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.groupName").value("Own group"));
        mockMvc.perform(get("/api/lessons").header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].groupName").value("Own group"));

        mockMvc.perform(patch("/api/admin/teachers/{id}/payment-visibility", teacherId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canViewStudentPayments").value(true));
        mockMvc.perform(get("/api/students/{id}", studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPaid").value(250));
    }

    private long createTeacher(String adminToken, String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/teachers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "email", email,
                                "password", "TeacherPass123!",
                                "name", name
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).path("id").asLong();
    }

    private long createStudent(String adminToken, String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "name", name,
                                "email", email,
                                "phone", "+79998881111",
                                "level", "B1",
                                "balance", 10,
                                "ageGroup", "Adults",
                                "status", "Active"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).path("id").asLong();
    }

    private long createGroup(String adminToken, long teacherId, long studentId, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", title,
                                "level", "B1",
                                "description", "Test group",
                                "teacherId", teacherId,
                                "studentIds", new long[] { studentId }
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).path("id").asLong();
    }

}
