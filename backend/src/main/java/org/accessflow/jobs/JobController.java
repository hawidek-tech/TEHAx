package org.accessflow.jobs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.forms.FlowDefinition;
import org.accessflow.forms.FlowRegistry;
import org.accessflow.jobs.JobDtos.JobDetail;
import org.accessflow.jobs.JobDtos.JobSummary;
import org.accessflow.organizations.OrganizationRepository;
import org.accessflow.security.CurrentUser;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Jobs", description = "Accessible job discovery. The 'support' filter is private and never stored or shared.")
@RestController
@RequestMapping("/api/v1")
public class JobController {

    private final JobService service;
    private final FlowRegistry registry;
    private final OrganizationRepository organizations;

    public JobController(JobService service, FlowRegistry registry, OrganizationRepository organizations) {
        this.service = service;
        this.registry = registry;
        this.organizations = organizations;
    }

    private static UUID viewer() {
        return CurrentUser.isAuthenticated() ? CurrentUser.id() : null;
    }

    @Operation(summary = "Search open jobs")
    @GetMapping("/jobs")
    public List<JobSummary> search(@RequestParam(required = false) String q,
                                   @RequestParam(required = false) String region,
                                   @RequestParam(required = false) String workMode,
                                   @RequestParam(required = false) String type,
                                   @Parameter(description = "Workplace-support categories the job must offer (private filter)")
                                   @RequestParam(required = false) List<String> support) {
        if (q != null && q.length() > 100) throw ApiException.badRequest("error.badRequest");
        return service.search(new JobService.SearchCriteria(q, region, workMode, type, support), viewer());
    }

    @Operation(summary = "Job details, including the employer's accommodation information")
    @GetMapping("/jobs/{id}")
    public JobDetail detail(@PathVariable UUID id) {
        return service.detail(service.requirePublic(id), viewer());
    }

    @Operation(summary = "schema.org/JobPosting JSON-LD for a job")
    @GetMapping(value = "/jobs/{id}/jsonld", produces = "application/ld+json")
    public Map<String, Object> jsonLd(@PathVariable UUID id) {
        Job j = service.requirePublic(id);
        var org = organizations.findById(j.getOrganizationId()).orElseThrow();
        Map<String, Object> address = new LinkedHashMap<>();
        address.put("@type", "PostalAddress");
        if (j.getCity() != null) address.put("addressLocality", j.getCity());
        address.put("addressRegion", j.getRegion());
        address.put("addressCountry", "ET");
        Map<String, Object> ld = new LinkedHashMap<>();
        ld.put("@context", "https://schema.org/");
        ld.put("@type", "JobPosting");
        ld.put("title", j.getTitle());
        ld.put("description", j.getDescription());
        ld.put("datePosted", j.getCreatedAt().toString().substring(0, 10));
        ld.put("validThrough", j.getDeadline() + "T23:59:59+03:00");
        ld.put("employmentType", j.getEmploymentType());
        ld.put("hiringOrganization", Map.of("@type", "Organization", "name", org.getName()));
        ld.put("jobLocation", Map.of("@type", "Place", "address", address));
        if ("REMOTE".equals(j.getWorkMode())) {
            ld.put("jobLocationType", "TELECOMMUTE");
            ld.put("applicantLocationRequirements", Map.of("@type", "Country", "name", "Ethiopia"));
        }
        ld.put("identifier", Map.of("@type", "PropertyValue", "name", "ACCESSFLOW", "value", j.getId().toString()));
        return ld;
    }

    @Operation(summary = "Application flow for a job: the shared job-application flow plus the employer's questions")
    @GetMapping("/jobs/{id}/application-form")
    public FlowDefinition applicationForm(@PathVariable UUID id) {
        Job j = service.requirePublic(id);
        return service.applicationFlow(registry.resolved("job-application").orElseThrow(), j);
    }

    @Operation(summary = "My saved jobs")
    @GetMapping("/saved-jobs")
    public List<JobSummary> saved() {
        return service.savedJobs(CurrentUser.id());
    }

    @Operation(summary = "Save a job")
    @PutMapping("/saved-jobs/{jobId}")
    public ResponseEntity<Void> save(@PathVariable UUID jobId) {
        service.save(CurrentUser.id(), jobId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remove a saved job")
    @DeleteMapping("/saved-jobs/{jobId}")
    public ResponseEntity<Void> unsave(@PathVariable UUID jobId) {
        service.unsave(CurrentUser.id(), jobId);
        return ResponseEntity.noContent().build();
    }
}
