package org.accessflow.partner;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface EmbedTokenRepository extends JpaRepository<EmbedToken, UUID> {
    Optional<EmbedToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);

    @Modifying
    @Transactional
    @Query("delete from EmbedToken t where t.tokenHash = ?1")
    void deleteByTokenHash(String tokenHash);

    @Modifying
    @Transactional
    @Query("delete from EmbedToken t where t.expiresAt < ?1")
    int deleteExpired(Instant now);
}
