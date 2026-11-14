package org.accessflow.partner;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Embed pages (/embed/...) may be framed ONLY by the origins registered for the partner key in the URL.
 * Unknown or inactive keys get frame-ancestors 'none', so arbitrary websites cannot embed ACCESSFLOW.
 */
@Component
public class EmbedFrameAncestorsFilter extends OncePerRequestFilter {

    private final PartnerIntegrationRepository integrations;

    public EmbedFrameAncestorsFilter(PartnerIntegrationRepository integrations) {
        this.integrations = integrations;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/embed");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String key = request.getParameter("key");
        String ancestors = key == null ? "'none'" : integrations.findByPublishableKeyAndActiveTrue(key)
                .filter(i -> !i.getAllowedOrigins().isEmpty())
                .map(i -> i.getAllowedOrigins().stream().filter(o -> o.matches("^https?://[A-Za-z0-9.-]+(:\\d+)?$"))
                        .collect(Collectors.joining(" ")))
                .filter(s -> !s.isBlank())
                .orElse("'none'");
        response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                + "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; "
                + "form-action 'self'; frame-ancestors " + ancestors);
        chain.doFilter(request, response);
    }
}
