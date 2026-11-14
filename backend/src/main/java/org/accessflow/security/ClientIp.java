package org.accessflow.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Remote address used for rate limiting. X-Forwarded-For is NOT trusted here; behind a reverse proxy,
 * configure server.forward-headers-strategy=NATIVE so the container resolves the real client address.
 */
public final class ClientIp {
    private ClientIp() {}

    public static String of(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
