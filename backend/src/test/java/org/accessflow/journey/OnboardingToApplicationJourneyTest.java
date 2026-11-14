package org.accessflow.journey;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.accessflow.security.AuthorizationMatrixTest;
import org.accessflow.testsupport.IntegrationTest;
import org.accessflow.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

/** The main demonstration journey, end to end through the public API with real persistence. */
class OnboardingToApplicationJourneyTest extends IntegrationTest {

    @Test
    void fullJourneyFromRegistrationToStatusTracking() throws Exception {
        // 1-5. Register (preferences are created with the chosen language)
        String email = uniqueEmail();
        MockHttpSession applicant = registerApplicant(email);
        mvc.perform(put("/api/v1/preferences").session(applicant).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("locale", "am", "textScale", 150, "highContrast", true, "simplifiedLanguage", true,
                                "captions", true, "keyboardFirst", false, "readAloud", true, "reducedMotion", true, "sharedDevice", false))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.textScale").value(150));

        // 6. Guided profile: save a draft, resume it, then complete the flow
        mvc.perform(put("/api/v1/drafts/profile").session(applicant).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("definitionVersion", 1, "currentStep", "region", "data", Map.of("givenName", "Almaz")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        // A stale save (another device) is detected instead of silently overwriting
        mvc.perform(put("/api/v1/drafts/profile").session(applicant).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("definitionVersion", 1, "expectedVersion", 0, "data", Map.of()))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("draft.conflict"));
        mvc.perform(get("/api/v1/drafts/profile").session(applicant))
                .andExpect(status().isOk()).andExpect(jsonPath("$.currentStep").value("region"))
                .andExpect(jsonPath("$.data.givenName").value("Almaz"));

        JsonNode onboarding = read(mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), applicant))
                .andExpect(status().isCreated()).andReturn());
        assertThat(onboarding.get("identityVerificationId").isNull()).isFalse();
        assertThat(onboarding.get("supportRequestId").isNull()).isFalse();
        assertThat(onboarding.at("/profile/skills").size()).isEqualTo(3);
        mvc.perform(get("/api/v1/drafts/profile").session(applicant)).andExpect(status().isNoContent());

        // Identity route is PENDING until staff decide - never auto-verified
        mvc.perform(get("/api/v1/identity").session(applicant))
                .andExpect(jsonPath("$[0].route").value("REFUGEE_ID"))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].documentLast4").value("7A9Z"));

        // 8. Discover jobs privately filtered by workplace support
        JsonNode filtered = read(mvc.perform(get("/api/v1/jobs").session(applicant)
                .param("support", "SIGN_LANGUAGE")).andExpect(status().isOk()).andReturn());
        assertThat(filtered).isNotEmpty();
        filtered.forEach(j -> assertThat(j.get("accommodations").toString()).contains("SIGN_LANGUAGE"));

        // 9-12. Job details, application form (shared engine + employer questions), submit
        mvc.perform(get("/api/v1/jobs/" + JOB_SUPPORT_AGENT)).andExpect(status().isOk())
                .andExpect(jsonPath("$.accommodations.categories").isArray());
        JsonNode form = read(mvc.perform(get("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/application-form").session(applicant))
                .andExpect(status().isOk()).andReturn());
        assertThat(form.get("key").asText()).isEqualTo("job-application");
        assertThat(form.get("steps").toString()).contains("custom1").contains("shareSections");

        Map<String, Object> answers = new HashMap<>(AuthorizationMatrixTest.applicationAnswers());
        answers.remove("motivation");
        mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications", answers, applicant))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("motivation"));

        JsonNode app = read(mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications",
                AuthorizationMatrixTest.applicationAnswers(), applicant)).andExpect(status().isCreated()).andReturn());
        String appId = app.get("id").asText();
        assertThat(app.get("referenceCode").asText()).startsWith("AF-");
        mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications", AuthorizationMatrixTest.applicationAnswers(), applicant))
                .andExpect(status().isConflict());

        // Employer sees only consented sections: no education, no birth year, no support preferences, no accommodation note
        MockHttpSession employer = createAndLogin(Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        JsonNode received = read(mvc.perform(get("/api/v1/employer/jobs/" + JOB_SUPPORT_AGENT + "/applications").session(employer))
                .andExpect(status().isOk()).andReturn());
        JsonNode mine = null;
        for (JsonNode r : received) if (r.get("id").asText().equals(appId)) mine = r;
        assertThat(mine).isNotNull();
        String visible = mine.toString();
        assertThat(mine.at("/sharedProfile/givenName").asText()).isEqualTo("Almaz");
        assertThat(mine.at("/sharedProfile/skills").size()).isEqualTo(3);
        assertThat(visible).doesNotContain("education").doesNotContain("birthYear").doesNotContain("SCREEN_READER")
                .doesNotContain("supportPreferences").doesNotContain("questions in writing");
        assertThat(mine.has("accommodationNote")).isFalse();
        assertThat(mine.has("score")).isFalse();

        // 13. Employer updates status; applicant tracks it and is notified
        mvc.perform(jsonPost("/api/v1/employer/applications/" + appId + "/status", Map.of("status", "INTERVIEW"), employer))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/applications/" + appId).session(applicant))
                .andExpect(jsonPath("$.summary.status").value("INTERVIEW"))
                .andExpect(jsonPath("$.history[0].status").value("SUBMITTED"))
                .andExpect(jsonPath("$.history[1].status").value("INTERVIEW"));
        JsonNode notes = read(mvc.perform(get("/api/v1/notifications").session(applicant)).andReturn());
        assertThat(notes.toString()).contains("APPLICATION_STATUS").contains("APPLICATION_SUBMITTED");

        // Withdrawing consent removes shared profile data from the employer's view
        String consentId = read(mvc.perform(get("/api/v1/applications/" + appId).session(applicant)).andReturn()).get("consentId").asText();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/consents/" + consentId + "/revoke")
                .session(applicant).with(csrf())).andExpect(status().isNoContent());
        JsonNode after = read(mvc.perform(get("/api/v1/employer/jobs/" + JOB_SUPPORT_AGENT + "/applications").session(employer)).andReturn());
        for (JsonNode r : after) if (r.get("id").asText().equals(appId)) assertThat(r.get("sharedProfile").size()).isZero();
    }

    @Test
    void accommodationNoteIsSharedOnlyWhenTheApplicantChoosesTo() throws Exception {
        MockHttpSession applicant = registerApplicant(uniqueEmail());
        mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), applicant)).andExpect(status().isCreated());
        Map<String, Object> answers = new HashMap<>(AuthorizationMatrixTest.applicationAnswers());
        answers.put("shareAccommodation", "yes");
        answers.put("accommodationNote", "Please send interview questions in writing.");
        String appId = read(mvc.perform(jsonPost("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/applications", answers, applicant))
                .andExpect(status().isCreated()).andReturn()).get("id").asText();
        MockHttpSession employer = createAndLogin(Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        JsonNode received = read(mvc.perform(get("/api/v1/employer/jobs/" + JOB_SUPPORT_AGENT + "/applications").session(employer)).andReturn());
        boolean found = false;
        for (JsonNode r : received) {
            if (r.get("id").asText().equals(appId)) {
                found = true;
                assertThat(r.get("accommodationNote").asText()).contains("in writing");
            }
        }
        assertThat(found).isTrue();
    }

    @Test
    void supportStaffReviewIdentityAndAnswerSupportRequests() throws Exception {
        MockHttpSession applicant = registerApplicant(uniqueEmail());
        JsonNode onboarding = read(mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), applicant)).andReturn());
        String verificationId = onboarding.get("identityVerificationId").asText();
        String supportId = onboarding.get("supportRequestId").asText();

        MockHttpSession staff = createAndLogin(Role.SUPPORT_STAFF, null);
        assertThat(read(mvc.perform(get("/api/v1/staff/verifications").session(staff)).andReturn()).toString()).contains(verificationId);
        mvc.perform(jsonPost("/api/v1/staff/verifications/" + verificationId + "/decision", Map.of("status", "VERIFIED"), staff))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("VERIFIED"));
        mvc.perform(jsonPost("/api/v1/staff/support-requests/" + supportId + "/response",
                        Map.of("status", "RESOLVED", "response", "We have noted this for your interviews."), staff))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/support-requests").session(applicant))
                .andExpect(jsonPath("$[0].status").value("RESOLVED"))
                .andExpect(jsonPath("$[0].staffResponse").value("We have noted this for your interviews."));
    }

    @Test
    void partnerReferralRouteRequiresAPartnerAndStaysPending() throws Exception {
        MockHttpSession applicant = registerApplicant(uniqueEmail());
        Map<String, Object> answers = profileAnswers();
        answers.put("identityRoute", "REFER_ME");
        answers.remove("documentLast4");
        answers.put("supportNeeded", "no");
        mvc.perform(jsonPost("/api/v1/onboarding/profile", answers, applicant))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.fieldErrors[0].field").value("referralPartner"));
        answers.put("referralPartner", REFERRAL_PARTNER.toString());
        mvc.perform(jsonPost("/api/v1/onboarding/profile", answers, applicant)).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/identity").session(applicant))
                .andExpect(jsonPath("$[0].route").value("REFER_ME")).andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void dataExportContainsMyDataAndDeletionRemovesTheAccount() throws Exception {
        String email = uniqueEmail();
        MockHttpSession applicant = registerApplicant(email);
        mvc.perform(jsonPost("/api/v1/onboarding/profile", profileAnswers(), applicant)).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/account/export").session(applicant)).andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.givenName").value("Almaz"))
                .andExpect(jsonPath("$.supportRequests").isArray());
        mvc.perform(jsonPost("/api/v1/account/delete", Map.of("password", "wrong"), applicant)).andExpect(status().isUnprocessableEntity());
        mvc.perform(jsonPost("/api/v1/account/delete", Map.of("password", PASSWORD), applicant)).andExpect(status().isNoContent());
        assertThat(users.findByEmailIgnoreCase(email)).isEmpty();
    }

    @Test
    void helpAndAssistantWorkWithoutAnAiProvider() throws Exception {
        mvc.perform(get("/api/v1/help").param("locale", "am")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].locale").value("am"));
        mvc.perform(jsonPost("/api/v1/assistant/ask", Map.of("question", "I do not have a passport or national ID", "locale", "en",
                        "allowExternalAi", true), new MockHttpSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("local"))
                .andExpect(jsonPath("$.articles[0].slug").value("identity-options"))
                .andExpect(jsonPath("$.humanSupportPath").value("/support"));
    }

    @Test
    void jobPostingJsonLdFollowsSchemaOrg() throws Exception {
        mvc.perform(get("/api/v1/jobs/" + JOB_SUPPORT_AGENT + "/jsonld")).andExpect(status().isOk())
                .andExpect(jsonPath("$['@type']").value("JobPosting"))
                .andExpect(jsonPath("$.hiringOrganization.name").exists())
                .andExpect(jsonPath("$.jobLocation.address.addressCountry").value("ET"));
    }

    @Test
    void employersCreateJobsWithAccommodationInformation() throws Exception {
        MockHttpSession employer = createAndLogin(Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        Map<String, Object> job = new HashMap<>(Map.of("title", "Accessible QA Tester", "summary", "Test our apps with assistive technology.",
                "plainSummary", "You will check that apps work for everyone.", "description", "Full description.",
                "region", "ADDIS_ABABA", "workMode", "REMOTE", "employmentType", "CONTRACT",
                "deadline", java.time.LocalDate.now().plusDays(30).toString(), "status", "PUBLISHED"));
        job.put("accommodations", Map.of("categories", List.of("REMOTE_WORK", "SCREEN_READER"),
                "interviewArrangements", "Online interview with captions."));
        job.put("customQuestions", List.of(Map.of("label", "Which screen readers have you used?", "type", "text", "required", true)));
        String id = read(mvc.perform(jsonPost("/api/v1/employer/jobs", job, employer)).andExpect(status().isCreated()).andReturn())
                .get("id").asText();
        mvc.perform(get("/api/v1/jobs/" + id)).andExpect(jsonPath("$.accommodations.interviewArrangements").value("Online interview with captions."))
                .andExpect(jsonPath("$.customQuestions[0].label").value("Which screen readers have you used?"));
        job.put("accommodations", Map.of("categories", List.of("TELEPATHY")));
        mvc.perform(jsonPost("/api/v1/employer/jobs", job, employer)).andExpect(status().isUnprocessableEntity());
    }
}
