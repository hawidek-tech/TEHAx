package org.accessflow.security;

import java.util.UUID;
import org.accessflow.common.ApiException;
import org.accessflow.user.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * The only source of "who is calling". User ids are always taken from the server-side security context,
 * never from request parameters, so changing an id in a URL cannot reach another user's records.
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static AppUserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserPrincipal p) {
            return p;
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.required");
    }

    public static UUID id() {
        return principal().id();
    }

    public static boolean hasRole(Role role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AppUserPrincipal p && p.roles().contains(role);
    }

    public static boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AppUserPrincipal;
    }
}
