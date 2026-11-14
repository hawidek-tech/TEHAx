package org.accessflow.support;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportRequestRepository extends JpaRepository<SupportRequest, UUID> {
    List<SupportRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<SupportRequest> findByIdAndUserId(UUID id, UUID userId);
    List<SupportRequest> findByStatusInOrderByCreatedAtAsc(List<String> statuses);
}
