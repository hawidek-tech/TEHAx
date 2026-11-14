package org.accessflow.applications;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationStatusChangeRepository extends JpaRepository<ApplicationStatusChange, UUID> {
    List<ApplicationStatusChange> findByApplicationIdOrderByChangedAtAsc(UUID applicationId);
}
