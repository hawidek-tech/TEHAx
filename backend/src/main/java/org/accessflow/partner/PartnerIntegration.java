package org.accessflow.partner;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "partner_integrations")
public class PartnerIntegration {
    @Id private UUID id;
    @Column(name = "organization_id") private UUID organizationId;
    @Column(name = "publishable_key") private String publishableKey;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_origins") private List<String> allowedOrigins = List.of();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "enabled_components") private List<String> enabledComponents = List.of();
    private boolean active;

    protected PartnerIntegration() {}

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getPublishableKey() { return publishableKey; }
    public List<String> getAllowedOrigins() { return allowedOrigins; }
    public List<String> getEnabledComponents() { return enabledComponents; }
    public boolean isActive() { return active; }

    public boolean allowsOrigin(String origin) {
        return origin != null && allowedOrigins.stream().anyMatch(o -> o.equalsIgnoreCase(origin));
    }
}
