package org.accessflow.security;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.testsupport.IntegrationTest;
import org.accessflow.user.Role;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

/** Role × endpoint and owner × non-owner checks (IDOR). */
public class AuthorizationMatrixTest extends IntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/profile", "/api/v1/preferences", "/api/v1/applications", "/api/v1/drafts",
            "/api/v1/support-requests", "/api/v1/identity", "/api/v1/notifications", "/api/v1/consents",
            "/api/v1/saved-jobs", "/api/v1/account/export", "/api/v1/employer/jobs", "/api/v1/staff/verifications"})
    void privateEndpointsRequireSignIn(String url) throws Exception {
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/employer/jobs", "/api/v1/staff/verifications", "/api/v1/staff/support-requests"})
    void applicantsCannotUseEmployerOrStaffAreas(String url) throws Exception {
        MockHttpSession applicant = registerApplicant(uniqueEmail());
        mvc.perform(get(url).session(applicant)).andExpect(status().isForbidden());
    }

    @Test
    void employersCannotUseTheStaffQueueAndStaffCannotUseEmployerArea() throws Exception {
        MockHttpSession employer = createAndLogin(Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        MockHttpSession staff = createAndLogin(Role.SUPPORT_STAFF, null);
        mvc.perform(get("/api/v1/staff/support-requests").session(employer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/employer/jobs").session(staff)).andExpect(status().isForbidden());
    }

    @Test
    void usersCannotReadAnotherUsersApplicationOrFiles() throws Exception {
        MockHttpSession alice = registerApplicant(uniqueEmail());
        mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), alice)).andExpect(status().isCreated());
        var submitted = read(mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications", applicationAnswers(), alice))
                .andExpect(status().isCreated()).andReturn());
        String appId = submitted.get("id").asText();

        MockHttpSession mallory = registerApplicant(uniqueEmail());
        mvc.perform(get("/api/v1/applications/" + appId).session(mallory)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/applications/" + appId + "/withdraw").session(mallory).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/files/" + UUID.randomUUID()).session(mallory)).andExpect(status().isNotFound());
    }

    @Test
    void draftsAreScopedToTheirOwner() throws Exception {
        MockHttpSession alice = registerApplicant(uniqueEmail());
        mvc.perform(put("/api/v1/drafts/profile").session(alice).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("definitionVersion", 1, "currentStep", "city", "data", Map.of("givenName", "Alice")))))
                .andExpect(status().isOk());
        MockHttpSession bob = registerApplicant(uniqueEmail());
        mvc.perform(get("/api/v1/drafts/profile").session(bob)).andExpect(status().isNoContent());
    }

    @Test
    void employersCannotSeeAnotherOrganisationsApplications() throws Exception {
        MockHttpSession otherEmployer = createAndLogin(Role.EMPLOYER, OTHER_EMPLOYER_ORG);
        mvc.perform(get("/api/v1/employer/jobs/" + JOB_SUPPORT_AGENT + "/applications").session(otherEmployer))
                .andExpect(status().isNotFound());
    }

    @Test
    void applicantsCannotGrantThemselvesRolesThroughRegistration() throws Exception {
        String email = uniqueEmail();
        mvc.perform(jsonPost("/api/v1/auth/register", Map.of("displayName", "Sneaky", "email", email, "password", PASSWORD,
                        "acceptPrivacyNotice", true, "roles", List.of("PLATFORM_ADMIN")), new MockHttpSession()))
                .andExpect(status().isCreated());
        MockHttpSession s = login(email);
        mvc.perform(get("/api/v1/staff/verifications").session(s)).andExpect(status().isForbidden());
    }

    public static Map<String, Object> applicationAnswers() {
        return Map.of("contactEmail", "applicant@example.com", "motivation", "I enjoy helping customers solve problems.",
                "relevantExperience", "Three years in a call centre.", "availability", "TWO_WEEKS",
                "custom1", "Amharic and English", "custom2", "Yes",
                "shareSections", List.of("NAME", "EXPERIENCE", "SKILLS"), "shareAccommodation", "no");
    }
}
