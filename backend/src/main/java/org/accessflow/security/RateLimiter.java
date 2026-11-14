package org.accessflow.security;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Small in-memory fixed-window rate limiter for sensitive endpoints (registration, uploads, assistant).
 * Single-instance only; a shared store (e.g. Redis) would be needed for horizontal scaling - documented limitation.
 */
@Component
public class RateLimiter {

    private record Window(long startMillis, int count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter() {
        this(Clock.systemUTC());
    }

    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** @return true if the call is allowed; false if the limit for this key and window is exceeded. */
    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = clock.millis();
        Window updated = windows.compute(key, (k, w) ->
                (w == null || now - w.startMillis() >= window.toMillis()) ? new Window(now, 1) : new Window(w.startMillis(), w.count() + 1));
        if (windows.size() > 50_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().startMillis() > Duration.ofHours(1).toMillis());
        }
        return updated.count() <= limit;
    }
}
