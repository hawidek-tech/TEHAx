package org.accessflow.forms;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.accessflow.common.ApiException;
import org.accessflow.common.ApiException.FieldError;
import org.accessflow.forms.FlowDefinition.Field;
import org.accessflow.forms.FlowDefinition.Step;
import org.accessflow.user.ContactNormalizer;
import org.springframework.stereotype.Component;

/**
 * Authoritative server-side validation of submitted flow answers against the flow definition.
 * <ul>
 *   <li>Only fields defined in the flow are kept (unknown keys are dropped).</li>
 *   <li>Answers to steps hidden by showIf conditions are dropped and not validated.</li>
 *   <li>Values are normalised (trimmed text, +251 phone numbers, lower-case email).</li>
 * </ul>
 * Error codes are i18n keys shared with the frontend validator ("validation.required", …).
 */
@Component
public class FlowValidator {

    private static final int DEFAULT_TEXT_MAX = 200;
    private static final int DEFAULT_TEXTAREA_MAX = 2000;
    private static final Set<String> TEXT_TYPES = Set.of("text", "textarea", "password");

    public Map<String, Object> validate(FlowDefinition def, Map<String, Object> input) {
        Map<String, Object> data = input == null ? Map.of() : input;
        Map<String, Object> clean = new LinkedHashMap<>();
        List<FieldError> errors = new ArrayList<>();

        for (Step step : def.steps()) {
            if (!isVisible(step, data)) continue;
            for (Field field : step.fields()) {
                validateField(field, data.get(field.id()), field.id(), clean, errors);
            }
        }
        if (def.requireOneOf() != null && !def.requireOneOf().isEmpty()
                && def.requireOneOf().stream().noneMatch(id -> isPresent(clean.get(id)))) {
            errors.add(new FieldError(def.requireOneOf().get(0), "validation.requireOneOf"));
        }
        if (!errors.isEmpty()) throw ApiException.validation(errors);
        return clean;
    }

    public static boolean isVisible(Step step, Map<String, Object> data) {
        if (step.showIf() == null) return true;
        Object value = data.get(step.showIf().field());
        return value != null && step.showIf().in().contains(String.valueOf(value));
    }

    private void validateField(Field f, Object value, String path, Map<String, Object> clean, List<FieldError> errors) {
        if (!isPresent(value)) {
            if (f.isRequired()) errors.add(new FieldError(path, "validation.required"));
            return;
        }
        try {
            Object normalised = switch (f.type()) {
                case "text", "textarea", "password" -> text(f, value);
                case "email" -> ContactNormalizer.email(str(value)).orElseThrow(() -> new Invalid("validation.email"));
                case "tel" -> ContactNormalizer.ethiopianPhone(str(value)).orElseThrow(() -> new Invalid("validation.phone"));
                case "year", "number" -> number(f, value);
                case "date" -> date(value);
                case "select", "radio" -> choice(f, value);
                case "checkboxes" -> choices(f, value);
                case "consent" -> consent(f, value);
                case "file" -> fileId(value);
                case "list" -> list(f, value, path, errors);
                default -> throw new IllegalStateException("Unsupported field type " + f.type());
            };
            if (normalised != null) clean.put(f.id(), normalised);
        } catch (Invalid e) {
            errors.add(new FieldError(path, e.getMessage()));
        }
    }

    private static String text(Field f, Object value) {
        if (!(value instanceof String s)) throw new Invalid("validation.invalid");
        String v = TEXT_TYPES.contains(f.type()) && !"password".equals(f.type()) ? s.strip() : s;
        int max = f.maxLength() != null ? f.maxLength() : ("textarea".equals(f.type()) ? DEFAULT_TEXTAREA_MAX : DEFAULT_TEXT_MAX);
        if (v.length() > max) throw new Invalid("validation.tooLong");
        if (f.minLength() != null && v.length() < f.minLength()) throw new Invalid("validation.tooShort");
        if ("last4".equals(f.validator()) && !v.matches("^[A-Za-z0-9]{4}$")) throw new Invalid("validation.last4");
        return v;
    }

    private static Integer number(Field f, Object value) {
        int n;
        try {
            n = value instanceof Number num ? num.intValue() : Integer.parseInt(str(value).strip());
        } catch (NumberFormatException e) {
            throw new Invalid("validation.number");
        }
        if (f.min() != null && n < f.min()) throw new Invalid("validation.min");
        if (f.max() != null && n > maxBound(f)) throw new Invalid("validation.max");
        return n;
    }

    /** On "year" fields, max is an offset from the current year (-14 = at least 14 years ago, 0 = this year). */
    private static int maxBound(Field f) {
        return "year".equals(f.type()) ? LocalDate.now().getYear() + f.max() : f.max();
    }

    private static String date(Object value) {
        try {
            return LocalDate.parse(str(value)).toString();
        } catch (DateTimeParseException e) {
            throw new Invalid("validation.date");
        }
    }

    private static String choice(Field f, Object value) {
        String v = str(value);
        if (f.options() == null || f.options().stream().noneMatch(o -> o.value().equals(v))) throw new Invalid("validation.option");
        return v;
    }

    private static List<String> choices(Field f, Object value) {
        if (!(value instanceof List<?> list)) throw new Invalid("validation.invalid");
        Set<String> allowed = f.options() == null ? Set.of()
                : f.options().stream().map(FlowDefinition.Option::value).collect(Collectors.toSet());
        List<String> out = list.stream().map(Objects::toString).distinct().toList();
        if (!allowed.containsAll(out)) throw new Invalid("validation.option");
        if (f.isRequired() && out.isEmpty()) throw new Invalid("validation.required");
        return out;
    }

    private static Boolean consent(Field f, Object value) {
        boolean v = Boolean.TRUE.equals(value) || "true".equals(value);
        if (f.isRequired() && !v) throw new Invalid("validation.consent");
        return v;
    }

    private static String fileId(Object value) {
        try {
            return UUID.fromString(str(value)).toString();
        } catch (IllegalArgumentException e) {
            throw new Invalid("validation.invalid");
        }
    }

    private List<Map<String, Object>> list(Field f, Object value, String path, List<FieldError> errors) {
        if (!(value instanceof List<?> items)) throw new Invalid("validation.invalid");
        int max = f.maxItems() != null ? f.maxItems() : 10;
        if (items.size() > max) throw new Invalid("validation.tooMany");
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            if (!(items.get(i) instanceof Map<?, ?> item)) throw new Invalid("validation.invalid");
            Map<String, Object> cleanItem = new LinkedHashMap<>();
            for (Field sub : f.itemFields()) {
                validateField(sub, item.get(sub.id()), path + "[" + i + "]." + sub.id(), cleanItem, errors);
            }
            out.add(cleanItem);
        }
        if (f.isRequired() && out.isEmpty()) throw new Invalid("validation.required");
        return out;
    }

    static boolean isPresent(Object v) {
        if (v == null) return false;
        if (v instanceof String s) return !s.isBlank();
        if (v instanceof List<?> l) return !l.isEmpty();
        return true;
    }

    private static String str(Object v) {
        return v instanceof String s ? s : String.valueOf(v);
    }

    private static final class Invalid extends RuntimeException {
        Invalid(String code) { super(code, null, false, false); }
    }
}
