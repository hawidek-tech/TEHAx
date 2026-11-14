package org.accessflow.audit;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    long countByActionAndTargetId(String action, UUID targetId);
}
