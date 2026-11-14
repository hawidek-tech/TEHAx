package org.accessflow.audit;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Records security-relevant events (sign-in, access to applicant data, reviews). Never stores personal content. */
@Service
public class AuditService {

    private final AuditEventRepository repository;

    public AuditService(AuditEventRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID actorId, String action, String targetType, UUID targetId) {
        repository.save(new AuditEvent(actorId, action, targetType, targetId));
    }
}
