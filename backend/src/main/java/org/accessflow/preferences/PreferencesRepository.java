package org.accessflow.preferences;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreferencesRepository extends JpaRepository<AccessibilityPreference, UUID> {}
