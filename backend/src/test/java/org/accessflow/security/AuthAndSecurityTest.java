package org.accessflow.security;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.accessflow.testsupport.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class AuthAndSecurityTest extends IntegrationTest {

    @Test
    void registrationSignsInAndMeReturnsOnlyBasicAccountData() throws Exception {
        String email = uniqueEmail();
        MockHttpSession s = registerApplicant(email);
        mvc.perform(get("/api/v1/auth/me").session(s))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.roles[0]").value("APPLICANT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void stateChangingRequestsWithoutCsrfTokenAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("displayName", "X", "email", uniqueEmail(), "password", PASSWORD, "acceptPrivacyNotice", true))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    void phoneNumbersAreAcceptedInLocalAndInternationalFormats() throws Exception {
        String local = "09" + String.valueOf(System.nanoTime()).substring(5, 13);
        mvc.perform(jsonPost("/api/v1/auth/register", Map.of("displayName", "Phone User", "phone", local, "password", PASSWORD,
                        "locale", "am", "acceptPrivacyNotice", true), new MockHttpSession()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.phone").value("+2519" + local.substring(2)));
        login("+251 " + local.substring(1));
    }

    @Test
    void commonPasswordsAreRejectedWithAFieldError() throws Exception {
        mvc.perform(jsonPost("/api/v1/auth/register", Map.of("displayName", "Weak", "email", uniqueEmail(), "password", "password123",
                        "acceptPrivacyNotice", true), new MockHttpSession()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.fieldErrors[0].code").value("password.tooCommon"));
    }

    @Test
    void wrongPasswordGivesGenericErrorThenProgressiveDelay() throws Exception {
        String email = uniqueEmail();
        registerApplicant(email);
        for (int i = 0; i < LoginAttemptService.FREE_ATTEMPTS; i++) {
            mvc.perform(jsonPost("/api/v1/auth/login", Map.of("identifier", email, "password", "wrong password " + i), new MockHttpSession()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("auth.invalidCredentials"));
        }
        mvc.perform(jsonPost("/api/v1/auth/login", Map.of("identifier", email, "password", PASSWORD), new MockHttpSession()))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("auth.tooManyAttempts"));
    }

    @Test
    void unknownAccountGetsTheSameErrorAsWrongPassword() throws Exception {
        mvc.perform(jsonPost("/api/v1/auth/login", Map.of("identifier", uniqueEmail(), "password", PASSWORD), new MockHttpSession()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("auth.invalidCredentials"));
    }

    @Test
    void apiResponsesCarryRestrictiveSecurityHeaders() throws Exception {
        mvc.perform(get("/api/v1/jobs"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void errorsNeverExposeStackTracesOrInternalMessages() throws Exception {
        MockHttpSession s = registerApplicant(uniqueEmail());
        mvc.perform(post("/api/v1/profile/support-preferences").session(s).with(csrf()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.code").value("error.methodNotAllowed"));
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        MockHttpSession s = registerApplicant(uniqueEmail());
        mvc.perform(post("/api/v1/auth/logout").session(s).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/profile").session(new MockHttpSession())).andExpect(status().isUnauthorized());
    }
}
