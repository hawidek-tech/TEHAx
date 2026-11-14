package org.accessflow.security;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.accessflow.user.Role;
import org.accessflow.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Authenticated user. Only the id and roles are kept in the session; no personal data. */
public record AppUserPrincipal(UUID id, Set<Role> roles, String passwordHash, boolean enabled)
        implements UserDetails, java.io.Serializable {

    public static AppUserPrincipal from(User user) {
        return new AppUserPrincipal(user.getId(), Set.copyOf(user.getRoles()), user.getPasswordHash(), user.isEnabled());
    }

    /** Copy without the password hash, for storing in the session after authentication. */
    public AppUserPrincipal withoutCredentials() {
        return new AppUserPrincipal(id, roles, "", enabled);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.name())).collect(Collectors.toSet());
    }

    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return id.toString(); }
    @Override public boolean isEnabled() { return enabled; }
}
