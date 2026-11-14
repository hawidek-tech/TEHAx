package org.accessflow.applications;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.consent.ConsentRecord;
import org.accessflow.consent.ConsentRecordRepository;
import org.accessflow.forms.DraftService;
import org.accessflow.forms.FlowRegistry;
import org.accessflow.forms.FlowValidator;
import org.accessflow.jobs.Job;
import org.accessflow.jobs.JobService;
import org.accessflow.notifications.NotificationService;
import org.accessflow.profile.Profile;
import org.accessflow.profile.ProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

    public static final Set<String> EMPLOYER_STATUSES = Set.of("UNDER_REVIEW", "INTERVIEW", "OFFERED", "NOT_SELECTED");
    /** Answer fields that are about sharing choices, not answers for the employer. */
    private static final Set<String> CONTROL_FIELDS = Set.of("shareSections", "shareAccommodation", "accommodationNote");
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ApplicationRepository applications;
    private final ApplicationStatusChangeRepository history;
    private final ConsentRecordRepository consents;
    private final JobService jobs;
    private final FlowRegistry registry;
    private final FlowValidator validator;
    private final ProfileService profiles;
    private final DraftService drafts;
    private final NotificationService notifications;
    private final AuditService audit;

    public ApplicationService(ApplicationRepository applications, ApplicationStatusChangeRepository history,
                              ConsentRecordRepository consents, JobService jobs, FlowRegistry registry, FlowValidator validator,
                              ProfileService profiles, DraftService drafts, NotificationService notifications, AuditService audit) {
        this.applications = applications;
        this.history = history;
        this.consents = consents;
        this.jobs = jobs;
        this.registry = registry;
        this.validator = validator;
        this.profiles = profiles;
        this.drafts = drafts;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional
    public Application submit(UUID userId, UUID jobId, Map<String, Object> input) {
        Job job = jobs.requirePublic(jobId);
        if (!job.isOpen()) throw ApiException.conflict("application.jobClosed");
        if (applications.existsByJobIdAndUserId(jobId, userId)) throw ApiException.conflict("application.alreadyApplied");

        var def = jobs.applicationFlow(registry.resolved("job-application").orElseThrow(), job);
        Map<String, Object> data = validator.validate(def, input);

        @SuppressWarnings("unchecked") List<String> shared = (List<String>) data.getOrDefault("shareSections", List.of());
        Profile profile = profiles.getOrEmpty(userId);
        Map<String, Object> snapshot = snapshot(profile, shared);
        String accommodationNote = "yes".equals(data.get("shareAccommodation")) ? (String) data.get("accommodationNote") : null;

        Map<String, Object> answers = new LinkedHashMap<>(data);
        CONTROL_FIELDS.forEach(answers::remove);

        Application app = applications.save(new Application(newReference(), jobId, userId, answers, snapshot, accommodationNote));
        history.save(new ApplicationStatusChange(app.getId(), "SUBMITTED", null, userId));
        List<String> scopes = new java.util.ArrayList<>(shared);
        if (accommodationNote != null) scopes.add("ACCOMMODATION_NOTE");
        consents.save(new ConsentRecord(userId, job.getOrganizationId(), app.getId(), "JOB_APPLICATION", scopes));
        drafts.delete(userId, "job-application", jobId.toString());
        notifications.notify(userId, "APPLICATION_SUBMITTED", Map.of("jobTitle", job.getTitle(), "reference", app.getReferenceCode()));
        audit.record(userId, "APPLICATION_SUBMITTED", "APPLICATION", app.getId());
        return app;
    }

    /** Builds the employer-visible profile data from ONLY the consented sections. Birth year and support preferences are never included. */
    static Map<String, Object> snapshot(Profile p, List<String> shared) {
        Map<String, Object> s = new LinkedHashMap<>();
        if (shared.contains("NAME")) {
            putIfPresent(s, "givenName", p.getGivenName());
            putIfPresent(s, "fatherName", p.getFatherName());
            putIfPresent(s, "grandfatherName", p.getGrandfatherName());
        }
        if (shared.contains("LOCATION")) {
            putIfPresent(s, "region", p.getRegion());
            putIfPresent(s, "city", p.getCity());
        }
        if (shared.contains("EXPERIENCE")) {
            putIfPresent(s, "headline", p.getHeadline());
            putIfPresent(s, "summary", p.getSummary());
            s.put("experience", p.getExperience());
        }
        if (shared.contains("EDUCATION")) s.put("education", p.getEducation());
        if (shared.contains("SKILLS")) s.put("skills", p.getSkills());
        if (shared.contains("LANGUAGES")) s.put("languages", p.getLanguages());
        if (shared.contains("RESUME") && p.getResumeFileId() != null) s.put("resumeFileId", p.getResumeFileId().toString());
        return s;
    }

    private static void putIfPresent(Map<String, Object> m, String k, Object v) {
        if (v != null) m.put(k, v);
    }

    @Transactional
    public Application withdraw(UUID userId, UUID applicationId) {
        Application app = applications.findByIdAndUserId(applicationId, userId).orElseThrow(ApiException::notFound);
        if ("WITHDRAWN".equals(app.getStatus())) return app;
        app.setStatus("WITHDRAWN");
        history.save(new ApplicationStatusChange(app.getId(), "WITHDRAWN", null, userId));
        audit.record(userId, "APPLICATION_WITHDRAWN", "APPLICATION", app.getId());
        return app;
    }

    /** Withdrawing consent removes the shared profile snapshot and accommodation note from the employer's view. */
    @Transactional
    public void revokeConsent(UUID userId, UUID consentId) {
        ConsentRecord c = consents.findByIdAndUserId(consentId, userId).orElseThrow(ApiException::notFound);
        c.revoke();
        if (c.getApplicationId() != null) {
            applications.findByIdAndUserId(c.getApplicationId(), userId).ifPresent(Application::clearSharedData);
        }
        audit.record(userId, "CONSENT_REVOKED", "CONSENT", consentId);
    }

    @Transactional
    public Application employerUpdateStatus(Application app, String status, String note, UUID employerId, String jobTitle) {
        if (!EMPLOYER_STATUSES.contains(status)) throw ApiException.badRequest("application.invalidStatus");
        if ("WITHDRAWN".equals(app.getStatus())) throw ApiException.conflict("application.withdrawn");
        app.setStatus(status);
        app = applications.save(app); // the entity may have been loaded outside this transaction
        history.save(new ApplicationStatusChange(app.getId(), status, note, employerId));
        notifications.notify(app.getUserId(), "APPLICATION_STATUS", Map.of("status", status, "jobTitle", jobTitle,
                "reference", app.getReferenceCode()));
        audit.record(employerId, "APPLICATION_STATUS_" + status, "APPLICATION", app.getId());
        return app;
    }

    public List<ApplicationStatusChange> historyOf(UUID applicationId) {
        return history.findByApplicationIdOrderByChangedAtAsc(applicationId);
    }

    private String newReference() {
        StringBuilder sb = new StringBuilder("AF-");
        for (int i = 0; i < 8; i++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        return sb.toString();
    }
}
