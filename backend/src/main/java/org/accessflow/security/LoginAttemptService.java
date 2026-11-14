package org.accessflow.security;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Brute-force protection using progressive delays instead of permanent lockouts.
 * After {@value #FREE_ATTEMPTS} failures for an identifier or IP address, each further attempt must wait
 * 2^(n - FREE_ATTEMPTS) seconds, capped at 15 minutes. Successful sign-in resets the identifier counter.
 * Permanent lockouts are avoided because they disproportionately block people who type slowly or make
 * input mistakes, and let attackers lock out real users.
 * <p>The per-IP threshold is much higher than the per-account one: many Ethiopian mobile users share public IP
 * addresses through carrier-grade NAT, so a strict IP limit would block unrelated people.
 */
@Component
public class LoginAttemptService {

    static final int FREE_ATTEMPTS = 5;
    static final int IP_FREE_ATTEMPTS = 100;
    private static final long MAX_DELAY_SECONDS = 15 * 60;
    private static final long RESET_AFTER_MILLIS = 60 * 60 * 1000;

    private record Attempts(int failures, long lastFailureMillis) {}

    private final ConcurrentHashMap<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** @return seconds the caller must still wait, or 0 if an attempt is allowed now. */
    public long secondsUntilAllowed(String identifier, String ip) {
        return Math.max(wait(key("id", identifier), FREE_ATTEMPTS), wait(key("ip", ip), IP_FREE_ATTEMPTS));
    }

    public void recordFailure(String identifier, String ip) {
        long now = clock.millis();
        for (String k : new String[] {key("id", identifier), key("ip", ip)}) {
            attempts.compute(k, (kk, a) -> (a == null || now - a.lastFailureMillis() > RESET_AFTER_MILLIS)
                    ? new Attempts(1, now) : new Attempts(a.failures() + 1, now));
        }
    }

    public void recordSuccess(String identifier) {
        attempts.remove(key("id", identifier));
    }

    private long wait(String key, int freeAttempts) {
        Attempts a = attempts.get(key);
        if (a == null || a.failures() < freeAttempts) return 0;
        long now = clock.millis();
        if (now - a.lastFailureMillis() > RESET_AFTER_MILLIS) return 0;
        long delay = Math.min(MAX_DELAY_SECONDS, 1L << Math.min(20, a.failures() - freeAttempts + 1));
        long remaining = delay - (now - a.lastFailureMillis()) / 1000;
        return Math.max(0, remaining);
    }

    private static String key(String type, String value) {
        return type + ":" + (value == null ? "" : value.toLowerCase());
    }
}
