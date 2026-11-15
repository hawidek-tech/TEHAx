package org.accessflow.profile;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.accessflow.testsupport.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

/** Saving only some profile questions: the minimum needed to apply, and the guided profile part by part. */
class ProfileStepsTest extends IntegrationTest {

    private MockHttpSession learner() throws Exception {
        MockHttpSession s = new MockHttpSession();
        MvcResult r = mvc.perform(jsonPost("/api/v1/learners", Map.of("displayName", "Steps Learner", "email", uniqueEmail(),
                "password", PASSWORD, "locale", "en", "acceptPrivacyNotice", true), s)).andExpect(status().isCreated()).andReturn();
        return (MockHttpSession) r.getRequest().getSession();
    }

    private org.springframework.test.web.servlet.ResultActions save(MockHttpSession s, String steps, Map<String, Object> data)
            throws Exception {
        return mvc.perform(put("/api/v1/profile/steps").param("steps", steps).session(s).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(data)));
    }

    @Test
    void partsAreSavedSeparatelyAndOtherFieldsAreKept() throws Exception {
        MockHttpSession s = learner();
        // Minimum for an application: name, region, headline, skills - the rest stays empty and the profile is not complete
        save(s, "givenName,fatherName,region,headline,skills", Map.of("givenName", "Almaz", "fatherName", "Bekele",
                "region", "ADDIS_ABABA", "headline", "Data entry clerk", "skills", "Typing, Excel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.givenName").value("Almaz"))
                .andExpect(jsonPath("$.skills.length()").value(2))
                .andExpect(jsonPath("$.completed").value(true));
        // A later part changes only its own questions
        save(s, "grandfatherName,birthYear,city", Map.of("city", "Addis Ababa", "birthYear", 1995))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Addis Ababa"))
                .andExpect(jsonPath("$.headline").value("Data entry clerk"))
                .andExpect(jsonPath("$.fatherName").value("Bekele"));
    }

    @Test
    void validatesOnlyTheChosenQuestionsAndRejectsOthers() throws Exception {
        MockHttpSession s = learner();
        save(s, "fatherName", Map.of()).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("fatherName"));
        save(s, "region", Map.of("region", "ADDIS_ABABA")).andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(false));
        // identity and private support have their own endpoints
        save(s, "identityRoute", Map.of("identityRoute", "NATIONAL_ID")).andExpect(status().isBadRequest());
        save(s, "supportNeeded", Map.of("supportNeeded", "yes")).andExpect(status().isBadRequest());
        save(s, "noSuchStep", Map.of()).andExpect(status().isBadRequest());
    }
}
