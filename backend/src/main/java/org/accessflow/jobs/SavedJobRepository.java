package org.accessflow.jobs;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SavedJobRepository extends JpaRepository<SavedJob, SavedJob.Key> {
    @Query("select s.key.jobId from SavedJob s where s.key.userId = ?1 order by s.createdAt desc")
    List<UUID> jobIdsFor(UUID userId);
}
