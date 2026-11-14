package org.accessflow.embed;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.accessflow.testsupport.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Embedded components authenticate with in-memory bearer tokens - no cookies, so no third-party cookie dependency. */
class EmbedSecurityTest extends IntegrationTest {

    private static final String KEY = "pk_demo_learning_platform";

    @Test
    void embeddedRegistrationReturnsBearerTokenWithoutSettingCookies() throws Exception {
        var result = mvc.perform(post("/api/v1/auth/register").header("X-AccessFlow-Embed", KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("displayName", "Embedded", "email", uniqueEmail(), "password", PASSWORD,
                                "acceptPrivacyNotice", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.embedToken").isString())
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getHeaders("Set-Cookie"))
                .noneMatch(c -> c.startsWith("AF_SESSION"));
        String token = read(result).get("embedToken").asText();

        // Works with no cookies at all (as when third-party cookies are blocked), and needs no CSRF cookie
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Embedded"));
        mvc.perform(post("/api/v1/drafts/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/drafts/profile")
                        .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("definitionVersion", 1, "data", Map.of("givenName", "E")))))
                .andExpect(status().isOk());

        // Revoked on sign-out
        mvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/profile").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test
    void unknownPartnerKeysAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login").header("X-AccessFlow-Embed", "pk_not_registered")
                        .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("identifier", uniqueEmail(), "password", PASSWORD))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("embed.unknownPartner"));
        mvc.perform(get("/api/v1/embed/config").param("key", "pk_not_registered")).andExpect(status().isForbidden());
    }

    @Test
    void forgedBearerTokensAreIgnored() throws Exception {
        mvc.perform(get("/api/v1/profile").header("Authorization", "Bearer forged-token")).andExpect(status().isUnauthorized());
    }

    @Test
    void embedPagesMayOnlyBeFramedByTheRegisteredPartnerOrigins() throws Exception {
        mvc.perform(get("/embed/signup").param("key", KEY))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors http://localhost:5500 http://127.0.0.1:5500")));
        mvc.perform(get("/embed/signup").param("key", "pk_unknown"))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")));
        mvc.perform(get("/embed/signup"))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")));
    }

    @Test
    void partnerConfigExposesOnlyPublicInformation() throws Exception {
        mvc.perform(get("/api/v1/embed/config").param("key", KEY)).andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedOrigins[0]").value("http://localhost:5500"))
                .andExpect(jsonPath("$.secretKeyHash").doesNotExist());
    }
}
