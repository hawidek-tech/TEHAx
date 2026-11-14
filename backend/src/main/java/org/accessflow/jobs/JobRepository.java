package org.accessflow.jobs;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByStatusAndDeadlineGreaterThanEqualOrderByDeadlineAsc(String status, LocalDate today);
    List<Job> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
}
