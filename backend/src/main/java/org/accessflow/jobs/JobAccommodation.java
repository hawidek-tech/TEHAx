package org.accessflow.jobs;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The employer accommodation form for one job. */
@Entity
@Table(name = "job_accommodations")
public class JobAccommodation {
    @Id @Column(name = "job_id") private UUID jobId;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> categories = new ArrayList<>();
    @Column(name = "workplace_accommodations") private String workplaceAccommodations;
    @Column(name = "interview_arrangements") private String interviewArrangements;
    @Column(name = "flexible_working") private String flexibleWorking;
    @Column(name = "assistive_technology") private String assistiveTechnology;
    @Column(name = "application_accessibility") private String applicationAccessibility;
    @Column(name = "contact_name") private String contactName;
    @Column(name = "contact_email") private String contactEmail;
    @Column(name = "contact_phone") private String contactPhone;

    protected JobAccommodation() {}

    public JobAccommodation(UUID jobId) { this.jobId = jobId; }

    public UUID getJobId() { return jobId; }
    public List<String> getCategories() { return categories; }
    public String getWorkplaceAccommodations() { return workplaceAccommodations; }
    public String getInterviewArrangements() { return interviewArrangements; }
    public String getFlexibleWorking() { return flexibleWorking; }
    public String getAssistiveTechnology() { return assistiveTechnology; }
    public String getApplicationAccessibility() { return applicationAccessibility; }
    public String getContactName() { return contactName; }
    public String getContactEmail() { return contactEmail; }
    public String getContactPhone() { return contactPhone; }

    public void apply(JobDtos.AccommodationDto d) {
        categories = d.categories() == null ? new ArrayList<>() : new ArrayList<>(d.categories());
        workplaceAccommodations = d.workplaceAccommodations();
        interviewArrangements = d.interviewArrangements();
        flexibleWorking = d.flexibleWorking();
        assistiveTechnology = d.assistiveTechnology();
        applicationAccessibility = d.applicationAccessibility();
        contactName = d.contactName();
        contactEmail = d.contactEmail();
        contactPhone = d.contactPhone();
    }

    public JobDtos.AccommodationDto toDto() {
        return new JobDtos.AccommodationDto(categories, workplaceAccommodations, interviewArrangements, flexibleWorking,
                assistiveTechnology, applicationAccessibility, contactName, contactEmail, contactPhone);
    }
}
