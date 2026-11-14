package org.accessflow.notifications;

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

/** In-app notification. Text is rendered client-side from {@code type} + {@code params} in the user's language. */
@Entity
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue private UUID id;
    @Column(name = "user_id") private UUID userId;
    private String type;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> params;
    @Column(name = "read_at") private Instant readAt;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected Notification() {}

    public Notification(UUID userId, String type, Map<String, Object> params) {
        this.userId = userId;
        this.type = type;
        this.params = params;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getType() { return type; }
    public Map<String, Object> getParams() { return params; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void markRead() { if (readAt == null) readAt = Instant.now(); }
}
