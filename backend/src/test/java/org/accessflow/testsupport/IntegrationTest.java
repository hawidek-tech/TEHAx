package org.accessflow.testsupport;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.EnumSet;
import java.util.Map;
import java.util.UUID;
import org.accessflow.user.Role;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Full-context tests against the PostgreSQL test database. Each test uses unique accounts, so no cleanup is needed. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTest {

    public static final String PASSWORD = "correct horse battery";
    public static final UUID DEMO_EMPLOYER_ORG = UUID.fromString("0a000000-0000-4000-8000-000000000001");
    public static final UUID OTHER_EMPLOYER_ORG = UUID.fromString("0a000000-0000-4000-8000-000000000002");
    public static final UUID JOB_SUPPORT_AGENT = UUID.fromString("0c000000-0000-4000-8000-000000000001");
    public static final UUID REFERRAL_PARTNER = UUID.fromString("0a000000-0000-4000-8000-000000000004");

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository users;
    @Autowired protected PasswordEncoder encoder;

    protected static String uniqueEmail() {
        return "u" + UUID.randomUUID().toString().substring(0, 12) + "@example.com";
    }

    protected String body(Object o) throws Exception {
        return json.writeValueAsString(o);
    }

    protected JsonNode read(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }

    /** Registers an applicant through the public API and returns the authenticated session. */
    protected MockHttpSession registerApplicant(String email) throws Exception {
        MockHttpSession session = new MockHttpSession();
        MvcResult r = mvc.perform(post("/api/v1/auth/register").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("displayName", "Test Applicant", "email", email, "password", PASSWORD,
                                "locale", "en", "acceptPrivacyNotice", true))))
                .andExpect(status().isCreated()).andReturn();
        return (MockHttpSession) r.getRequest().getSession();
    }

    protected MockHttpSession login(String identifier) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").session(new MockHttpSession()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("identifier", identifier, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) r.getRequest().getSession();
    }

    /** Creates a staff/employer account directly (these roles cannot self-register) and signs in. */
    protected MockHttpSession createAndLogin(Role role, UUID organizationId) throws Exception {
        String email = uniqueEmail();
        User u = new User(email, null, encoder.encode(PASSWORD), role.name(), "en", EnumSet.of(role));
        u.setOrganizationId(organizationId);
        users.save(u);
        return login(email);
    }

    protected MockHttpServletRequestBuilder jsonPost(String url, Object payload, MockHttpSession session) throws Exception {
        return post(url).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(payload));
    }

    /** A complete, valid answer set for the guided profile flow. */
    protected static Map<String, Object> profileAnswers() {
        return new java.util.HashMap<>(Map.ofEntries(
                Map.entry("givenName", "Almaz"),
                Map.entry("fatherName", "Bekele"),
                Map.entry("birthYear", 1998),
                Map.entry("region", "ADDIS_ABABA"),
                Map.entry("city", "Addis Ababa"),
                Map.entry("headline", "Customer support"),
                Map.entry("summary", "Three years helping customers by phone."),
                Map.entry("experience", java.util.List.of(Map.of("title", "Call agent", "organization", "Telecom shop", "startYear", 2021))),
                Map.entry("education", java.util.List.of(Map.of("level", "DIPLOMA", "institution", "TVET College"))),
                Map.entry("skills", "Typing, Amharic, English"),
                Map.entry("languages", java.util.List.of("am", "en")),
                Map.entry("identityRoute", "REFUGEE_ID"),
                Map.entry("documentLast4", "7a9z"),
                Map.entry("supportNeeded", "yes"),
                Map.entry("supportCategory", "INTERVIEW_SUPPORT"),
                Map.entry("supportMessage", "I would like questions in writing before an interview."),
                Map.entry("supportContact", "IN_APP"),
                Map.entry("workplaceSupport", java.util.List.of("SCREEN_READER", "ACCESSIBLE_INTERVIEW"))));
    }
}
