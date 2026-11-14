package org.accessflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.accessflow.partner.EmbedTokenService;
import org.accessflow.user.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates requests from embedded components using an opaque bearer token held in iframe memory.
 * Invalid or expired tokens leave the request unauthenticated (it then fails with 401 where auth is required).
 */
@Component
public class EmbedTokenAuthenticationFilter extends OncePerRequestFilter {

    /** Custom header sent by embedded components. Cross-site pages cannot set it without CORS (which is not enabled). */
    public static final String EMBED_HEADER = "X-AccessFlow-Embed";

    private final EmbedTokenService tokens;
    private final UserRepository users;

    public EmbedTokenAuthenticationFilter(EmbedTokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    /**
     * CSRF is skipped for embed requests: they carry no cookies (bearer token or pre-auth) and include a custom
     * header that a cross-site attacker cannot add, which is itself a recognised CSRF defence.
     */
    public static boolean hasBearerToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        return (auth != null && auth.startsWith("Bearer ")) || request.getHeader(EMBED_HEADER) != null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = auth.substring(7).trim();
            if (!token.isEmpty() && token.length() < 200) {
                tokens.resolve(token)
                        .flatMap(t -> users.findById(t.getUserId()))
                        .filter(u -> u.isEnabled())
                        .ifPresent(u -> {
                            AppUserPrincipal p = AppUserPrincipal.from(u).withoutCredentials();
                            SecurityContextHolder.getContext().setAuthentication(
                                    new UsernamePasswordAuthenticationToken(p, null, p.getAuthorities()));
                        });
            }
        }
        chain.doFilter(request, response);
    }
}
