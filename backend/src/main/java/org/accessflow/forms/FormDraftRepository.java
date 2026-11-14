package org.accessflow.forms;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormDraftRepository extends JpaRepository<FormDraft, UUID> {
    Optional<FormDraft> findByUserIdAndFlowKeyAndContextKey(UUID userId, String flowKey, String contextKey);
    List<FormDraft> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    void deleteByUserIdAndFlowKeyAndContextKey(UUID userId, String flowKey, String contextKey);
}
