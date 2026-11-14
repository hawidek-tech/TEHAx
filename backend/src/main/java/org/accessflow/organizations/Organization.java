package org.accessflow.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {
    @Id private UUID id;
    private String slug;
    private String name;
    private String type;
    private String description;
    private String website;
    @Column(name = "referral_enabled") private boolean referralEnabled;
    private boolean active;

    protected Organization() {}

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getDescription() { return description; }
    public String getWebsite() { return website; }
    public boolean isReferralEnabled() { return referralEnabled; }
    public boolean isActive() { return active; }
}
