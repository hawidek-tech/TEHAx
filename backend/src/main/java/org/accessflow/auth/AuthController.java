package org.accessflow.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.accessflow.auth.AuthDtos.ChangePasswordRequest;
import org.accessflow.auth.AuthDtos.CsrfResponse;
import org.accessflow.auth.AuthDtos.LoginRequest;
import org.accessflow.auth.AuthDtos.MeResponse;
import org.accessflow.auth.AuthDtos.RegisterRequest;
import org.accessflow.auth.AuthDtos.SessionResponse;
import org.accessflow.common.ApiException;
import org.accessflow.common.GlobalExceptionHandler;
import org.accessflow.partner.EmbedTokenService;
import org.accessflow.partner.PartnerIntegration;
import org.accessflow.preferences.PreferencesService;
import org.accessflow.security.ClientIp;
import org.accessflow.security.CurrentUser;
import org.accessflow.security.EmbedTokenAuthenticationFilter;
import org.accessflow.security.RateLimiter;
import org.accessflow.user.User;
import org.accessflow.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication", description = "Registration, sign-in and sessions. First-party clients use a session cookie + CSRF header; "
        + "embedded components send X-AccessFlow-Embed and receive a short-lived bearer token instead (no third-party cookies).")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final UserRepository users;
    private final RateLimiter rateLimiter;
    private final EmbedTokenService embedTokens;
    private final PreferencesService preferences;

    private final int registrationsPerIpPerHour;

    public AuthController(AuthService auth, UserRepository users, RateLimiter rateLimiter,
                          EmbedTokenService embedTokens, PreferencesService preferences,
                          @org.springframework.beans.factory.annotation.Value("${accessflow.rate-limits.registrations-per-ip-per-hour:60}") int registrationsPerIpPerHour) {
        this.registrationsPerIpPerHour = registrationsPerIpPerHour;
        this.auth = auth;
        this.users = users;
        this.rateLimiter = rateLimiter;
        this.embedTokens = embedTokens;
        this.preferences = preferences;
    }

    @Operation(summary = "Get a CSRF token (also sets the XSRF-TOKEN cookie)")
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @Operation(summary = "Create an applicant account and sign in")
    @PostMapping("/register")
    public ResponseEntity<SessionResponse> register(@Valid @RequestBody RegisterRequest req,
                                                    @RequestHeader(value = EmbedTokenAuthenticationFilter.EMBED_HEADER, required = false) String embedKey,
                                                    HttpServletRequest request, HttpServletResponse response) {
        if (!rateLimiter.tryAcquire("register:" + ClientIp.of(request), registrationsPerIpPerHour, Duration.ofHours(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "error.rateLimited");
        }
        PartnerIntegration integration = embedKey == null ? null : embedTokens.requireIntegration(embedKey);
        User user = auth.register(req);
        preferences.initialiseFor(user, req.locale());
        return ResponseEntity.status(HttpStatus.CREATED).body(signIn(user, integration, request, response));
    }

    @Operation(summary = "Sign in with email or Ethiopian phone number")
    @PostMapping("/login")
    public SessionResponse login(@Valid @RequestBody LoginRequest req,
                                 @RequestHeader(value = EmbedTokenAuthenticationFilter.EMBED_HEADER, required = false) String embedKey,
                                 HttpServletRequest request, HttpServletResponse response) {
        PartnerIntegration integration = embedKey == null ? null : embedTokens.requireIntegration(embedKey);
        User user = auth.authenticate(req, request);
        return signIn(user, integration, request, response);
    }

    @Operation(summary = "Sign out (ends the session or revokes the embed token)")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            embedTokens.revoke(authorization.substring(7).trim());
        }
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Current user, or 204 when not signed in")
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        if (!CurrentUser.isAuthenticated()) return ResponseEntity.noContent().build();
        return users.findById(CurrentUser.id())
                .map(u -> ResponseEntity.ok(AuthService.toMe(u)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Change password")
    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        User user = users.findById(CurrentUser.id()).orElseThrow(ApiException::notFound);
        auth.changePassword(user, req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    private SessionResponse signIn(User user, PartnerIntegration integration, HttpServletRequest request, HttpServletResponse response) {
        if (integration != null) {
            String token = embedTokens.issue(user.getId(), integration);
            return new SessionResponse(AuthService.toMe(user), token, EmbedTokenService.TOKEN_TTL.toSeconds());
        }
        auth.startSession(user, request, response);
        return new SessionResponse(AuthService.toMe(user), null, 0);
    }

    @ExceptionHandler(AuthService.TooManyAttemptsException.class)
    public ResponseEntity<ProblemDetail> tooMany(AuthService.TooManyAttemptsException ex) {
        ProblemDetail pd = GlobalExceptionHandler.problem(HttpStatus.TOO_MANY_REQUESTS, "auth.tooManyAttempts", List.of());
        pd.setProperty("retryAfterSeconds", ex.retryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.retryAfterSeconds())).body(pd);
    }
}
