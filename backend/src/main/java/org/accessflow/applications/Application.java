package org.accessflow.applications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "applications")
public class Application {
    @Id @GeneratedValue private UUID id;
    @Column(name = "reference_code") private String referenceCode;
    @Column(name = "job_id") private UUID jobId;
    @Column(name = "user_id") private UUID userId;
    private String status = "SUBMITTED";
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> answers;
    /** Only the profile sections the applicant consented to share, frozen at submission. */
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "shared_snapshot") private Map<String, Object> sharedSnapshot;
    /** Present only if the applicant explicitly chose to share it with this employer. */
    @Column(name = "accommodation_note") private String accommodationNote;
    @Column(name = "submitted_at") private Instant submittedAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected Application() {}

    public Application(String referenceCode, UUID jobId, UUID userId, Map<String, Object> answers,
                       Map<String, Object> sharedSnapshot, String accommodationNote) {
        this.referenceCode = referenceCode;
        this.jobId = jobId;
        this.userId = userId;
        this.answers = answers;
        this.sharedSnapshot = sharedSnapshot;
        this.accommodationNote = accommodationNote;
    }

    public UUID getId() { return id; }
    public String getReferenceCode() { return referenceCode; }
    public UUID getJobId() { return jobId; }
    public UUID getUserId() { return userId; }
    public String getStatus() { return status; }
    public Map<String, Object> getAnswers() { return answers; }
    public Map<String, Object> getSharedSnapshot() { return sharedSnapshot; }
    public String getAccommodationNote() { return accommodationNote; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(String status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    /** Applied when consent is withdrawn: the employer keeps only the application answers. */
    public void clearSharedData() {
        this.sharedSnapshot = Map.of();
        this.accommodationNote = null;
        this.updatedAt = Instant.now();
    }
}
