package org.accessflow.consent;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {
    List<ConsentRecord> findByUserIdOrderByGrantedAtDesc(UUID userId);
    Optional<ConsentRecord> findByIdAndUserId(UUID id, UUID userId);
    Optional<ConsentRecord> findFirstByApplicationIdAndRevokedAtIsNull(UUID applicationId);
}
