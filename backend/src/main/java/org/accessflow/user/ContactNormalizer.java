package org.accessflow.user;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Normalises sign-in identifiers. Ethiopian mobile numbers are accepted in local (09…/07…) and
 * international (+2519…/+2517…) formats and stored as +251XXXXXXXXX.
 */
public final class ContactNormalizer {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]{1,64}@[^@\\s]{1,189}\\.[^@\\s]{2,}$");

    private ContactNormalizer() {}

    public static boolean looksLikeEmail(String value) {
        return value != null && value.contains("@");
    }

    public static Optional<String> email(String value) {
        if (value == null) return Optional.empty();
        String v = value.trim().toLowerCase(Locale.ROOT);
        return EMAIL.matcher(v).matches() && v.length() <= 254 ? Optional.of(v) : Optional.empty();
    }

    public static Optional<String> ethiopianPhone(String value) {
        if (value == null) return Optional.empty();
        String digits = value.replaceAll("[\\s\\-().]", "");
        if (digits.startsWith("+251")) digits = digits.substring(4);
        else if (digits.startsWith("00251")) digits = digits.substring(5);
        else if (digits.startsWith("251") && digits.length() == 12) digits = digits.substring(3);
        else if (digits.startsWith("0")) digits = digits.substring(1);
        return digits.matches("^[79]\\d{8}$") ? Optional.of("+251" + digits) : Optional.empty();
    }
}
