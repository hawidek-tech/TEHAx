package org.accessflow.identity;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.files.FileService;
import org.accessflow.notifications.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityService {

    private static final Set<String> DOCUMENT_ROUTES = Set.of("NATIONAL_ID", "KEBELE_ID", "PASSPORT", "REFUGEE_ID", "OTHER_DOCUMENT");
    public static final Set<String> DECISIONS = Set.of("VERIFIED", "REJECTED", "NEEDS_INFO");

    private final IdentityVerificationRepository repository;
    private final FileService files;
    private final AuditService audit;
    private final NotificationService notifications;

    public IdentityService(IdentityVerificationRepository repository, FileService files, AuditService audit,
                           NotificationService notifications) {
        this.repository = repository;
        this.files = files;
        this.audit = audit;
        this.notifications = notifications;
    }

    /** Starts a verification from validated flow data. Returns null when the user chose "LATER". */
    @Transactional
    public IdentityVerification start(UUID userId, Map<String, Object> data) {
        String route = (String) data.get("identityRoute");
        if (route == null || "LATER".equals(route)) return null;
        IdentityVerification v = new IdentityVerification(userId, route);
        if (DOCUMENT_ROUTES.contains(route)) {
            v.setDocumentLabel((String) data.get("documentLabel"));
            String last4 = (String) data.get("documentLast4");
            v.setDocumentLast4(last4 == null ? null : last4.toUpperCase());
            Object fileId = data.get("documentFile");
            if (fileId != null) {
                var file = files.requireOwned(UUID.fromString(fileId.toString()), userId);
                if (!"IDENTITY_DOCUMENT".equals(file.getPurpose())) throw ApiException.badRequest("file.invalidPurpose");
                v.setDocumentFileId(file.getId());
            }
        } else {
            v.setPartnerOrgId(UUID.fromString(data.get("referralPartner").toString()));
            v.setReferralCode((String) data.get("referralCode"));
        }
        IdentityVerification saved = repository.save(v);
        audit.record(userId, "IDENTITY_VERIFICATION_STARTED", "IDENTITY", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<IdentityVerification> mine(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public IdentityVerification decide(UUID id, String status, String note, UUID staffId) {
        if (!DECISIONS.contains(status)) throw ApiException.badRequest("identity.invalidDecision");
        IdentityVerification v = repository.findById(id).orElseThrow(ApiException::notFound);
        v.decide(status, staffId, note);
        audit.record(staffId, "IDENTITY_DECISION_" + status, "IDENTITY", id);
        notifications.notify(v.getUserId(), "IDENTITY_" + status, Map.of());
        return v;
    }
}
