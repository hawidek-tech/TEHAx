package org.accessflow.common;

import java.util.List;
import org.springframework.http.HttpStatus;

/**
 * Business error returned to clients as RFC 7807 problem details.
 * {@code code} is a stable, translatable key (e.g. "auth.invalidCredentials") that the frontend maps
 * to a plain-language message in the user's language.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<FieldError> fieldErrors;

    public ApiException(HttpStatus status, String code) {
        this(status, code, List.of());
    }

    public ApiException(HttpStatus status, String code, List<FieldError> fieldErrors) {
        super(code);
        this.status = status;
        this.code = code;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "error.notFound");
    }

    public static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "error.forbidden");
    }

    public static ApiException badRequest(String code) {
        return new ApiException(HttpStatus.BAD_REQUEST, code);
    }

    public static ApiException validation(List<FieldError> errors) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "error.validation", errors);
    }

    public static ApiException conflict(String code) {
        return new ApiException(HttpStatus.CONFLICT, code);
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public List<FieldError> fieldErrors() { return fieldErrors; }

    /** A field-level validation error: {@code field} is the field id, {@code code} a translatable key. */
    public record FieldError(String field, String code) {}
}
