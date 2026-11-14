package org.accessflow.demo;

import java.util.EnumSet;
import java.util.UUID;
import org.accessflow.preferences.PreferencesService;
import org.accessflow.user.Role;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates demo employer and support-staff accounts ONLY when DEMO_ACCOUNTS_PASSWORD is set.
 * No credentials are stored in source code. Never set this variable in production.
 */
@Component
public class DemoAccountSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoAccountSeeder.class);
    static final UUID DEMO_EMPLOYER_ORG = UUID.fromString("0a000000-0000-4000-8000-000000000001");

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final PreferencesService preferences;
    private final String password;

    public DemoAccountSeeder(UserRepository users, PasswordEncoder encoder, PreferencesService preferences,
                             @Value("${DEMO_ACCOUNTS_PASSWORD:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.preferences = preferences;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (password == null || password.isBlank()) return;
        create("employer@example.com", "Demo Employer", Role.EMPLOYER, DEMO_EMPLOYER_ORG);
        create("support@example.com", "Demo Support Staff", Role.SUPPORT_STAFF, null);
        log.info("Demo accounts ensured (employer@example.com, support@example.com).");
    }

    private void create(String email, String name, Role role, UUID org) {
        if (users.findByEmailIgnoreCase(email).isPresent()) return;
        User u = new User(email, null, encoder.encode(password), name, "en", EnumSet.of(role));
        u.setOrganizationId(org);
        users.save(u);
        preferences.initialiseFor(u, "en");
    }
}
