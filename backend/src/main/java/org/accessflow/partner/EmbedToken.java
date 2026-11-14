package org.accessflow.partner;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "embed_tokens")
public class EmbedToken {
    @Id @GeneratedValue private UUID id;
    @Column(name = "token_hash") private String tokenHash;
    @Column(name = "user_id") private UUID userId;
    @Column(name = "integration_id") private UUID integrationId;
    @Column(name = "expires_at") private Instant expiresAt;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected EmbedToken() {}

    public EmbedToken(String tokenHash, UUID userId, UUID integrationId, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.integrationId = integrationId;
        this.expiresAt = expiresAt;
    }

    public UUID getUserId() { return userId; }
    public UUID getIntegrationId() { return integrationId; }
    public Instant getExpiresAt() { return expiresAt; }
}
