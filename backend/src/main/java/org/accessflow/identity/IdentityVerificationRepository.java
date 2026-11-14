package org.accessflow.identity;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, UUID> {
    List<IdentityVerification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<IdentityVerification> findByStatusInOrderByCreatedAtAsc(List<String> statuses);
}
