package org.accessflow.support;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Private support request. Visible only to its owner and SUPPORT_STAFF. Never shared with employers. */
@Entity
@Table(name = "support_requests")
public class SupportRequest {
    @Id @GeneratedValue private UUID id;
    @Column(name = "user_id") private UUID userId;
    private String category;
    private String message;
    @Column(name = "preferred_contact") private String preferredContact;
    private String status = "OPEN";
    @Column(name = "staff_response") private String staffResponse;
    @Column(name = "handled_by") private UUID handledBy;
    @Column(name = "created_at") private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected SupportRequest() {}

    public SupportRequest(UUID userId, String category, String message, String preferredContact) {
        this.userId = userId;
        this.category = category;
        this.message = message;
        this.preferredContact = preferredContact;
    }

    public void respond(String status, String response, UUID staffId) {
        this.status = status;
        if (response != null && !response.isBlank()) this.staffResponse = response;
        this.handledBy = staffId;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getCategory() { return category; }
    public String getMessage() { return message; }
    public String getPreferredContact() { return preferredContact; }
    public String getStatus() { return status; }
    public String getStaffResponse() { return staffResponse; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
