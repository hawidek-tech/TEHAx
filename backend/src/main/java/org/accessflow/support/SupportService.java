package org.accessflow.support;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.notifications.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportService {

    private static final Set<String> STATUSES = Set.of("OPEN", "IN_PROGRESS", "RESOLVED");

    private final SupportRequestRepository repository;
    private final AuditService audit;
    private final NotificationService notifications;

    public SupportService(SupportRequestRepository repository, AuditService audit, NotificationService notifications) {
        this.repository = repository;
        this.audit = audit;
        this.notifications = notifications;
    }

    /** Creates a request from validated flow data (supportCategory, supportMessage, supportContact). */
    @Transactional
    public SupportRequest create(UUID userId, Map<String, Object> data) {
        SupportRequest r = repository.save(new SupportRequest(userId, (String) data.get("supportCategory"),
                (String) data.get("supportMessage"), (String) data.get("supportContact")));
        audit.record(userId, "SUPPORT_REQUEST_CREATED", "SUPPORT_REQUEST", r.getId());
        return r;
    }

    @Transactional(readOnly = true)
    public List<SupportRequest> mine(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public SupportRequest respond(UUID id, String status, String response, UUID staffId) {
        if (!STATUSES.contains(status)) throw ApiException.badRequest("support.invalidStatus");
        SupportRequest r = repository.findById(id).orElseThrow(ApiException::notFound);
        r.respond(status, response, staffId);
        audit.record(staffId, "SUPPORT_REQUEST_" + status, "SUPPORT_REQUEST", id);
        notifications.notify(r.getUserId(), "SUPPORT_UPDATED", Map.of("status", status));
        return r;
    }
}
