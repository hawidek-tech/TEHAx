package org.accessflow.identity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.forms.FlowRegistry;
import org.accessflow.forms.FlowValidator;
import org.accessflow.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Identity verification", description = "Alternative identification routes. Every route is reviewed by authorised staff.")
@RestController
@RequestMapping("/api/v1/identity")
public class IdentityController {

    private final IdentityService service;
    private final FlowRegistry registry;
    private final FlowValidator validator;

    public IdentityController(IdentityService service, FlowRegistry registry, FlowValidator validator) {
        this.service = service;
        this.registry = registry;
        this.validator = validator;
    }

    /** What the applicant sees about their own verification. Reviewer identity is not exposed. */
    public record VerificationDto(UUID id, String route, String documentLabel, String documentLast4, boolean documentUploaded,
                                  UUID partnerOrgId, String status, String reviewerNote, Instant createdAt, Instant reviewedAt) {
        public static VerificationDto of(IdentityVerification v) {
            return new VerificationDto(v.getId(), v.getRoute(), v.getDocumentLabel(), v.getDocumentLast4(),
                    v.getDocumentFileId() != null, v.getPartnerOrgId(), v.getStatus(), v.getReviewerNote(),
                    v.getCreatedAt(), v.getReviewedAt());
        }
    }

    @Operation(summary = "My identity verification requests")
    @GetMapping
    public List<VerificationDto> mine() {
        return service.mine(CurrentUser.id()).stream().map(VerificationDto::of).toList();
    }

    @Operation(summary = "Start a verification (same fields as the identity section of the profile flow)")
    @PostMapping
    public ResponseEntity<VerificationDto> start(@RequestBody Map<String, Object> input) {
        var def = registry.subset(registry.resolved("profile").orElseThrow(), Set.of("identity"));
        Map<String, Object> data = validator.validate(def, input);
        IdentityVerification v = service.start(CurrentUser.id(), data);
        if (v == null) throw ApiException.badRequest("identity.routeRequired");
        return ResponseEntity.status(HttpStatus.CREATED).body(VerificationDto.of(v));
    }
}
