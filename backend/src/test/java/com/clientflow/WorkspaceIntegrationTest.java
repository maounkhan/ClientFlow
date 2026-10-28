package com.clientflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:clientflow-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "clientflow.storage=./target/test-documents"
    })
@AutoConfigureMockMvc
@Transactional
class WorkspaceIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired WorkspaceService s;
  @Autowired ObjectMapper json;

  Authentication auth(String email) {
    return UsernamePasswordAuthenticationToken.authenticated(email, "", List.of());
  }

  Map<String, Object> client() {
    return s.user(auth("client@northstar.demo"));
  }

  Map<String, Object> manager() {
    return s.user(auth("manager@clientflow.demo"));
  }

  Map<String, Object> engineer() {
    return s.user(auth("engineer@clientflow.demo"));
  }

  Map<String, Object> create() {
    return s.createTicket(
        client(),
        Map.of(
            "title",
            "Integration test request",
            "description",
            "Unable to connect to the production API.",
            "priority",
            "High",
            "category",
            "Integrations"));
  }

  @Test
  void unauthenticatedRequestsAreRejected() throws Exception {
    mvc.perform(get("/api/v1/workspace")).andExpect(status().isUnauthorized());
  }

  @Test
  void credentialsCreateSessionAndInvalidCredentialsFail() throws Exception {
    mvc.perform(
            post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"client@northstar.demo\",\"password\":\"wrong\"}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/v1/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"client@northstar.demo\",\"password\":\"DemoFlow!2026\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("CLIENT"));
  }

  @Test
  void csrfIsRequiredForWrites() throws Exception {
    mvc.perform(
            post("/api/v1/tickets")
                .with(user("client@northstar.demo"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void tenantCannotReadAnotherOrganizationsTicket() throws Exception {
    mvc.perform(get("/api/v1/tickets/CF-1047").with(user("client@northstar.demo")))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/workspace").with(user("client@northstar.demo")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.organizations.length()").value(1))
        .andExpect(jsonPath("$.users.length()").value(0));
  }

  @Test
  void clientCannotChooseAnotherOrganizationOnCreation() {
    var b =
        new HashMap<String, Object>(
            Map.of(
                "title",
                "Tenant safety",
                "description",
                "Tenant safety test",
                "priority",
                "Low",
                "category",
                "Other",
                "org_id",
                "org-meridian"));
    var t = s.createTicket(client(), b);
    assertEquals("org-northstar", t.get("org_id"));
  }

  @Test
  void completeTicketJourneyAndInternalNotesRemainPrivate() {
    var t = create();
    String id = t.get("id").toString();
    s.updateTicket(manager(), id, Map.of("assignee_id", "u-engineer"));
    s.updateTicket(engineer(), id, Map.of("status", "Triaged"));
    s.updateTicket(engineer(), id, Map.of("status", "In Progress"));
    s.comment(engineer(), id, Map.of("body", "Private diagnostic", "internal_note", true));
    s.comment(engineer(), id, Map.of("body", "Public progress update", "internal_note", false));
    var publicDetail = s.detail(client(), id);
    assertEquals(1, ((List<?>) publicDetail.get("comments")).size());
    assertEquals(2, ((List<?>) s.detail(engineer(), id).get("comments")).size());
    assertNotNull(publicDetail.get("first_response_at"));
    s.updateTicket(
        engineer(),
        id,
        Map.of("status", "Resolved", "resolution", "Connectivity restored and verified"));
    s.updateTicket(client(), id, Map.of("status", "Closed"));
    assertEquals("Closed", s.ticket(client(), id).get("status"));
    s.updateTicket(client(), id, Map.of("status", "Reopened"));
    assertNull(s.ticket(client(), id).get("resolved_at"));
  }

  @Test
  void invalidTransitionsAndMissingResolutionAreRejected() {
    String id = create().get("id").toString();
    assertThrows(
        ResponseStatusException.class,
        () -> s.updateTicket(engineer(), id, Map.of("status", "Closed")));
    s.updateTicket(engineer(), id, Map.of("status", "Triaged"));
    s.updateTicket(engineer(), id, Map.of("status", "In Progress"));
    assertThrows(
        ResponseStatusException.class,
        () -> s.updateTicket(engineer(), id, Map.of("status", "Resolved")));
    assertThrows(
        ResponseStatusException.class,
        () -> s.updateTicket(client(), id, Map.of("assignee_id", "u-engineer")));
  }

  @Test
  void slaDeadlineUsesPolicyAndEscalationIsIdempotent() {
    var t = create();
    String id = t.get("id").toString();
    long hours =
        java.time.Duration.between(
                java.time.Instant.parse(t.get("created_at").toString()),
                java.time.Instant.parse(t.get("due_at").toString()))
            .toHours();
    assertEquals(8, hours);
    s.database()
        .update(
            "UPDATE tickets SET due_at=? WHERE id=?",
            java.time.Instant.now().minusSeconds(5).toString(),
            id);
    s.sweep();
    s.sweep();
    assertEquals("Escalated", s.ticket(manager(), id).get("status"));
    assertEquals(
        1,
        s.database()
            .queryForObject(
                "SELECT COUNT(*) FROM ticket_events WHERE ticket_id=? AND action LIKE"
                    + " '%automatically escalated%'",
                Integer.class, id));
  }

  @Test
  void firstResponseBreachAlsoEscalates() {
    String id = create().get("id").toString();
    s.database()
        .update(
            "UPDATE tickets SET response_due_at=? WHERE id=?",
            java.time.Instant.now().minusSeconds(5).toString(),
            id);
    s.sweep();
    assertEquals("Escalated", s.ticket(manager(), id).get("status"));
  }

  @Test
  void onboardingRejectsIncompleteAndInvalidTransitions() {
    var row =
        s.onboardings(manager()).stream()
            .filter(o -> o.get("org_id").equals("org-arch"))
            .findFirst()
            .orElseThrow();
    assertThrows(
        ResponseStatusException.class,
        () -> s.onboarding(manager(), row.get("id").toString(), Map.of("status", "In Review")));
    assertThrows(
        ResponseStatusException.class,
        () -> s.onboarding(client(), "on-1", Map.of("status", "Approved")));
  }

  @Test
  void privateDocumentAccessAndInternalNotesAreEnforcedOverHttp() throws Exception {
    var file =
        new MockMultipartFile("file", "security.txt", "text/plain", "private test".getBytes());
    var response =
        mvc.perform(
                multipart("/api/v1/documents")
                    .file(file)
                    .param("org_id", "org-meridian")
                    .with(user("manager@clientflow.demo"))
                    .with(csrf()))
            .andExpect(status().isCreated())
            .andReturn();
    String id = json.readTree(response.getResponse().getContentAsString()).get("id").asText();
    mvc.perform(get("/api/v1/documents/" + id + "/download").with(user("client@northstar.demo")))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/v1/documents/" + id + "/download").with(user("client@meridian.demo")))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "application/octet-stream"));
    mvc.perform(
            post("/api/v1/tickets/CF-1048/comments")
                .with(user("client@northstar.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Secret note\",\"internal_note\":true}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void staffPermissionsAreEnforced() throws Exception {
    mvc.perform(
            put("/api/v1/sla-policies/High")
                .with(user("engineer@clientflow.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"response_minutes\":60,\"resolution_hours\":8}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            patch("/api/v1/users/u-engineer")
                .with(user("manager@clientflow.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"ADMIN\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void analyticsOnlyCountsCompletedTicketsAsResolved() {
    var before = s.analytics(client());
    var t = create();
    var after = s.analytics(client());
    assertEquals(
        ((Number) before.get("open")).longValue() + 1, ((Number) after.get("open")).longValue());
    assertEquals(before.get("resolved"), after.get("resolved"));
  }

  @Test
  void organizationValidationAndCompleteOnboardingJourney() {
    assertThrows(
        ResponseStatusException.class,
        () ->
            s.createOrg(
                manager(),
                Map.of(
                    "name",
                    "Invalid contact",
                    "industry",
                    "Technology",
                    "plan",
                    "Growth",
                    "contact",
                    "bad")));
    var org =
        s.createOrg(
            manager(),
            Map.of(
                "name",
                "Integration test partner",
                "industry",
                "Technology",
                "plan",
                "Growth",
                "contact",
                "owner@example.demo"));
    var on =
        s.onboardings(manager()).stream()
            .filter(o -> o.get("org_id").equals(org.get("id")))
            .findFirst()
            .orElseThrow();
    String id = on.get("id").toString();
    for (var task : (List<Map<String, Object>>) on.get("tasks"))
      s.onboarding(manager(), id, Map.of("task_id", task.get("id"), "completed", true));
    s.onboarding(manager(), id, Map.of("status", "In Review"));
    assertThrows(
        ResponseStatusException.class,
        () -> s.onboarding(manager(), id, Map.of("status", "Information Requested")));
    s.onboarding(
        manager(),
        id,
        Map.of("status", "Information Requested", "note", "Please verify the security contact."));
    s.onboarding(manager(), id, Map.of("status", "In Review"));
    s.onboarding(manager(), id, Map.of("status", "Approved"));
    s.onboarding(manager(), id, Map.of("status", "Active"));
    assertEquals(
        "Active",
        s.one("SELECT status FROM organizations WHERE id=?", org.get("id")).get("status"));
  }

  @Test
  void preferencesAndNotificationOwnership() throws Exception {
    mvc.perform(
            put("/api/v1/preferences")
                .with(user("client@northstar.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"show_ticket_updates\":false,\"show_sla_alerts\":true,\"show_onboarding\":true}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/v1/preferences").with(user("client@northstar.demo")))
        .andExpect(jsonPath("$.show_ticket_updates").value(false));
    mvc.perform(
            patch("/api/v1/notifications/n-u-manager/read")
                .with(user("client@northstar.demo"))
                .with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void invalidJsonAndPaginationReturnClientErrors() throws Exception {
    mvc.perform(
            post("/api/v1/tickets")
                .with(user("client@northstar.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{"))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/tickets?page=-1").with(user("client@northstar.demo")))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/v1/tickets?size=1&q=SSO").with(user("client@northstar.demo")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void clientsCannotPublishArticlesOrUploadToOtherTenants() throws Exception {
    mvc.perform(
            post("/api/v1/articles")
                .with(user("client@northstar.demo"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            multipart("/api/v1/documents")
                .file(new MockMultipartFile("file", "secret.txt", "text/plain", "test".getBytes()))
                .param("org_id", "org-meridian")
                .with(user("client@northstar.demo"))
                .with(csrf()))
        .andExpect(status().isNotFound());
  }
}
