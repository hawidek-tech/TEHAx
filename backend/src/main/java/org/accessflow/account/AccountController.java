package org.accessflow.account;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.accessflow.applications.ApplicationRepository;
import org.accessflow.audit.AuditService;
import org.accessflow.auth.AuthService;
import org.accessflow.common.ApiException;
import org.accessflow.consent.ConsentRecordRepository;
import org.accessflow.files.FileController.FileDto;
import org.accessflow.files.FileService;
import org.accessflow.files.StoredFileRepository;
import org.accessflow.forms.FormDraftRepository;
import org.accessflow.identity.IdentityController.VerificationDto;
import org.accessflow.identity.IdentityVerificationRepository;
import org.accessflow.preferences.PreferencesService;
import org.accessflow.profile.ProfileController;
import org.accessflow.profile.ProfileService;
import org.accessflow.security.CurrentUser;
import org.accessflow.support.SupportController.SupportRequestDto;
import org.accessflow.support.SupportRequestRepository;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Account", description = "Data export and account deletion")
@RestController
@RequestMapping("/api/v1/account")
public class AccountController {

    private final UserRepository users;
    private final ProfileService profiles;
    private final ProfileController profileController;
    private final PreferencesService preferences;
    private final ApplicationRepository applications;
    private final ConsentRecordRepository consents;
    private final SupportRequestRepository support;
    private final IdentityVerificationRepository identity;
    private final FormDraftRepository drafts;
    private final StoredFileRepository storedFiles;
    private final FileService files;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public AccountController(UserRepository users, ProfileService profiles, ProfileController profileController,
                             PreferencesService preferences, ApplicationRepository applications, ConsentRecordRepository consents,
                             SupportRequestRepository support, IdentityVerificationRepository identity, FormDraftRepository drafts,
                             StoredFileRepository storedFiles, FileService files, PasswordEncoder encoder, AuditService audit) {
        this.users = users;
        this.profiles = profiles;
        this.profileController = profileController;
        this.preferences = preferences;
        this.applications = applications;
        this.consents = consents;
        this.support = support;
        this.identity = identity;
        this.drafts = drafts;
        this.storedFiles = storedFiles;
        this.files = files;
        this.encoder = encoder;
        this.audit = audit;
    }

    @Operation(summary = "Download all my data as JSON")
    @Transactional(readOnly = true)
    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> export() {
        UUID id = CurrentUser.id();
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exportedAt", Instant.now());
        out.put("account", AuthService.toMe(u));
        out.put("preferences", preferences.get(id));
        out.put("profile", profileController.toDto(profiles.getOrEmpty(id)));
        out.put("applications", applications.findByUserIdOrderBySubmittedAtDesc(id).stream().map(a -> Map.of(
                "referenceCode", a.getReferenceCode(), "jobId", a.getJobId(), "status", a.getStatus(),
                "answers", a.getAnswers(), "sharedProfile", a.getSharedSnapshot(), "submittedAt", a.getSubmittedAt())).toList());
        out.put("consents", consents.findByUserIdOrderByGrantedAtDesc(id).stream().map(c -> Map.of(
                "purpose", c.getPurpose(), "scopes", c.getScopes(), "grantedAt", c.getGrantedAt(),
                "revokedAt", c.getRevokedAt() == null ? "" : c.getRevokedAt().toString())).toList());
        out.put("supportRequests", support.findByUserIdOrderByCreatedAtDesc(id).stream().map(SupportRequestDto::of).toList());
        out.put("identityVerifications", identity.findByUserIdOrderByCreatedAtDesc(id).stream().map(VerificationDto::of).toList());
        out.put("drafts", drafts.findByUserIdOrderByUpdatedAtDesc(id).stream().map(d -> Map.of(
                "flow", d.getFlowKey(), "context", d.getContextKey(), "data", d.getData(), "updatedAt", d.getUpdatedAt())).toList());
        out.put("files", storedFiles.findByOwnerId(id).stream().map(FileDto::of).toList());
        audit.record(id, "DATA_EXPORTED", "USER", id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"accessflow-my-data.json\"")
                .body(out);
    }

    public record DeleteRequest(@NotBlank String password) {}

    @Operation(summary = "Permanently delete my account and all my data (password required)")
    @Transactional
    @PostMapping("/delete")
    public ResponseEntity<Void> delete(@Valid @RequestBody DeleteRequest req, HttpServletRequest http) {
        UUID id = CurrentUser.id();
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw ApiException.validation(java.util.List.of(new ApiException.FieldError("password", "auth.invalidCredentials")));
        }
        storedFiles.findByOwnerId(id).forEach(files::delete);
        users.delete(u); // ON DELETE CASCADE removes profile, drafts, applications, consents, requests, verifications
        audit.record(id, "ACCOUNT_DELETED", "USER", id);
        var session = http.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
}
