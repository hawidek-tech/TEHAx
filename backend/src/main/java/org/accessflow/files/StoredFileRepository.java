package org.accessflow.files;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {
    Optional<StoredFile> findByIdAndOwnerId(UUID id, UUID ownerId);
    List<StoredFile> findByOwnerId(UUID ownerId);
}
