package org.accessflow.security;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.accessflow.common.GlobalExceptionHandler;
import org.accessflow.user.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.header.HeaderWriterFilter;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /** Resolves a principal by user id (the session stores ids, never emails/phones). */
    @Bean
    public UserDetailsService userDetailsService(UserRepository users) {
        return username -> {
            try {
                return users.findById(java.util.UUID.fromString(username))
                        .map(AppUserPrincipal::from)
                        .orElseThrow(() -> new UsernameNotFoundException("not found"));
            } catch (IllegalArgumentException e) {
                throw new UsernameNotFoundException("not found");
            }
        };
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(uds);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(List.of(provider));
    }

    /** The embed filter runs inside the security chain only - not as a second plain servlet filter. */
    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<EmbedTokenAuthenticationFilter> embedFilterRegistration(
            EmbedTokenAuthenticationFilter filter) {
        var reg = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(filter);
        reg.setEnabled(false);
        return reg;
    }

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<org.accessflow.partner.EmbedFrameAncestorsFilter> embedFrameFilterRegistration(
            org.accessflow.partner.EmbedFrameAncestorsFilter filter) {
        var reg = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(filter);
        reg.setEnabled(false);
        return reg;
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, ObjectMapper mapper,
                                           SecurityContextRepository contextRepository,
                                           EmbedTokenAuthenticationFilter embedTokenFilter,
                                           org.accessflow.partner.EmbedFrameAncestorsFilter embedFrameFilter) throws Exception {
        http
            .securityContext(sc -> sc.securityContextRepository(contextRepository))
            .sessionManagement(sm -> sm
                    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    .sessionFixation(f -> f.changeSessionId()))
            // Cookie-based CSRF protection for the first-party app (header X-XSRF-TOKEN).
            // Requests authenticated by an embed bearer token carry no cookies, so CSRF does not apply to them.
            .csrf(csrf -> csrf
                    .csrfTokenRepository(org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                    .ignoringRequestMatchers(EmbedTokenAuthenticationFilter::hasBearerToken))
            .headers(h -> h
                    .frameOptions(f -> f.disable()) // frame-ancestors in CSP is used instead (per-partner for /embed)
                    .contentTypeOptions(c -> {})
                    .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
            .addFilterBefore(new SecurityHeadersFilter(), HeaderWriterFilter.class)
            .addFilterAfter(embedFrameFilter, SecurityHeadersFilter.class)
            .addFilterBefore(embedTokenFilter, org.springframework.security.web.authentication.AnonymousAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                    // Public API: discovery, help, form definitions, auth entry points
                    .requestMatchers(HttpMethod.GET, "/api/v1/system/info", "/api/v1/auth/csrf", "/api/v1/auth/me").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout", "/api/v1/learners").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/jobs", "/api/v1/jobs/*", "/api/v1/jobs/*/jsonld",
                            "/api/v1/forms/*", "/api/v1/help", "/api/v1/help/*", "/api/v1/organizations/referral-partners",
                            "/api/v1/embed/config", "/api/v1/assistant/status").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/assistant/ask").permitAll()
                    // Role-restricted areas
                    .requestMatchers("/api/v1/employer/**").hasRole("EMPLOYER")
                    .requestMatchers("/api/v1/staff/**").hasRole("SUPPORT_STAFF")
                    .requestMatchers("/api/**").authenticated()
                    .requestMatchers("/actuator/health").permitAll()
                    .requestMatchers("/actuator/**").denyAll()
                    // Swagger UI, static frontend assets and SPA routes
                    .anyRequest().permitAll())
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, e) -> writeProblem(res, mapper, HttpStatus.UNAUTHORIZED, "auth.required"))
                    .accessDeniedHandler((req, res, e) -> writeProblem(res, mapper, HttpStatus.FORBIDDEN,
                            req.getAttribute("org.springframework.security.web.csrf.CsrfToken") != null
                                    && e instanceof org.springframework.security.web.csrf.CsrfException
                                    ? "auth.csrfInvalid" : "error.forbidden")))
            .formLogin(f -> f.disable())
            .httpBasic(b -> b.disable())
            .logout(l -> l.disable());
        return http.build();
    }

    private static void writeProblem(HttpServletResponse res, ObjectMapper mapper, HttpStatus status, String code)
            throws java.io.IOException {
        ProblemDetail pd = GlobalExceptionHandler.problem(status, code, List.of());
        res.setStatus(status.value());
        res.setContentType("application/problem+json");
        mapper.writeValue(res.getOutputStream(), pd);
    }
}
