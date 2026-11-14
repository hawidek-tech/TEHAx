package org.accessflow.applications;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByUserIdOrderBySubmittedAtDesc(UUID userId);
    Optional<Application> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByJobIdAndUserId(UUID jobId, UUID userId);
    List<Application> findByJobIdOrderBySubmittedAtAsc(UUID jobId);
    long countByJobId(UUID jobId);
}
