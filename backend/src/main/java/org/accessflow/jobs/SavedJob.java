package org.accessflow.jobs;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saved_jobs")
public class SavedJob {
    @EmbeddedId private Key key;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected SavedJob() {}

    public SavedJob(UUID userId, UUID jobId) { this.key = new Key(userId, jobId); }

    public Key getKey() { return key; }

    @Embeddable
    public record Key(@Column(name = "user_id") UUID userId, @Column(name = "job_id") UUID jobId) implements Serializable {}
}
