package org.accessflow.employer;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.applications.Application;
import org.accessflow.applications.ApplicationController.StatusChange;
import org.accessflow.applications.ApplicationRepository;
import org.accessflow.applications.ApplicationService;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.files.FileController;
import org.accessflow.files.FileService;
import org.accessflow.jobs.Job;
import org.accessflow.jobs.JobDtos.EmployerJobSummary;
import org.accessflow.jobs.JobDtos.JobDetail;
import org.accessflow.jobs.JobDtos.JobInput;
import org.accessflow.jobs.JobRepository;
import org.accessflow.jobs.JobService;
import org.accessflow.security.CurrentUser;
import org.accessflow.user.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Employer area (EMPLOYER role). Every query is scoped to the employer's organisation.
 * Employers see only consented application data, in submission order - ACCESSFLOW never ranks or scores candidates.
 */
@Tag(name = "Employer", description = "Jobs, accommodation information and received applications (EMPLOYER only)")
@RestController
@RequestMapping("/api/v1/employer")
public class EmployerController {

    private final JobService jobService;
    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final ApplicationService applicationService;
    private final UserRepository users;
    private final FileService files;
    private final AuditService audit;

    public EmployerController(JobService jobService, JobRepository jobs, ApplicationRepository applications,
                              ApplicationService applicationService, UserRepository users, FileService files, AuditService audit) {
        this.jobService = jobService;
        this.jobs = jobs;
        this.applications = applications;
        this.applicationService = applicationService;
        this.users = users;
        this.files = files;
        this.audit = audit;
    }

    private UUID orgId() {
        return users.findById(CurrentUser.id()).map(u -> u.getOrganizationId())
                .orElseThrow(() -> ApiException.forbidden());
    }

    private Job ownJob(UUID jobId) {
        Job j = jobs.findById(jobId).orElseThrow(ApiException::notFound);
        if (!j.getOrganizationId().equals(orgId())) throw ApiException.notFound();
        return j;
    }

    private Application ownApplication(UUID applicationId) {
        Application a = applications.findById(applicationId).orElseThrow(ApiException::notFound);
        ownJob(a.getJobId());
        return a;
    }

    @Operation(summary = "My organisation's jobs")
    @Transactional(readOnly = true)
    @GetMapping("/jobs")
    public List<EmployerJobSummary> myJobs() {
        UUID org = orgId();
        List<Job> list = jobs.findByOrganizationIdOrderByCreatedAtDesc(org);
        var acc = jobService.accommodationsFor(list);
        return list.stream().map(j -> new EmployerJobSummary(j.getId(), j.getTitle(), j.getStatus(), j.getDeadline(),
                applications.countByJobId(j.getId()), acc.containsKey(j.getId()) ? acc.get(j.getId()).getCategories() : List.of())).toList();
    }

    @Operation(summary = "One of my organisation's jobs (any status)")
    @GetMapping("/jobs/{id}")
    public JobDetail job(@PathVariable UUID id) {
        return jobService.detail(ownJob(id), null);
    }

    @Operation(summary = "Create a job with its accommodation information")
    @PostMapping("/jobs")
    public ResponseEntity<JobDetail> create(@Valid @RequestBody JobInput input) {
        Job job = jobService.upsert(new Job(orgId(), CurrentUser.id()), input);
        audit.record(CurrentUser.id(), "JOB_CREATED", "JOB", job.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.detail(job, null));
    }

    @Operation(summary = "Update a job and its accommodation information")
    @PutMapping("/jobs/{id}")
    public JobDetail update(@PathVariable UUID id, @Valid @RequestBody JobInput input) {
        Job job = jobService.upsert(ownJob(id), input);
        audit.record(CurrentUser.id(), "JOB_UPDATED", "JOB", job.getId());
        return jobService.detail(job, null);
    }

    /** What an employer may see: consented snapshot + answers. No ranking, score or support preferences. */
    public record ReceivedApplication(UUID id, String referenceCode, String status, Instant submittedAt,
                                      Map<String, Object> sharedProfile, Map<String, Object> answers,
                                      String accommodationNote, boolean resumeShared, List<StatusChange> history) {}

    private ReceivedApplication received(Application a) {
        return new ReceivedApplication(a.getId(), a.getReferenceCode(), a.getStatus(), a.getSubmittedAt(),
                a.getSharedSnapshot(), a.getAnswers(), a.getAccommodationNote(), a.getSharedSnapshot().containsKey("resumeFileId"),
                applicationService.historyOf(a.getId()).stream().map(h -> new StatusChange(h.getStatus(), h.getNote(), h.getChangedAt())).toList());
    }

    @Operation(summary = "Applications received for a job, in submission order (never ranked)")
    @Transactional(readOnly = true)
    @GetMapping("/jobs/{id}/applications")
    public List<ReceivedApplication> applicationsFor(@PathVariable UUID id) {
        ownJob(id);
        audit.record(CurrentUser.id(), "EMPLOYER_VIEWED_APPLICATIONS", "JOB", id);
        return applications.findByJobIdOrderBySubmittedAtAsc(id).stream().map(this::received).toList();
    }

    public record StatusUpdate(@NotBlank String status, @Size(max = 500) String note) {}

    @Operation(summary = "Update an application's status (the applicant is notified)")
    @PostMapping("/applications/{id}/status")
    public ReceivedApplication updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdate body) {
        Application a = ownApplication(id);
        Job job = jobs.findById(a.getJobId()).orElseThrow();
        return received(applicationService.employerUpdateStatus(a, body.status(), body.note(), CurrentUser.id(), job.getTitle()));
    }

    @Operation(summary = "Download the CV, only if the applicant chose to share it")
    @GetMapping("/applications/{id}/resume")
    public ResponseEntity<Resource> resume(@PathVariable UUID id) {
        Application a = ownApplication(id);
        Object fileId = a.getSharedSnapshot().get("resumeFileId");
        if (fileId == null) throw ApiException.notFound();
        audit.record(CurrentUser.id(), "EMPLOYER_DOWNLOADED_RESUME", "APPLICATION", id);
        return FileController.asAttachment(files, files.require(UUID.fromString(fileId.toString())));
    }
}
