package org.accessflow.applications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_status_history")
public class ApplicationStatusChange {
    @Id @GeneratedValue private UUID id;
    @Column(name = "application_id") private UUID applicationId;
    private String status;
    private String note;
    @Column(name = "changed_by") private UUID changedBy;
    @Column(name = "changed_at") private Instant changedAt = Instant.now();

    protected ApplicationStatusChange() {}

    public ApplicationStatusChange(UUID applicationId, String status, String note, UUID changedBy) {
        this.applicationId = applicationId;
        this.status = status;
        this.note = note;
        this.changedBy = changedBy;
    }

    public String getStatus() { return status; }
    public String getNote() { return note; }
    public Instant getChangedAt() { return changedAt; }
}
