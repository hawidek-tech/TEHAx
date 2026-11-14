package org.accessflow.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id @GeneratedValue private UUID id;
    @Column(name = "actor_id") private UUID actorId;
    private String action;
    @Column(name = "target_type") private String targetType;
    @Column(name = "target_id") private UUID targetId;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected AuditEvent() {}

    public AuditEvent(UUID actorId, String action, String targetType, UUID targetId) {
        this.actorId = actorId;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
    }

    public UUID getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
}
