package org.accessflow.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.accessflow.audit.AuditService;
import org.accessflow.auth.AuthDtos.LoginRequest;
import org.accessflow.auth.AuthDtos.MeResponse;
import org.accessflow.auth.AuthDtos.RegisterRequest;
import org.accessflow.common.ApiException;
import org.accessflow.security.AppUserPrincipal;
import org.accessflow.security.ClientIp;
import org.accessflow.security.LoginAttemptService;
import org.accessflow.user.ContactNormalizer;
import org.accessflow.user.Role;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    /** Used to equalise timing when the account does not exist (prevents account enumeration by timing). */
    private final String dummyHash;

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final LoginAttemptService attempts;
    private final SecurityContextRepository contextRepository;
    private final AuditService audit;

    public AuthService(UserRepository users, PasswordEncoder encoder, LoginAttemptService attempts,
                       SecurityContextRepository contextRepository, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.attempts = attempts;
        this.contextRepository = contextRepository;
        this.audit = audit;
        this.dummyHash = encoder.encode("timing-equaliser-not-a-real-password");
    }

    @Transactional
    public User register(RegisterRequest req) {
        List<ApiException.FieldError> errors = new ArrayList<>();
        String email = null;
        String phone = null;
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPhone = req.phone() != null && !req.phone().isBlank();
        if (!hasEmail && !hasPhone) errors.add(new ApiException.FieldError("contact", "contact.required"));
        if (hasEmail) {
            email = ContactNormalizer.email(req.email()).orElse(null);
            if (email == null) errors.add(new ApiException.FieldError("email", "email.invalid"));
        }
        if (hasPhone) {
            phone = ContactNormalizer.ethiopianPhone(req.phone()).orElse(null);
            if (phone == null) errors.add(new ApiException.FieldError("phone", "phone.invalid"));
        }
        if (!errors.isEmpty()) throw ApiException.validation(errors);

        PasswordPolicy.check(req.password(), email, phone, req.displayName());

        // Generic conflict message: does not reveal which identifier is registered beyond what the user typed.
        if ((email != null && users.findByEmailIgnoreCase(email).isPresent())
                || (phone != null && users.findByPhone(phone).isPresent())) {
            throw ApiException.conflict("auth.accountExists");
        }
        String locale = req.locale() == null ? "en" : req.locale();
        User user = users.save(new User(email, phone, encoder.encode(req.password()), req.displayName().trim(), locale,
                EnumSet.of(Role.APPLICANT)));
        audit.record(user.getId(), "USER_REGISTERED", "USER", user.getId());
        return user;
    }

    public User authenticate(LoginRequest req, HttpServletRequest http) {
        String ip = ClientIp.of(http);
        String identifier = req.identifier().trim();
        long wait = attempts.secondsUntilAllowed(identifier, ip);
        if (wait > 0) {
            throw new TooManyAttemptsException(wait);
        }
        Optional<User> user = findByIdentifier(identifier);
        boolean ok = user.isPresent() && user.get().isEnabled()
                && encoder.matches(req.password(), user.get().getPasswordHash());
        if (user.isEmpty()) encoder.matches(req.password(), dummyHash);
        if (!ok) {
            attempts.recordFailure(identifier, ip);
            audit.record(null, "LOGIN_FAILED", "USER", user.map(User::getId).orElse(null));
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.invalidCredentials");
        }
        attempts.recordSuccess(identifier);
        audit.record(user.get().getId(), "LOGIN_SUCCEEDED", "USER", user.get().getId());
        return user.get();
    }

    /** Establishes a first-party session: new session id (fixation protection), principal holds id + roles only. */
    public void startSession(User user, HttpServletRequest request, HttpServletResponse response) {
        request.getSession(true);
        request.changeSessionId();
        AppUserPrincipal principal = AppUserPrincipal.from(user).withoutCredentials();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }

    public Optional<User> findByIdentifier(String identifier) {
        if (ContactNormalizer.looksLikeEmail(identifier)) {
            return ContactNormalizer.email(identifier).flatMap(users::findByEmailIgnoreCase);
        }
        return ContactNormalizer.ethiopianPhone(identifier).flatMap(users::findByPhone);
    }

    @Transactional
    public void changePassword(User user, String current, String next) {
        if (!encoder.matches(current, user.getPasswordHash())) {
            throw ApiException.validation(List.of(new ApiException.FieldError("currentPassword", "auth.invalidCredentials")));
        }
        PasswordPolicy.check(next, user.getEmail(), user.getPhone(), user.getDisplayName());
        user.setPasswordHash(encoder.encode(next));
        users.save(user);
        audit.record(user.getId(), "PASSWORD_CHANGED", "USER", user.getId());
    }

    public static MeResponse toMe(User u) {
        return new MeResponse(u.getId(), u.getDisplayName(), u.getEmail(), u.getPhone(),
                u.getRoles().stream().map(Enum::name).collect(Collectors.toSet()), u.getPreferredLocale(), u.getOrganizationId());
    }

    /** Thrown when progressive delay is active; mapped to HTTP 429 with Retry-After. */
    public static class TooManyAttemptsException extends RuntimeException {
        private final long retryAfterSeconds;
        public TooManyAttemptsException(long retryAfterSeconds) {
            super("too many attempts");
            this.retryAfterSeconds = retryAfterSeconds;
        }
        public long retryAfterSeconds() { return retryAfterSeconds; }
    }
}
