package org.accessflow.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    /** Either email or phone is required. Password: 8-128 characters, no composition rules (see SECURITY docs). */
    public record RegisterRequest(
            @NotBlank @Size(max = 100) String displayName,
            @Size(max = 254) String email,
            @Size(max = 20) String phone,
            @NotBlank @Size(min = 8, max = 128) String password,
            @Pattern(regexp = "en|am|om|so|ti") String locale,
            @AssertTrue boolean acceptPrivacyNotice) {}

    public record LoginRequest(@NotBlank @Size(max = 254) String identifier, @NotBlank @Size(max = 128) String password) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 128) String newPassword) {}

    public record MeResponse(UUID id, String displayName, String email, String phone, Set<String> roles,
                             String locale, UUID organizationId) {}

    /** Returned only to embedded components: a bearer token kept in iframe memory. */
    public record SessionResponse(MeResponse user, String embedToken, long embedTokenExpiresInSeconds) {}

    public record CsrfResponse(String headerName, String token) {}
}
