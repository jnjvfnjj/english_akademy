package com.school.crm.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.crm.model.dto.AuthRequest;
import com.school.crm.service.StaffAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

abstract class StaffIntegrationTestSupport {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    StaffAuthService authService;

    String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("email", email, "password", password))))
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        return response.path("token").asText();
    }

    String createAdminAndLogin(String email) throws Exception {
        authService.createInitialSuperAdmin(
                new AuthRequest(email, "StrongAdminPass123!", "Integration Admin")
        );
        return login(email, "StrongAdminPass123!");
    }
}
