package org.accessflow.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * An identity verification request. Every route - including referral and "refer me" - starts as PENDING and only
 * becomes VERIFIED through a decision by authorised support staff. No route bypasses verification.
 * Only the last 4 characters of a document number are stored (data minimisation).
 */
@Entity
@Table(name = "identity_verifications")
public class IdentityVerification {
    @Id @GeneratedValue private UUID id;
    @Column(name = "user_id") private UUID userId;
    private String route;
    @Column(name = "document_label") private String documentLabel;
    @Column(name = "document_last4") private String documentLast4;
    @Column(name = "document_file_id") private UUID documentFileId;
    @Column(name = "partner_org_id") private UUID partnerOrgId;
    @Column(name = "referral_code") private String referralCode;
    private String status = "PENDING";
    @Column(name = "reviewer_id") private UUID reviewerId;
    @Column(name = "reviewer_note") private String reviewerNote;
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected IdentityVerification() {}

    public IdentityVerification(UUID userId, String route) {
        this.userId = userId;
        this.route = route;
    }

    public void decide(String status, UUID reviewerId, String note) {
        this.status = status;
        this.reviewerId = reviewerId;
        this.reviewerNote = note;
        this.reviewedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getRoute() { return route; }
    public String getDocumentLabel() { return documentLabel; }
    public String getDocumentLast4() { return documentLast4; }
    public UUID getDocumentFileId() { return documentFileId; }
    public UUID getPartnerOrgId() { return partnerOrgId; }
    public String getReferralCode() { return referralCode; }
    public String getStatus() { return status; }
    public String getReviewerNote() { return reviewerNote; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void setDocumentLabel(String v) { documentLabel = v; }
    public void setDocumentLast4(String v) { documentLast4 = v; }
    public void setDocumentFileId(UUID v) { documentFileId = v; }
    public void setPartnerOrgId(UUID v) { partnerOrgId = v; }
    public void setReferralCode(String v) { referralCode = v; }
}
