package org.accessflow.jobs;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobAccommodationRepository extends JpaRepository<JobAccommodation, UUID> {
    List<JobAccommodation> findByJobIdIn(Collection<UUID> jobIds);
}
