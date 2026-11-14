package org.accessflow.jobs;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.accessflow.common.ApiException;
import org.accessflow.forms.FlowDefinition;
import org.accessflow.forms.OptionSources;
import org.accessflow.jobs.JobDtos.AccommodationDto;
import org.accessflow.jobs.JobDtos.CustomQuestion;
import org.accessflow.jobs.JobDtos.JobDetail;
import org.accessflow.jobs.JobDtos.JobInput;
import org.accessflow.jobs.JobDtos.JobSummary;
import org.accessflow.organizations.Organization;
import org.accessflow.organizations.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {

    private final JobRepository jobs;
    private final JobAccommodationRepository accommodations;
    private final OrganizationRepository organizations;
    private final SavedJobRepository saved;

    public JobService(JobRepository jobs, JobAccommodationRepository accommodations, OrganizationRepository organizations,
                      SavedJobRepository saved) {
        this.jobs = jobs;
        this.accommodations = accommodations;
        this.organizations = organizations;
        this.saved = saved;
    }

    public record SearchCriteria(String query, String region, String workMode, String employmentType, List<String> support) {}

    /**
     * Search open jobs. The support filter is PRIVATE: it is applied in memory for this request only, never stored,
     * logged or made visible to employers.
     */
    @Transactional(readOnly = true)
    public List<JobSummary> search(SearchCriteria c, UUID viewerId) {
        List<Job> open = jobs.findByStatusAndDeadlineGreaterThanEqualOrderByDeadlineAsc("PUBLISHED", LocalDate.now());
        Map<UUID, JobAccommodation> acc = accommodationsFor(open);
        Map<UUID, Organization> orgs = organizationsFor(open);
        Set<UUID> savedIds = viewerId == null ? Set.of() : Set.copyOf(saved.jobIdsFor(viewerId));
        String q = c.query() == null ? "" : c.query().strip().toLowerCase(Locale.ROOT);
        return open.stream()
                .filter(j -> q.isEmpty() || matches(j, orgs.get(j.getOrganizationId()), q))
                .filter(j -> blank(c.region()) || c.region().equals(j.getRegion()) || ("REMOTE".equals(j.getWorkMode()) && "ANY_REMOTE".equals(c.region())))
                .filter(j -> blank(c.workMode()) || c.workMode().equals(j.getWorkMode()))
                .filter(j -> blank(c.employmentType()) || c.employmentType().equals(j.getEmploymentType()))
                .filter(j -> c.support() == null || c.support().isEmpty()
                        || (acc.containsKey(j.getId()) && acc.get(j.getId()).getCategories().containsAll(c.support())))
                .map(j -> summary(j, orgs.get(j.getOrganizationId()), acc.get(j.getId()), savedIds.contains(j.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JobSummary> savedJobs(UUID userId) {
        List<UUID> ids = saved.jobIdsFor(userId);
        Map<UUID, Job> byId = jobs.findAllById(ids).stream().collect(Collectors.toMap(Job::getId, Function.identity()));
        List<Job> ordered = ids.stream().map(byId::get).filter(j -> j != null).toList();
        Map<UUID, JobAccommodation> acc = accommodationsFor(ordered);
        Map<UUID, Organization> orgs = organizationsFor(ordered);
        return ordered.stream().map(j -> summary(j, orgs.get(j.getOrganizationId()), acc.get(j.getId()), true)).toList();
    }

    @Transactional
    public void save(UUID userId, UUID jobId) {
        requirePublic(jobId);
        saved.save(new SavedJob(userId, jobId));
    }

    @Transactional
    public void unsave(UUID userId, UUID jobId) {
        saved.deleteById(new SavedJob.Key(userId, jobId));
    }

    /** Published jobs are public; drafts are visible only to their organisation (handled in EmployerJobController). */
    @Transactional(readOnly = true)
    public Job requirePublic(UUID id) {
        Job j = jobs.findById(id).orElseThrow(ApiException::notFound);
        if ("DRAFT".equals(j.getStatus())) throw ApiException.notFound();
        return j;
    }

    @Transactional(readOnly = true)
    public JobDetail detail(Job j, UUID viewerId) {
        Organization org = organizations.findById(j.getOrganizationId()).orElse(null);
        AccommodationDto acc = accommodations.findById(j.getId()).map(JobAccommodation::toDto).orElse(null);
        boolean isSaved = viewerId != null && saved.existsById(new SavedJob.Key(viewerId, j.getId()));
        return new JobDetail(j.getId(), j.getTitle(), org == null ? null : org.getName(), org == null ? null : org.getDescription(),
                j.getSummary(), j.getPlainSummary(), j.getDescription(), j.getRegion(), j.getCity(), j.getWorkMode(),
                j.getEmploymentType(), j.getSalaryText(), j.getDeadline(), daysLeft(j), j.getStatus(), acc,
                customQuestions(j), isSaved, j.isOpen());
    }

    public static List<CustomQuestion> customQuestions(Job j) {
        List<CustomQuestion> out = new ArrayList<>();
        for (Map<String, Object> q : j.getCustomQuestions()) {
            @SuppressWarnings("unchecked") List<String> options = (List<String>) q.getOrDefault("options", List.of());
            out.add(new CustomQuestion((String) q.get("id"), (String) q.get("label"), (String) q.get("type"),
                    Boolean.TRUE.equals(q.get("required")), options));
        }
        return out;
    }

    /** The job-application flow plus this employer's custom questions (inserted before the sharing section). */
    public FlowDefinition applicationFlow(FlowDefinition base, Job job) {
        List<FlowDefinition.Step> steps = new ArrayList<>();
        List<FlowDefinition.Step> custom = customQuestions(job).stream().map(q -> new FlowDefinition.Step(q.id(), "answers", null,
                List.of(new FlowDefinition.Field(q.id(), q.type(), null, q.label(), null, null, null, "question", q.required(),
                        null, null, null, null, "textarea".equals(q.type()) ? 2000 : 300, null, null, null, null,
                        "radio".equals(q.type()) ? q.options().stream().map(o -> new FlowDefinition.Option(o, null, o)).toList() : null,
                        null, null, null, null, null)))).toList();
        boolean inserted = false;
        for (FlowDefinition.Step s : base.steps()) {
            if (!inserted && "sharing".equals(s.section())) {
                steps.addAll(custom);
                inserted = true;
            }
            steps.add(s);
        }
        if (!inserted) steps.addAll(custom);
        return base.withSteps(steps);
    }

    // ---------------------------------------------------------------- employer side

    @Transactional
    public Job upsert(Job job, JobInput in) {
        job.setTitle(in.title().strip());
        job.setSummary(in.summary().strip());
        job.setPlainSummary(in.plainSummary().strip());
        job.setDescription(in.description().strip());
        if (!OptionSources.REGIONS.contains(in.region())) throw fieldError("region", "validation.option");
        job.setRegion(in.region());
        job.setCity(in.city());
        job.setWorkMode(in.workMode());
        job.setEmploymentType(in.employmentType());
        job.setSalaryText(in.salaryText());
        job.setDeadline(in.deadline());
        job.setStatus(in.status());
        List<Map<String, Object>> questions = new ArrayList<>();
        if (in.customQuestions() != null) {
            int i = 1;
            for (var q : in.customQuestions()) {
                if ("radio".equals(q.type()) && (q.options() == null || q.options().size() < 2)) {
                    throw fieldError("customQuestions", "job.radioNeedsOptions");
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", "custom" + i++);
                m.put("label", q.label().strip());
                m.put("type", q.type());
                m.put("required", q.required());
                m.put("options", "radio".equals(q.type()) ? q.options() : List.of());
                questions.add(m);
            }
        }
        job.setCustomQuestions(questions);
        List<String> cats = in.accommodations().categories() == null ? List.of() : in.accommodations().categories();
        if (!OptionSources.ACCOMMODATIONS.containsAll(cats)) throw fieldError("accommodations.categories", "validation.option");
        job.touch();
        Job saved = jobs.save(job);
        JobAccommodation acc = accommodations.findById(saved.getId()).orElseGet(() -> new JobAccommodation(saved.getId()));
        acc.apply(in.accommodations());
        accommodations.save(acc);
        return saved;
    }

    // ---------------------------------------------------------------- helpers

    private JobSummary summary(Job j, Organization org, JobAccommodation acc, boolean isSaved) {
        return new JobSummary(j.getId(), j.getTitle(), org == null ? null : org.getName(), j.getSummary(), j.getPlainSummary(),
                j.getRegion(), j.getCity(), j.getWorkMode(), j.getEmploymentType(), j.getDeadline(), daysLeft(j),
                acc == null ? List.of() : acc.getCategories(), isSaved);
    }

    public Map<UUID, JobAccommodation> accommodationsFor(List<Job> list) {
        Map<UUID, JobAccommodation> m = new HashMap<>();
        accommodations.findByJobIdIn(list.stream().map(Job::getId).toList()).forEach(a -> m.put(a.getJobId(), a));
        return m;
    }

    private Map<UUID, Organization> organizationsFor(List<Job> list) {
        Map<UUID, Organization> m = new HashMap<>();
        organizations.findAllById(list.stream().map(Job::getOrganizationId).distinct().toList()).forEach(o -> m.put(o.getId(), o));
        return m;
    }

    private static boolean matches(Job j, Organization org, String q) {
        return contains(j.getTitle(), q) || contains(j.getSummary(), q) || contains(j.getPlainSummary(), q)
                || contains(j.getDescription(), q) || contains(j.getCity(), q) || (org != null && contains(org.getName(), q));
    }

    private static boolean contains(String s, String q) {
        return s != null && s.toLowerCase(Locale.ROOT).contains(q);
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }

    public static long daysLeft(Job j) {
        return Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), j.getDeadline()));
    }

    private static ApiException fieldError(String field, String code) {
        return ApiException.validation(List.of(new ApiException.FieldError(field, code)));
    }
}
