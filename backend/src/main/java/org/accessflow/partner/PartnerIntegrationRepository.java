package org.accessflow.partner;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerIntegrationRepository extends JpaRepository<PartnerIntegration, UUID> {
    Optional<PartnerIntegration> findByPublishableKeyAndActiveTrue(String publishableKey);
}
