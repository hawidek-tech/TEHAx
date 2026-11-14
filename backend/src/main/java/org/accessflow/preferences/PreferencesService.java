package org.accessflow.preferences;

import java.util.UUID;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PreferencesService {

    private final PreferencesRepository repository;
    private final UserRepository users;

    public PreferencesService(PreferencesRepository repository, UserRepository users) {
        this.repository = repository;
        this.users = users;
    }

    @Transactional
    public void initialiseFor(User user, String locale) {
        if (!repository.existsById(user.getId())) {
            AccessibilityPreference p = new AccessibilityPreference(user.getId());
            p.apply(PreferencesDto.defaults(locale));
            repository.save(p);
        }
    }

    @Transactional(readOnly = true)
    public PreferencesDto get(UUID userId) {
        return repository.findById(userId).map(AccessibilityPreference::toDto).orElse(PreferencesDto.defaults("en"));
    }

    @Transactional
    public PreferencesDto update(UUID userId, PreferencesDto dto) {
        AccessibilityPreference p = repository.findById(userId).orElseGet(() -> new AccessibilityPreference(userId));
        p.apply(dto);
        repository.save(p);
        users.findById(userId).ifPresent(u -> {
            u.setPreferredLocale(dto.locale());
            users.save(u);
        });
        return p.toDto();
    }
}
