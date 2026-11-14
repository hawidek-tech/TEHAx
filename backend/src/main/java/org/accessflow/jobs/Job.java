package org.accessflow.jobs;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "jobs")
public class Job {
    @Id @GeneratedValue private UUID id;
    @Column(name = "organization_id") private UUID organizationId;
    private String title;
    private String summary;
    @Column(name = "plain_summary") private String plainSummary;
    private String description;
    private String region;
    private String city;
    @Column(name = "work_mode") private String workMode;
    @Column(name = "employment_type") private String employmentType;
    @Column(name = "salary_text") private String salaryText;
    private LocalDate deadline;
    private String status = "DRAFT";
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "custom_questions") private List<Map<String, Object>> customQuestions = new ArrayList<>();
    @Column(name = "created_by") private UUID createdBy;
    @Column(name = "created_at") private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected Job() {}

    public Job(UUID organizationId, UUID createdBy) {
        this.organizationId = organizationId;
        this.createdBy = createdBy;
    }

    public boolean isOpen() {
        return "PUBLISHED".equals(status) && !deadline.isBefore(LocalDate.now());
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getPlainSummary() { return plainSummary; }
    public String getDescription() { return description; }
    public String getRegion() { return region; }
    public String getCity() { return city; }
    public String getWorkMode() { return workMode; }
    public String getEmploymentType() { return employmentType; }
    public String getSalaryText() { return salaryText; }
    public LocalDate getDeadline() { return deadline; }
    public String getStatus() { return status; }
    public List<Map<String, Object>> getCustomQuestions() { return customQuestions; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setTitle(String v) { title = v; }
    public void setSummary(String v) { summary = v; }
    public void setPlainSummary(String v) { plainSummary = v; }
    public void setDescription(String v) { description = v; }
    public void setRegion(String v) { region = v; }
    public void setCity(String v) { city = v; }
    public void setWorkMode(String v) { workMode = v; }
    public void setEmploymentType(String v) { employmentType = v; }
    public void setSalaryText(String v) { salaryText = v; }
    public void setDeadline(LocalDate v) { deadline = v; }
    public void setStatus(String v) { status = v; }
    public void setCustomQuestions(List<Map<String, Object>> v) { customQuestions = v; }
    public void touch() { updatedAt = Instant.now(); }
}
