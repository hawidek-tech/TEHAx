package org.accessflow.auth;

import java.util.Locale;
import java.util.Set;
import org.accessflow.common.ApiException;

/**
 * NIST SP 800-63B style: length over complexity, block very common passwords, no forced composition rules
 * (composition rules make passwords harder to remember and type, especially with assistive technology).
 */
public final class PasswordPolicy {

    private static final Set<String> COMMON = Set.of(
            "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
            "11111111", "00000000", "iloveyou", "abc12345", "letmein1", "welcome1", "admin123", "ethiopia",
            "ethiopia1", "addisababa", "11223344", "87654321", "passw0rd", "football", "baseball", "sunshine1");

    private PasswordPolicy() {}

    public static void check(String password, String... personalValues) {
        String p = password.toLowerCase(Locale.ROOT);
        if (password.length() < 8) throw fieldError("password.tooShort");
        if (password.length() > 128) throw fieldError("password.tooLong");
        if (COMMON.contains(p) || p.chars().distinct().count() < 3) throw fieldError("password.tooCommon");
        for (String v : personalValues) {
            if (v != null && v.length() >= 4 && p.contains(v.toLowerCase(Locale.ROOT))) throw fieldError("password.containsPersonalInfo");
        }
    }

    private static ApiException fieldError(String code) {
        return ApiException.validation(java.util.List.of(new ApiException.FieldError("password", code)));
    }
}
