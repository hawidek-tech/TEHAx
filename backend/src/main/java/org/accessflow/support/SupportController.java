package org.accessflow.support;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

@Tag(name = "Private support", description = "Help requests without medical proof. Visible only to the requester and support staff.")
@RestController
@RequestMapping("/api/v1/support-requests")
public class SupportController {

    private final SupportService service;
    private final FlowRegistry registry;
    private final FlowValidator validator;

    public SupportController(SupportService service, FlowRegistry registry, FlowValidator validator) {
        this.service = service;
        this.registry = registry;
        this.validator = validator;
    }

    public record SupportRequestDto(UUID id, String category, String message, String preferredContact, String status,
                                    String staffResponse, Instant createdAt, Instant updatedAt) {
        public static SupportRequestDto of(SupportRequest r) {
            return new SupportRequestDto(r.getId(), r.getCategory(), r.getMessage(), r.getPreferredContact(), r.getStatus(),
                    r.getStaffResponse(), r.getCreatedAt(), r.getUpdatedAt());
        }
    }

    @Operation(summary = "My support requests")
    @GetMapping
    public List<SupportRequestDto> mine() {
        return service.mine(CurrentUser.id()).stream().map(SupportRequestDto::of).toList();
    }

    @Operation(summary = "Create a private support request (support-request flow)")
    @PostMapping
    public ResponseEntity<SupportRequestDto> create(@RequestBody Map<String, Object> input) {
        Map<String, Object> data = validator.validate(registry.resolved("support-request").orElseThrow(), input);
        return ResponseEntity.status(HttpStatus.CREATED).body(SupportRequestDto.of(service.create(CurrentUser.id(), data)));
    }
}
