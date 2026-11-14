package org.accessflow.partner;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.accessflow.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Issues opaque, short-lived bearer tokens for embedded components. Tokens live only in the iframe's memory,
 * so authentication never depends on third-party cookies. Only SHA-256 hashes are stored.
 */
@Service
public class EmbedTokenService {

    public static final Duration TOKEN_TTL = Duration.ofMinutes(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmbedTokenRepository tokens;
    private final PartnerIntegrationRepository integrations;

    public EmbedTokenService(EmbedTokenRepository tokens, PartnerIntegrationRepository integrations) {
        this.tokens = tokens;
        this.integrations = integrations;
    }

    public PartnerIntegration requireIntegration(String publishableKey) {
        return integrations.findByPublishableKeyAndActiveTrue(publishableKey)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "embed.unknownPartner"));
    }

    public String issue(UUID userId, PartnerIntegration integration) {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.save(new EmbedToken(sha256(token), userId, integration.getId(), Instant.now().plus(TOKEN_TTL)));
        return token;
    }

    public Optional<EmbedToken> resolve(String token) {
        return tokens.findByTokenHashAndExpiresAtAfter(sha256(token), Instant.now());
    }

    public void revoke(String token) {
        tokens.deleteByTokenHash(sha256(token));
    }

    @Scheduled(fixedDelay = 15 * 60 * 1000)
    public void purgeExpired() {
        tokens.deleteExpired(Instant.now());
    }

    public static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
