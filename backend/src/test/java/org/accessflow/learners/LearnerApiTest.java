package org.accessflow.learners;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.accessflow.security.AuthorizationMatrixTest;
import org.accessflow.testsupport.IntegrationTest;
import org.accessflow.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

/** Track 1 data contract: POST/PATCH/PUT support/GET export/DELETE on /api/v1/learners. */
class LearnerApiTest extends IntegrationTest {

    private record Created(String id, MockHttpSession session) {}

    private Created create() throws Exception {
        MockHttpSession s = new MockHttpSession();
        MvcResult r = mvc.perform(jsonPost("/api/v1/learners", Map.of("displayName", "Contract Learner", "email", uniqueEmail(),
                        "password", PASSWORD, "locale", "am", "acceptPrivacyNotice", true), s))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/v1/learners/")))
                .andReturn();
        return new Created(read(r).at("/user/id").asText(), (MockHttpSession) r.getRequest().getSession());
    }

    @Test
    void fullLifecycleCreatePatchSupportExportDelete() throws Exception {
        Created l = create();
        mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), l.session())).andExpect(status().isCreated());

        // PATCH changes only the fields sent
        mvc.perform(patch("/api/v1/learners/" + l.id()).session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("city", "Hawassa", "headline", "Data entry"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Hawassa"))
                .andExpect(jsonPath("$.givenName").value("Almaz"))
                .andExpect(jsonPath("$.skills.length()").value(3));
        // invalid values are rejected with field errors
        mvc.perform(patch("/api/v1/learners/" + l.id()).session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("region", "ATLANTIS"))))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.fieldErrors[0].field").value("region"));

        // PUT support: private preferences + optional private request
        mvc.perform(put("/api/v1/learners/" + l.id() + "/support").session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("workplaceSupport", List.of("REMOTE_WORK"),
                                "request", Map.of("category", "TECHNOLOGY", "message", "Help with my screen reader.", "contact", "IN_APP")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workplaceSupport[0]").value("REMOTE_WORK"))
                .andExpect(jsonPath("$.supportRequestId").isString());

        // Export contains the data, including private support (it is the learner's own data)
        mvc.perform(get("/api/v1/learners/" + l.id() + "/export").session(l.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.profile.city").value("Hawassa"))
                .andExpect(jsonPath("$.profile.supportPreferences[0]").value("REMOTE_WORK"));

        // DELETE requires the password
        mvc.perform(delete("/api/v1/learners/" + l.id()).session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("password", "wrong")))).andExpect(status().isUnprocessableEntity());
        mvc.perform(delete("/api/v1/learners/" + l.id()).session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("password", PASSWORD)))).andExpect(status().isNoContent());
        assertThat(users.findById(java.util.UUID.fromString(l.id()))).isEmpty();
    }

    @Test
    void learnersCannotAddressAnotherLearner() throws Exception {
        Created alice = create();
        Created mallory = create();
        mvc.perform(get("/api/v1/learners/" + alice.id() + "/export").session(mallory.session())).andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/learners/" + alice.id()).session(mallory.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("city", "X")))).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/learners/" + alice.id() + "/support").session(mallory.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("workplaceSupport", List.of())))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/learners/" + alice.id()).session(mallory.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("password", PASSWORD)))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/learners/" + alice.id() + "/export")).andExpect(status().isUnauthorized());
    }

    @Test
    void privateSupportSetThroughTheContractIsNeverVisibleToEmployers() throws Exception {
        Created l = create();
        mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), l.session())).andExpect(status().isCreated());
        mvc.perform(put("/api/v1/learners/" + l.id() + "/support").session(l.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("workplaceSupport", List.of("QUIET_SPACE"))))).andExpect(status().isOk());
        mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications", AuthorizationMatrixTest.applicationAnswers(), l.session()))
                .andExpect(status().isCreated());
        MockHttpSession employer = createAndLogin(Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        String visible = mvc.perform(get("/api/v1/employer/jobs/" + JOB_SUPPORT_AGENT + "/applications").session(employer))
                .andReturn().getResponse().getContentAsString();
        assertThat(visible).doesNotContain("QUIET_SPACE").doesNotContain("supportPreferences");
    }

    @Test
    void keylessEmbedResolvesTheRegisteredHostOrigin() throws Exception {
        mvc.perform(get("/api/v1/embed/config").param("origin", "http://localhost:5510"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.publishableKey").value("pk_savanna_local_demo"));
        mvc.perform(get("/api/v1/embed/config").param("origin", "https://evil.example")).andExpect(status().isForbidden());
        mvc.perform(get("/embed/signup").param("origin", "http://localhost:5520"))
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.endsWith("frame-ancestors http://localhost:5520")));
        mvc.perform(get("/embed/signup").param("origin", "https://evil.example"))
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.containsString("frame-ancestors 'none'")));
    }
}
