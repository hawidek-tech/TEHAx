package org.accessflow.forms;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.accessflow.common.ApiException;
import org.accessflow.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Form engine", description = "Flow definitions and server-side drafts (save & resume)")
@RestController
@RequestMapping("/api/v1")
@Validated
public class FormsController {

    private final FlowRegistry registry;
    private final DraftService drafts;

    public FormsController(FlowRegistry registry, DraftService drafts) {
        this.registry = registry;
        this.drafts = drafts;
    }

    @Operation(summary = "Get a flow definition (registration, profile, …)")
    @GetMapping("/forms/{key}")
    public FlowDefinition definition(@PathVariable @Pattern(regexp = "[a-z-]{1,40}") String key) {
        return registry.resolved(key).orElseThrow(ApiException::notFound);
    }

    public record DraftDto(String flowKey, String context, int definitionVersion, String currentStep,
                           Map<String, Object> data, int version, Instant updatedAt) {
        static DraftDto of(FormDraft d) {
            return new DraftDto(d.getFlowKey(), d.getContextKey(), d.getDefinitionVersion(), d.getCurrentStep(),
                    d.getData(), d.getVersion(), d.getUpdatedAt());
        }
    }

    public record SaveDraftRequest(@NotNull Integer definitionVersion, Integer expectedVersion,
                                   @Size(max = 64) String currentStep, @NotNull Map<String, Object> data) {}

    @Operation(summary = "List my saved drafts")
    @GetMapping("/drafts")
    public List<DraftDto> list() {
        return drafts.list(CurrentUser.id()).stream().map(DraftDto::of).toList();
    }

    @Operation(summary = "Get my draft for a flow (context = job id for applications)")
    @GetMapping("/drafts/{flowKey}")
    public ResponseEntity<DraftDto> get(@PathVariable @Pattern(regexp = "[a-z-]{1,40}") String flowKey,
                                        @RequestParam(defaultValue = "") @Size(max = 64) String context) {
        return drafts.get(CurrentUser.id(), flowKey, context)
                .map(d -> ResponseEntity.ok(DraftDto.of(d)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Save my draft. Send expectedVersion to detect edits from another device (409 draft.conflict).")
    @PutMapping("/drafts/{flowKey}")
    public DraftDto save(@PathVariable @Pattern(regexp = "[a-z-]{1,40}") String flowKey,
                         @RequestParam(defaultValue = "") @Size(max = 64) String context,
                         @Valid @RequestBody SaveDraftRequest req) {
        if (registry.raw(flowKey).isEmpty()) throw ApiException.notFound();
        return DraftDto.of(drafts.save(CurrentUser.id(), flowKey, context, req.definitionVersion(), req.expectedVersion(),
                req.currentStep(), req.data()));
    }

    @Operation(summary = "Delete my draft")
    @DeleteMapping("/drafts/{flowKey}")
    public ResponseEntity<Void> delete(@PathVariable @Pattern(regexp = "[a-z-]{1,40}") String flowKey,
                                       @RequestParam(defaultValue = "") @Size(max = 64) String context) {
        drafts.delete(CurrentUser.id(), flowKey, context);
        return ResponseEntity.noContent().build();
    }
}
