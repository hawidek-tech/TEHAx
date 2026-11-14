package org.accessflow.forms;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Server-side drafts. Every query is scoped to the owner; there is no way to address another user's draft. */
@Service
public class DraftService {

    /** Drafts are partial, so they are size-limited instead of fully validated (validation happens on submit). */
    private static final int MAX_DRAFT_KEYS = 100;

    private final FormDraftRepository drafts;

    public DraftService(FormDraftRepository drafts) {
        this.drafts = drafts;
    }

    @Transactional(readOnly = true)
    public Optional<FormDraft> get(UUID userId, String flowKey, String context) {
        return drafts.findByUserIdAndFlowKeyAndContextKey(userId, flowKey, context);
    }

    @Transactional(readOnly = true)
    public List<FormDraft> list(UUID userId) {
        return drafts.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Transactional
    public FormDraft save(UUID userId, String flowKey, String context, int definitionVersion, Integer expectedVersion,
                          String currentStep, Map<String, Object> data) {
        if (data != null && data.size() > MAX_DRAFT_KEYS) throw ApiException.badRequest("draft.tooLarge");
        FormDraft draft = drafts.findByUserIdAndFlowKeyAndContextKey(userId, flowKey, context)
                .orElseGet(() -> new FormDraft(userId, flowKey, context, definitionVersion));
        if (draft.getId() != null && expectedVersion != null && expectedVersion != draft.getVersion()) {
            // Another device saved in the meantime: the client must ask the user which version to keep.
            throw ApiException.conflict("draft.conflict");
        }
        draft.update(currentStep, data == null ? Map.of() : data, definitionVersion);
        return drafts.save(draft);
    }

    @Transactional
    public void delete(UUID userId, String flowKey, String context) {
        drafts.deleteByUserIdAndFlowKeyAndContextKey(userId, flowKey, context);
    }
}
