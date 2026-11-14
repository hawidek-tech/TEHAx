package org.accessflow.assistant;

import java.util.regex.Pattern;

/** Removes obvious personal identifiers before text could be sent to an external AI service. */
public final class PersonalDataRedactor {

    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    private static final Pattern PHONE = Pattern.compile("(\\+?251|0)[\\s-]?[79](?:[\\s-]?\\d){8}");
    private static final Pattern LONG_NUMBER = Pattern.compile("\\b[A-Za-z]{0,3}\\d[\\d\\s-]{5,}\\d\\b");

    private PersonalDataRedactor() {}

    public static String redact(String text) {
        if (text == null) return "";
        String t = EMAIL.matcher(text).replaceAll("[email removed]");
        t = PHONE.matcher(t).replaceAll("[phone removed]");
        return LONG_NUMBER.matcher(t).replaceAll("[number removed]");
    }
}
