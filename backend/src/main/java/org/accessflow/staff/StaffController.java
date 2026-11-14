package org.accessflow.staff;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.accessflow.audit.AuditService;
import org.accessflow.common.ApiException;
import org.accessflow.files.FileController;
import org.accessflow.files.FileService;
import org.accessflow.identity.IdentityController.VerificationDto;
import org.accessflow.identity.IdentityService;
import org.accessflow.identity.IdentityVerification;
import org.accessflow.identity.IdentityVerificationRepository;
import org.accessflow.security.CurrentUser;
import org.accessflow.support.SupportController.SupportRequestDto;
import org.accessflow.support.SupportRequestRepository;
import org.accessflow.support.SupportService;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Support-staff work queue. Restricted to SUPPORT_STAFF by the security configuration; every document view is audited. */
@Tag(name = "Support staff", description = "Identity verification and private support queues (SUPPORT_STAFF only)")
@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {

    private final IdentityVerificationRepository verifications;
    private final IdentityService identity;
    private final SupportRequestRepository supportRequests;
    private final SupportService support;
    private final UserRepository users;
    private final FileService files;
    private final AuditService audit;

    public StaffController(IdentityVerificationRepository verifications, IdentityService identity,
                           SupportRequestRepository supportRequests, SupportService support, UserRepository users,
                           FileService files, AuditService audit) {
        this.verifications = verifications;
        this.identity = identity;
        this.supportRequests = supportRequests;
        this.support = support;
        this.users = users;
        this.files = files;
        this.audit = audit;
    }

    /** Minimal contact details staff need to follow up. */
    public record Requester(String displayName, String email, String phone) {
        static Requester of(User u) { return new Requester(u.getDisplayName(), u.getEmail(), u.getPhone()); }
    }

    public record StaffVerification(VerificationDto verification, Requester requester, String referralCode) {}

    public record StaffSupportRequest(SupportRequestDto request, Requester requester) {}

    public record Decision(@NotBlank String status, @Size(max = 500) String note) {}

    @Operation(summary = "Identity verifications awaiting review")
    @Transactional(readOnly = true)
    @GetMapping("/verifications")
    public List<StaffVerification> verifications(@RequestParam(defaultValue = "PENDING,NEEDS_INFO") List<String> status) {
        return verifications.findByStatusInOrderByCreatedAtAsc(status).stream()
                .map(v -> new StaffVerification(VerificationDto.of(v),
                        users.findById(v.getUserId()).map(Requester::of).orElse(null), v.getReferralCode()))
                .toList();
    }

    @Operation(summary = "Record a verification decision (VERIFIED, REJECTED, NEEDS_INFO)")
    @PostMapping("/verifications/{id}/decision")
    public VerificationDto decide(@PathVariable UUID id, @Valid @RequestBody Decision decision) {
        return VerificationDto.of(identity.decide(id, decision.status(), decision.note(), CurrentUser.id()));
    }

    @Operation(summary = "View an uploaded identity document (audited)")
    @GetMapping("/verifications/{id}/document")
    public ResponseEntity<Resource> document(@PathVariable UUID id) {
        IdentityVerification v = verifications.findById(id).orElseThrow(ApiException::notFound);
        if (v.getDocumentFileId() == null) throw ApiException.notFound();
        audit.record(CurrentUser.id(), "IDENTITY_DOCUMENT_VIEWED", "IDENTITY", id);
        return FileController.asAttachment(files, files.require(v.getDocumentFileId()));
    }

    @Operation(summary = "Private support requests")
    @Transactional(readOnly = true)
    @GetMapping("/support-requests")
    public List<StaffSupportRequest> supportRequests(@RequestParam(defaultValue = "OPEN,IN_PROGRESS") List<String> status) {
        return supportRequests.findByStatusInOrderByCreatedAtAsc(status).stream()
                .map(r -> new StaffSupportRequest(SupportRequestDto.of(r),
                        users.findById(r.getUserId()).map(Requester::of).orElse(null)))
                .toList();
    }

    public record SupportResponse(@NotBlank String status, @Size(max = 2000) String response) {}

    @Operation(summary = "Update a support request and reply to the requester")
    @PostMapping("/support-requests/{id}/response")
    public SupportRequestDto respond(@PathVariable UUID id, @Valid @RequestBody SupportResponse body) {
        return SupportRequestDto.of(support.respond(id, body.status(), body.response(), CurrentUser.id()));
    }

    public record StaffStats(long pendingVerifications, long openSupportRequests, Instant asOf) {}

    @GetMapping("/stats")
    public StaffStats stats() {
        return new StaffStats(verifications.findByStatusInOrderByCreatedAtAsc(List.of("PENDING", "NEEDS_INFO")).size(),
                supportRequests.findByStatusInOrderByCreatedAtAsc(List.of("OPEN", "IN_PROGRESS")).size(), Instant.now());
    }
}
