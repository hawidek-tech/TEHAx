package org.accessflow.consent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Evidence of what the user agreed to share, with whom, why, and under which notice version. */
@Entity
@Table(name = "consent_records")
public class ConsentRecord {
    public static final String NOTICE_VERSION = "2026-11";

    @Id @GeneratedValue private UUID id;
    @Column(name = "user_id") private UUID userId;
    @Column(name = "recipient_org") private UUID recipientOrg;
    @Column(name = "application_id") private UUID applicationId;
    private String purpose;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> scopes;
    @Column(name = "notice_version") private String noticeVersion = NOTICE_VERSION;
    @Column(name = "granted_at") private Instant grantedAt = Instant.now();
    @Column(name = "revoked_at") private Instant revokedAt;

    protected ConsentRecord() {}

    public ConsentRecord(UUID userId, UUID recipientOrg, UUID applicationId, String purpose, List<String> scopes) {
        this.userId = userId;
        this.recipientOrg = recipientOrg;
        this.applicationId = applicationId;
        this.purpose = purpose;
        this.scopes = scopes;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getRecipientOrg() { return recipientOrg; }
    public UUID getApplicationId() { return applicationId; }
    public String getPurpose() { return purpose; }
    public List<String> getScopes() { return scopes; }
    public String getNoticeVersion() { return noticeVersion; }
    public Instant getGrantedAt() { return grantedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void revoke() { if (revokedAt == null) revokedAt = Instant.now(); }
}
