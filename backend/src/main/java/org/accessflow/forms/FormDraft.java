package org.accessflow.forms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "form_drafts")
public class FormDraft {
    @Id @GeneratedValue private UUID id;
    @Column(name = "user_id") private UUID userId;
    @Column(name = "flow_key") private String flowKey;
    @Column(name = "context_key") private String contextKey;
    @Column(name = "definition_version") private int definitionVersion;
    @Column(name = "current_step") private String currentStep;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> data = new HashMap<>();
    /** Optimistic concurrency: the client must send the version it last saw. */
    private int version;
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    protected FormDraft() {}

    public FormDraft(UUID userId, String flowKey, String contextKey, int definitionVersion) {
        this.userId = userId;
        this.flowKey = flowKey;
        this.contextKey = contextKey;
        this.definitionVersion = definitionVersion;
    }

    public void update(String currentStep, Map<String, Object> data, int definitionVersion) {
        this.currentStep = currentStep;
        this.data = data;
        this.definitionVersion = definitionVersion;
        this.version++;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getFlowKey() { return flowKey; }
    public String getContextKey() { return contextKey; }
    public int getDefinitionVersion() { return definitionVersion; }
    public String getCurrentStep() { return currentStep; }
    public Map<String, Object> getData() { return data; }
    public int getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }
}
