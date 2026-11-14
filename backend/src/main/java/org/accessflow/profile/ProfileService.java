package org.accessflow.profile;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.files.FileService;
import org.accessflow.forms.DraftService;
import org.accessflow.forms.FlowDefinition;
import org.accessflow.forms.FlowRegistry;
import org.accessflow.forms.FlowValidator;
import org.accessflow.identity.IdentityService;
import org.accessflow.support.SupportService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    /** Sections of the profile flow that are stored on the profile itself (editable later). */
    public static final Set<String> PROFILE_SECTIONS = Set.of("about", "location", "work", "education");

    private final ProfileRepository profiles;
    private final FlowRegistry registry;
    private final FlowValidator validator;
    private final IdentityService identity;
    private final SupportService support;
    private final DraftService drafts;
    private final FileService files;
    private final AuditService audit;

    public ProfileService(ProfileRepository profiles, FlowRegistry registry, FlowValidator validator, IdentityService identity,
                          SupportService support, DraftService drafts, FileService files, AuditService audit) {
        this.profiles = profiles;
        this.registry = registry;
        this.validator = validator;
        this.identity = identity;
        this.support = support;
        this.drafts = drafts;
        this.files = files;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Profile getOrEmpty(UUID userId) {
        return profiles.findById(userId).orElseGet(() -> new Profile(userId));
    }

    public record OnboardingResult(Profile profile, UUID identityVerificationId, UUID supportRequestId) {}

    /** Guided profile creation: validates the full profile flow and stores profile, identity route and support request. */
    @Transactional
    public OnboardingResult completeOnboarding(UUID userId, Map<String, Object> input) {
        FlowDefinition def = registry.resolved("profile").orElseThrow();
        Map<String, Object> data = validator.validate(def, input);
        Profile p = profiles.findById(userId).orElseGet(() -> new Profile(userId));
        applyProfileFields(p, data);
        p.setSupportPreferences(strings(data.get("workplaceSupport")));
        p.markCompleted();
        p.touch();
        profiles.save(p);

        var verification = identity.start(userId, data);
        var supportRequest = "yes".equals(data.get("supportNeeded")) ? support.create(userId, data) : null;
        drafts.delete(userId, "profile", "");
        audit.record(userId, "PROFILE_COMPLETED", "PROFILE", userId);
        return new OnboardingResult(p, verification == null ? null : verification.getId(),
                supportRequest == null ? null : supportRequest.getId());
    }

    /** Edit profile sections later. Only profile fields are accepted; identity/support have their own endpoints. */
    @Transactional
    public Profile update(UUID userId, Map<String, Object> input) {
        FlowDefinition full = registry.resolved("profile").orElseThrow();
        Map<String, Object> data = validator.validate(registry.subset(full, PROFILE_SECTIONS), input);
        Profile p = profiles.findById(userId).orElseGet(() -> new Profile(userId));
        applyProfileFields(p, data);
        p.touch();
        audit.record(userId, "PROFILE_UPDATED", "PROFILE", userId);
        return profiles.save(p);
    }

    /** Private workplace-support preferences (used only for the owner's job filter). */
    @Transactional
    public Profile updateSupportPreferences(UUID userId, List<String> categories) {
        FlowDefinition full = registry.resolved("profile").orElseThrow();
        Map<String, Object> data = validator.validate(registry.subset(full, Set.of("support")),
                Map.of("supportNeeded", "no", "workplaceSupport", categories));
        Profile p = profiles.findById(userId).orElseGet(() -> new Profile(userId));
        p.setSupportPreferences(strings(data.get("workplaceSupport")));
        p.touch();
        return profiles.save(p);
    }

    @Transactional
    public Profile setResume(UUID userId, UUID fileId) {
        Profile p = profiles.findById(userId).orElseGet(() -> new Profile(userId));
        if (fileId != null) {
            var file = files.requireOwned(fileId, userId);
            if (!"RESUME".equals(file.getPurpose())) throw ApiException.badRequest("file.invalidPurpose");
        }
        p.setResumeFileId(fileId);
        p.touch();
        return profiles.save(p);
    }

    @SuppressWarnings("unchecked")
    private static void applyProfileFields(Profile p, Map<String, Object> d) {
        p.setGivenName((String) d.get("givenName"));
        p.setFatherName((String) d.get("fatherName"));
        p.setGrandfatherName((String) d.get("grandfatherName"));
        p.setBirthYear(d.get("birthYear") == null ? null : ((Integer) d.get("birthYear")).shortValue());
        p.setRegion((String) d.get("region"));
        p.setCity((String) d.get("city"));
        p.setHeadline((String) d.get("headline"));
        p.setSummary((String) d.get("summary"));
        p.setEducation(d.get("education") == null ? new ArrayList<>() : (List<Map<String, Object>>) d.get("education"));
        p.setExperience(d.get("experience") == null ? new ArrayList<>() : (List<Map<String, Object>>) d.get("experience"));
        p.setSkills(splitSkills((String) d.get("skills")));
        p.setLanguages(strings(d.get("languages")));
    }

    static List<String> splitSkills(String text) {
        if (text == null) return new ArrayList<>();
        return new ArrayList<>(Arrays.stream(text.split("[,\\n،፣]")).map(String::strip).filter(s -> !s.isEmpty())
                .distinct().limit(50).toList());
    }

    @SuppressWarnings("unchecked")
    private static List<String> strings(Object v) {
        return v == null ? new ArrayList<>() : new ArrayList<>((List<String>) v);
    }
}
