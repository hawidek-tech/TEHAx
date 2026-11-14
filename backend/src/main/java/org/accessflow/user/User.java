package org.accessflow.user;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue private UUID id;
    private String email;
    private String phone;
    @Column(name = "password_hash") private String passwordHash;
    @Column(name = "display_name") private String displayName;
    @Column(name = "preferred_locale") private String preferredLocale = "en";
    @Column(name = "organization_id") private UUID organizationId;
    private boolean enabled = true;
    @Column(name = "created_at") private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt = Instant.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = EnumSet.noneOf(Role.class);

    protected User() {}

    public User(String email, String phone, String passwordHash, String displayName, String locale, Set<Role> roles) {
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.preferredLocale = locale;
        this.roles = EnumSet.copyOf(roles);
    }

    @PreUpdate
    void touch() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public String getPreferredLocale() { return preferredLocale; }
    public UUID getOrganizationId() { return organizationId; }
    public boolean isEnabled() { return enabled; }
    public Set<Role> getRoles() { return roles; }
    public Instant getCreatedAt() { return createdAt; }

    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setPreferredLocale(String preferredLocale) { this.preferredLocale = preferredLocale; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setEmail(String email) { this.email = email; }
    public void setPhone(String phone) { this.phone = phone; }
}
