package org.accessflow.applications;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.consent.ConsentRecordRepository;
import org.accessflow.jobs.Job;
import org.accessflow.jobs.JobRepository;
import org.accessflow.organizations.OrganizationRepository;
import org.accessflow.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Applications", description = "The signed-in applicant's job applications, status tracking and consents")
@RestController
@RequestMapping("/api/v1")
public class ApplicationController {

    private final ApplicationService service;
    private final ApplicationRepository applications;
    private final JobRepository jobs;
    private final OrganizationRepository organizations;
    private final ConsentRecordRepository consents;

    public ApplicationController(ApplicationService service, ApplicationRepository applications, JobRepository jobs,
                                 OrganizationRepository organizations, ConsentRecordRepository consents) {
        this.service = service;
        this.applications = applications;
        this.jobs = jobs;
        this.organizations = organizations;
        this.consents = consents;
    }

    public record StatusChange(String status, String note, Instant changedAt) {}

    public record ApplicationSummary(UUID id, String referenceCode, UUID jobId, String jobTitle, String organizationName,
                                     String status, Instant submittedAt, Instant updatedAt) {}

    public record ApplicationDetail(ApplicationSummary summary, Map<String, Object> answers, Map<String, Object> sharedProfile,
                                    String accommodationNote, List<StatusChange> history, UUID consentId) {}

    private ApplicationSummary summary(Application a) {
        Job job = jobs.findById(a.getJobId()).orElse(null);
        String orgName = job == null ? null : organizations.findById(job.getOrganizationId()).map(o -> o.getName()).orElse(null);
        return new ApplicationSummary(a.getId(), a.getReferenceCode(), a.getJobId(), job == null ? null : job.getTitle(),
                orgName, a.getStatus(), a.getSubmittedAt(), a.getUpdatedAt());
    }

    @Operation(summary = "Submit an application (validated against the job's application flow)")
    @PostMapping("/jobs/{jobId}/applications")
    public ResponseEntity<ApplicationSummary> submit(@PathVariable UUID jobId, @RequestBody Map<String, Object> data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(summary(service.submit(CurrentUser.id(), jobId, data)));
    }

    @Operation(summary = "My applications")
    @Transactional(readOnly = true)
    @GetMapping("/applications")
    public List<ApplicationSummary> mine() {
        return applications.findByUserIdOrderBySubmittedAtDesc(CurrentUser.id()).stream().map(this::summary).toList();
    }

    @Operation(summary = "One of my applications, with its status history")
    @Transactional(readOnly = true)
    @GetMapping("/applications/{id}")
    public ApplicationDetail detail(@PathVariable UUID id) {
        Application a = applications.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(ApiException::notFound);
        return new ApplicationDetail(summary(a), a.getAnswers(), a.getSharedSnapshot(), a.getAccommodationNote(),
                service.historyOf(a.getId()).stream().map(h -> new StatusChange(h.getStatus(), h.getNote(), h.getChangedAt())).toList(),
                consents.findFirstByApplicationIdAndRevokedAtIsNull(a.getId()).map(c -> c.getId()).orElse(null));
    }

    @Operation(summary = "Withdraw one of my applications")
    @PostMapping("/applications/{id}/withdraw")
    public ApplicationSummary withdraw(@PathVariable UUID id) {
        return summary(service.withdraw(CurrentUser.id(), id));
    }

    public record ConsentDto(UUID id, UUID recipientOrg, String recipientName, UUID applicationId, String purpose,
                             List<String> scopes, String noticeVersion, Instant grantedAt, Instant revokedAt) {}

    @Operation(summary = "Everything I have agreed to share, and with whom")
    @Transactional(readOnly = true)
    @GetMapping("/consents")
    public List<ConsentDto> consents() {
        return consents.findByUserIdOrderByGrantedAtDesc(CurrentUser.id()).stream()
                .map(c -> new ConsentDto(c.getId(), c.getRecipientOrg(),
                        c.getRecipientOrg() == null ? null : organizations.findById(c.getRecipientOrg()).map(o -> o.getName()).orElse(null),
                        c.getApplicationId(), c.getPurpose(), c.getScopes(), c.getNoticeVersion(), c.getGrantedAt(), c.getRevokedAt()))
                .toList();
    }

    @Operation(summary = "Withdraw consent: removes shared profile data from the employer's view")
    @PostMapping("/consents/{id}/revoke")
    public ResponseEntity<Void> revoke(@PathVariable UUID id) {
        service.revokeConsent(CurrentUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
