package org.accessflow.learners;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.account.AccountController;
import org.accessflow.auth.AuthController;
import org.accessflow.auth.AuthDtos.RegisterRequest;
import org.accessflow.auth.AuthDtos.SessionResponse;
import org.accessflow.common.ApiException;
import org.accessflow.forms.FlowRegistry;
import org.accessflow.forms.FlowValidator;
import org.accessflow.profile.Profile;
import org.accessflow.profile.ProfileController;
import org.accessflow.profile.ProfileController.ProfileDto;
import org.accessflow.profile.ProfileService;
import org.accessflow.security.CurrentUser;
import org.accessflow.security.EmbedTokenAuthenticationFilter;
import org.accessflow.support.SupportService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Track 1 data contract ("learners"). A facade over the existing account, profile, support, export and deletion
 * services - no duplicated business logic. A learner may only address their OWN id; any other id returns 404.
 * Support information is kept separate from the ordinary profile and is never returned to employers.
 */
@Tag(name = "Learners (Track 1 data contract)")
@RestController
@RequestMapping("/api/v1/learners")
public class LearnerController {

    private final AuthController auth;
    private final ProfileService profiles;
    private final ProfileController profileController;
    private final SupportService support;
    private final AccountController account;
    private final FlowRegistry registry;
    private final FlowValidator validator;

    public LearnerController(AuthController auth, ProfileService profiles, ProfileController profileController, SupportService support,
                             AccountController account, FlowRegistry registry, FlowValidator validator) {
        this.auth = auth;
        this.profiles = profiles;
        this.profileController = profileController;
        this.support = support;
        this.account = account;
        this.registry = registry;
        this.validator = validator;
    }

    private static UUID own(UUID id) {
        if (!CurrentUser.id().equals(id)) throw ApiException.notFound();
        return id;
    }

    @Operation(summary = "Create a learner account (same rules as /auth/register) and sign in. 201 + Location.")
    @PostMapping
    public ResponseEntity<SessionResponse> create(@Valid @RequestBody RegisterRequest req,
                                                  @RequestHeader(value = EmbedTokenAuthenticationFilter.EMBED_HEADER, required = false) String embedKey,
                                                  HttpServletRequest request, HttpServletResponse response) {
        SessionResponse session = auth.registerAndSignIn(req, embedKey, request, response);
        return ResponseEntity.created(URI.create("/api/v1/learners/" + session.user().id())).body(session);
    }

    @Operation(summary = "Partially update the learner's profile. Only the fields sent are changed; the result is validated "
            + "with the same rules as the profile form.")
    @PatchMapping("/{id}")
    public ProfileDto patch(@PathVariable UUID id, @RequestBody Map<String, Object> changes) {
        own(id);
        Map<String, Object> merged = new HashMap<>(asFormData(profiles.getOrEmpty(id)));
        merged.putAll(changes);
        return profileController.toDto(profiles.update(id, merged));
    }

    public record SupportRequestInput(@Size(max = 32) String category, @Size(max = 2000) String message, @Size(max = 16) String contact) {}

    public record SupportUpdate(List<String> workplaceSupport, @Valid SupportRequestInput request) {}

    public record SupportState(List<String> workplaceSupport, UUID supportRequestId) {}

    @Operation(summary = "Replace the learner's PRIVATE support preferences; optionally open a private support request. "
            + "Never shared with employers.")
    @PutMapping("/{id}/support")
    public SupportState support(@PathVariable UUID id, @Valid @RequestBody SupportUpdate body) {
        own(id);
        Profile p = profiles.updateSupportPreferences(id, body.workplaceSupport() == null ? List.of() : body.workplaceSupport());
        UUID requestId = null;
        if (body.request() != null) {
            Map<String, Object> input = new HashMap<>();
            input.put("supportCategory", body.request().category());
            input.put("supportMessage", body.request().message());
            input.put("supportContact", body.request().contact());
            Map<String, Object> data = validator.validate(registry.resolved("support-request").orElseThrow(), input);
            requestId = support.create(id, data).getId();
        }
        return new SupportState(p.getSupportPreferences(), requestId);
    }

    @Operation(summary = "Export all of the learner's data (JSON attachment)")
    @GetMapping("/{id}/export")
    public ResponseEntity<Map<String, Object>> export(@PathVariable UUID id) {
        own(id);
        return account.export();
    }

    @Operation(summary = "Permanently delete the learner and all their data. Body: {\"password\": \"…\"} (re-authentication). 204.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @Valid @RequestBody AccountController.DeleteRequest body, HttpServletRequest request) {
        own(id);
        return account.delete(body, request);
    }

    /** Current profile expressed in the profile form's field ids (skills joined), so a partial change can be merged. */
    static Map<String, Object> asFormData(Profile p) {
        Map<String, Object> m = new HashMap<>();
        m.put("givenName", p.getGivenName());
        m.put("fatherName", p.getFatherName());
        m.put("grandfatherName", p.getGrandfatherName());
        m.put("birthYear", p.getBirthYear() == null ? null : p.getBirthYear().intValue());
        m.put("region", p.getRegion());
        m.put("city", p.getCity());
        m.put("headline", p.getHeadline());
        m.put("summary", p.getSummary());
        m.put("experience", p.getExperience());
        m.put("education", p.getEducation());
        m.put("skills", String.join(", ", p.getSkills()));
        m.put("languages", p.getLanguages());
        m.values().removeIf(v -> v == null);
        return m;
    }

}
