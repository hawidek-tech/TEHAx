package org.accessflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Content-Security-Policy per response type. API responses are locked down completely; the web app
 * may only load its own resources. Embed pages get a partner-specific frame-ancestors policy
 * (see EmbedFrameAncestorsFilter); every other page refuses to be framed.
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'";
    static final String APP_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            + "img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; "
            + "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/")) {
            response.setHeader("Content-Security-Policy", API_CSP);
            response.setHeader("Cache-Control", "no-store");
        } else if (!path.startsWith("/swagger-ui") && !path.startsWith("/v3/api-docs") && !path.startsWith("/embed")) {
            response.setHeader("Content-Security-Policy", APP_CSP);
        }
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
        chain.doFilter(request, response);
    }
}
