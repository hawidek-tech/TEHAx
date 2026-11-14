package org.accessflow.files;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stored_files")
public class StoredFile {
    @Id @GeneratedValue private UUID id;
    @Column(name = "owner_id") private UUID ownerId;
    private String purpose;
    @Column(name = "original_name") private String originalName;
    @Column(name = "content_type") private String contentType;
    @Column(name = "size_bytes") private long sizeBytes;
    @Column(name = "storage_key") private String storageKey;
    private String sha256;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected StoredFile() {}

    public StoredFile(UUID ownerId, String purpose, String originalName, String contentType, long sizeBytes,
                      String storageKey, String sha256) {
        this.ownerId = ownerId;
        this.purpose = purpose;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.sha256 = sha256;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getPurpose() { return purpose; }
    public String getOriginalName() { return originalName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public String getStorageKey() { return storageKey; }
    public Instant getCreatedAt() { return createdAt; }
}
