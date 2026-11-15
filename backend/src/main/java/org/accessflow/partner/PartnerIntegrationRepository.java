package org.accessflow.partner;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerIntegrationRepository extends JpaRepository<PartnerIntegration, UUID> {
    Optional<PartnerIntegration> findByPublishableKeyAndActiveTrue(String publishableKey);

    java.util.List<PartnerIntegration> findByActiveTrue();

    /** The active integration that registered this exact origin (scheme://host[:port]), if any. */
    default Optional<PartnerIntegration> findActiveByOrigin(String origin) {
        if (origin == null || !origin.matches("^https?://[A-Za-z0-9.-]+(:\\d+)?$")) return Optional.empty();
        return findByActiveTrue().stream().filter(i -> i.allowsOrigin(origin)).findFirst();
    }
}
